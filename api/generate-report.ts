import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

// ─────────────────────────────────────────────────────────────────────────────
// Função serverless (Vercel) — gera relatório de progresso ABA por IA.
// A chave ANTHROPIC_API_KEY fica SÓ no servidor (variável de ambiente da Vercel),
// nunca é exposta ao navegador. O frontend chama POST /api/generate-report.
// ─────────────────────────────────────────────────────────────────────────────

// Permite até 60s de execução (geração pode levar alguns segundos).
export const config = { maxDuration: 60 }

const MODEL = 'claude-opus-4-8' // troque por 'claude-sonnet-4-6' para reduzir custo

// Persona + instruções fixas → bom candidato a prompt caching (prefixo estável).
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

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Servidor sem ANTHROPIC_API_KEY configurada' })
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

  // Limita o volume para conter custo/latência (últimas 60 sessões)
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

  try {
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      // Persona estável marcada para cache (prefixo reaproveitável entre chamadas).
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userContent }],
    })

    const report = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('\n')
      .trim()

    return res.status(200).json({ report, usage: response.usage })
  } catch (e: any) {
    console.error('Erro ao gerar relatório:', e?.message || e)
    const status = e?.status && e.status >= 400 && e.status < 600 ? e.status : 500
    return res.status(status).json({ error: 'Falha ao gerar o relatório. Tente novamente.' })
  }
}
