import type { VercelRequest, VercelResponse } from '@vercel/node'

// ─────────────────────────────────────────────────────────────────────────────
// Função serverless (Vercel) — gera relatório de progresso ABA por IA.
// Usa a API gratuita do Google Gemini. A chave GEMINI_API_KEY fica SÓ no servidor
// (variável de ambiente da Vercel), nunca é exposta ao navegador.
// Crie a chave grátis em https://aistudio.google.com/apikey
// ─────────────────────────────────────────────────────────────────────────────

export const config = { maxDuration: 60 }

// Modelo gratuito e rápido. Alternativas: 'gemini-1.5-flash', 'gemini-2.5-flash'.
const MODEL = 'gemini-2.0-flash'

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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`
  const requestBody = JSON.stringify({
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userContent }] }],
    generationConfig: { temperature: 0.6, maxOutputTokens: 3000 },
  })

  async function callGemini() {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody })
  }

  // Extrai o tempo de espera sugerido pelo Google em respostas 429 (segundos)
  function retryDelaySeconds(detail: any): number {
    try {
      const info = (detail?.error?.details ?? []).find((d: any) => String(d['@type'] || '').includes('RetryInfo'))
      const s = info?.retryDelay ? parseInt(String(info.retryDelay)) : 0
      return Math.min(Math.max(s || 0, 0), 30)
    } catch { return 0 }
  }

  try {
    let resp = await callGemini()

    // 429 = limite da cota gratuita. Espera o tempo sugerido e tenta 1 vez mais.
    if (resp.status === 429) {
      const detail = await resp.json().catch(() => ({}))
      const wait = retryDelaySeconds(detail) || 6
      await new Promise((r) => setTimeout(r, wait * 1000))
      resp = await callGemini()
      if (resp.status === 429) {
        const d2 = await resp.json().catch(() => ({}))
        const msg = d2?.error?.message || 'limite de requisições atingido'
        return res.status(429).json({
          error: `Limite gratuito da IA atingido no momento. Aguarde cerca de 1 minuto e tente novamente. (${msg})`,
        })
      }
    }

    if (!resp.ok) {
      const detail = await resp.json().catch(() => ({}))
      const msg = detail?.error?.message || `erro ${resp.status}`
      console.error('Gemini erro:', resp.status, msg)
      const friendly = resp.status === 400 || resp.status === 403
        ? `Problema com a chave do Gemini: ${msg}`
        : `Falha ao gerar o relatório: ${msg}`
      return res.status(resp.status >= 400 && resp.status < 600 ? resp.status : 500).json({ error: friendly })
    }

    const data = await resp.json()
    const candidate = data?.candidates?.[0]
    const report: string = (candidate?.content?.parts ?? [])
      .map((p: { text?: string }) => p.text ?? '')
      .join('')
      .trim()

    if (!report) {
      const reason = candidate?.finishReason || data?.promptFeedback?.blockReason || 'desconhecido'
      return res.status(502).json({ error: `A IA não retornou conteúdo (motivo: ${reason}).` })
    }

    return res.status(200).json({ report })
  } catch (e: any) {
    console.error('Erro ao gerar relatório:', e?.message || e)
    return res.status(500).json({ error: 'Falha ao gerar o relatório. Tente novamente.' })
  }
}
