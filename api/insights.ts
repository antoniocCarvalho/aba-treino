import type { VercelRequest, VercelResponse } from '@vercel/node'

// Função serverless — gera insights clínicos concisos por IA (mais leve que o relatório completo).
// Usa a mesma GEMINI_API_KEY configurada no servidor (nunca exposta ao cliente).

export const config = { maxDuration: 30 }

const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b']

const SYSTEM_PROMPT = `Você é um analista do comportamento (BCBA) experiente analisando dados de terapia ABA.

Gere de 3 a 5 insights clínicos CONCISOS e ACIONÁVEIS sobre o progresso do paciente.

REGRAS:
- Baseie-se ESTRITAMENTE nos dados. Nunca invente informações.
- Cada insight: frase direta, máximo 2 linhas.
- Classifique cada insight como: "alerta", "positivo" ou "sugestao".
  - "alerta": regressão, estagnação ou taxa cronicamente baixa que exige atenção.
  - "positivo": progresso notável, maestria atingida ou tendência de melhora consistente.
  - "sugestao": ajuste clínico recomendado (mudar hierarquia de dicas, avançar fase, adicionar generalização, etc.).
- Se os dados forem insuficientes, diga isso em um insight do tipo "sugestao".

Responda SOMENTE com um array JSON válido — sem markdown, sem texto antes ou depois:
[{"tipo": "alerta"|"positivo"|"sugestao", "mensagem": "..."}]`

interface InsightRequest {
  student: string
  programsSummary: { name: string; sessions: number; mean: number; streak: number; status: string }[]
  recentSessions: { date: string; program: string; rate: number | null; collectionType: string }[]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Servidor sem GEMINI_API_KEY configurada' })

  let body: InsightRequest
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: 'Corpo da requisição inválido' })
  }

  if (!body?.student || !Array.isArray(body.programsSummary)) {
    return res.status(400).json({ error: 'Dados insuficientes' })
  }

  const userContent = `Analise o progresso do paciente "${body.student}" e gere insights clínicos.

RESUMO POR PROGRAMA:
${JSON.stringify(body.programsSummary, null, 2)}

SESSÕES RECENTES (últimas 14):
${JSON.stringify(body.recentSessions, null, 2)}

Responda APENAS com o array JSON.`

  const requestBody = JSON.stringify({
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userContent }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
  })

  function callGemini(model: string) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody })
  }

  try {
    let sawQuota = false

    for (const model of MODELS) {
      const resp = await callGemini(model)

      if (resp.ok) {
        const data = await resp.json()
        const text = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('').trim()
        try {
          const json = text.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim()
          const insights = JSON.parse(json)
          if (Array.isArray(insights)) return res.status(200).json({ insights, model })
        } catch {
          console.warn(`Gemini ${model}: falha ao parsear JSON dos insights. Resposta:`, text.slice(0, 200))
        }
        continue
      }

      const detail = await resp.json().catch(() => ({}))
      const msg = detail?.error?.message || `erro ${resp.status}`

      if (resp.status === 429 || resp.status === 404) {
        if (resp.status === 429) sawQuota = true
        console.warn(`Gemini ${model} (${resp.status}): ${msg}`)
        continue
      }

      if (resp.status === 400 || resp.status === 403) {
        return res.status(resp.status).json({ error: `Problema com a chave do Gemini: ${msg}` })
      }

      console.warn(`Gemini ${model} erro ${resp.status}: ${msg}`)
    }

    if (sawQuota) {
      return res.status(429).json({ error: 'Cota gratuita do Gemini esgotada. Tente em alguns minutos.' })
    }
    return res.status(502).json({ error: 'Não foi possível gerar insights agora. Tente novamente.' })
  } catch (e: any) {
    console.error('Erro ao gerar insights:', e?.message || e)
    return res.status(500).json({ error: 'Falha ao gerar insights.' })
  }
}
