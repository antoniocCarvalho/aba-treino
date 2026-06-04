import type { VercelRequest, VercelResponse } from '@vercel/node'

// ─────────────────────────────────────────────────────────────────────────────
// Função serverless (Vercel) — gera relatório de progresso ABA por IA.
// Usa a API gratuita do Google Gemini. A chave GEMINI_API_KEY fica SÓ no servidor
// (variável de ambiente da Vercel), nunca é exposta ao navegador.
// Crie a chave grátis em https://aistudio.google.com/apikey
// ─────────────────────────────────────────────────────────────────────────────

export const config = { maxDuration: 60 }

// Tenta nesta ordem até achar um modelo com cota gratuita disponível na conta.
// (a disponibilidade do tier gratuito varia por região/conta — limit:0 = indisponível)
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b']

const SYSTEM_PROMPT = `Você é um analista do comportamento (BCBA) experiente, redigindo relatórios de progresso clínico em Terapia ABA (Análise do Comportamento Aplicada) em português do Brasil.

Sua tarefa é transformar os dados quantitativos de sessões em um relatório profissional, claro e útil — adequado para famílias, equipe clínica e convênios.

DIRETRIZES:
- Baseie-se ESTRITAMENTE nos dados fornecidos. Nunca invente números, datas, comportamentos ou observações que não estejam nos dados.
- Use linguagem técnica precisa, mas acessível a leigos quando necessário (explique siglas como IDI = Índice de Independência).
- Seja objetivo e respeitoso; evite jargão excessivo e evite afirmações categóricas não suportadas pelos dados.
- Quando os dados forem insuficientes para uma conclusão, diga isso explicitamente.
- Interprete a evolução: tendência de melhora, estabilidade, regressão; proximidade do critério de maestria (3 sessões consecutivas ≥ critério).

ESTRUTURA DO RELATÓRIO (use estes títulos em markdown):
## Identificação
## Resumo do Período
## Análise por Programa
## Evolução e Tendências
## Considerações Clínicas
## Recomendações

Responda APENAS com o relatório final em markdown, sem comentários sobre o seu processo de raciocínio e sem texto antes ou depois do relatório.`

interface SessionSummary {
  date: string
  program: string
  phase: string
  collectionType: string
  trials: number
  rate: number | null
  pdi: number | null
  criterion: number
  notes?: string
}

interface ReportRequest {
  student: string
  period?: { from: string; to: string }
  professional?: { name?: string; crp?: string }
  programsSummary?: { name: string; sessions: number; mean: number; streak: number; status: string }[]
  sessions: SessionSummary[]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Servidor sem GEMINI_API_KEY configurada' })
  }

  let body: ReportRequest
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: 'Corpo da requisição inválido' })
  }

  if (!body?.student || !Array.isArray(body.sessions) || body.sessions.length === 0) {
    return res.status(400).json({ error: 'Dados insuficientes: informe aluno e ao menos uma sessão' })
  }

  // Limita o volume para conter latência (últimas 60 sessões)
  const sessions = body.sessions.slice(-60)

  const userContent = `Gere o relatório de progresso para o paciente abaixo, em português do Brasil.

DADOS DO PACIENTE E PERÍODO (JSON):
${JSON.stringify(
    {
      paciente: body.student,
      periodo: body.period,
      profissional: body.professional,
      resumoPorPrograma: body.programsSummary,
      sessoes: sessions,
    },
    null,
    2,
  )}

Notas sobre os campos: "rate" = taxa de acertos (%); "pdi" = Índice de Independência (%); "phase" = fase do programa (baseline/acquisition/maintenance/generalization); "collectionType" = tipo de coleta; "criterion" = critério de maestria (%); "status" = classificação automática do programa.`

  const requestBody = JSON.stringify({
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userContent }] }],
    generationConfig: { temperature: 0.6, maxOutputTokens: 3000 },
  })

  function callGemini(model: string) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody })
  }

  function extractReport(data: any): string {
    const candidate = data?.candidates?.[0]
    return (candidate?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('').trim()
  }

  try {
    let lastError = ''
    let sawQuota = false

    // Percorre os modelos; pula os que não têm cota gratuita (429) ou não existem (404).
    for (const model of MODELS) {
      const resp = await callGemini(model)

      if (resp.ok) {
        const data = await resp.json()
        const report = extractReport(data)
        if (report) return res.status(200).json({ report, model })
        const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason || 'desconhecido'
        lastError = `A IA não retornou conteúdo (motivo: ${reason}).`
        continue
      }

      const detail = await resp.json().catch(() => ({}))
      const msg = detail?.error?.message || `erro ${resp.status}`
      lastError = msg

      // 429 (quota) ou 404 (modelo indisponível) → tenta o próximo modelo
      if (resp.status === 429 || resp.status === 404) {
        if (resp.status === 429) sawQuota = true
        console.warn(`Gemini ${model} indisponível (${resp.status}): ${msg}`)
        continue
      }

      // 400/403 = problema de chave/requisição → não adianta tentar outros modelos
      if (resp.status === 400 || resp.status === 403) {
        return res.status(resp.status).json({ error: `Problema com a chave do Gemini: ${msg}` })
      }

      // Outros erros: tenta o próximo modelo mesmo assim
      console.warn(`Gemini ${model} erro ${resp.status}: ${msg}`)
    }

    // Nenhum modelo funcionou
    if (sawQuota) {
      return res.status(429).json({
        error: 'Nenhum modelo gratuito do Gemini está disponível na sua conta no momento (cota = 0). Tente novamente em alguns minutos ou ative o faturamento gratuito no Google AI Studio.',
      })
    }
    return res.status(502).json({ error: `Falha ao gerar o relatório: ${lastError || 'erro desconhecido'}` })
  } catch (e: any) {
    console.error('Erro ao gerar relatório:', e?.message || e)
    return res.status(500).json({ error: 'Falha ao gerar o relatório. Tente novamente.' })
  }
}
