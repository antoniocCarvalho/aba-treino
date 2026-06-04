import type { CollectionType, GoalDomain } from '../types'

export interface ProgramTemplate {
  name: string
  domain: GoalDomain
  collectionType: CollectionType
  criterion: number
  taSteps?: string[]
  note?: string
}

// Biblioteca de programas ABA comuns, agrupados por domínio.
// Servem como ponto de partida — o terapeuta pode ajustar tudo após selecionar.
export const PROGRAM_LIBRARY: ProgramTemplate[] = [
  // ── Comunicação / Mando ──
  { name: 'Mando de itens preferidos', domain: 'comunicacao', collectionType: 'dtt', criterion: 80 },
  { name: 'Mando com troca de figuras (PECS)', domain: 'comunicacao', collectionType: 'dtt', criterion: 80 },
  { name: 'Responder ao próprio nome', domain: 'comunicacao', collectionType: 'dtt', criterion: 90 },
  { name: 'Contato visual ao chamado', domain: 'comunicacao', collectionType: 'dtt', criterion: 80 },

  // ── Linguagem / Tato / Ecoico ──
  { name: 'Tato de objetos comuns', domain: 'linguagem', collectionType: 'dtt', criterion: 80 },
  { name: 'Tato de ações', domain: 'linguagem', collectionType: 'dtt', criterion: 80 },
  { name: 'Ecoico de palavras', domain: 'linguagem', collectionType: 'dtt', criterion: 80 },
  { name: 'Intraverbal — preencher lacunas', domain: 'linguagem', collectionType: 'dtt', criterion: 80 },
  { name: 'Identificação receptiva de figuras', domain: 'linguagem', collectionType: 'dtt', criterion: 80 },

  // ── Imitação / Motor ──
  { name: 'Imitação motora grossa', domain: 'motor', collectionType: 'dtt', criterion: 80 },
  { name: 'Imitação motora fina', domain: 'motor', collectionType: 'dtt', criterion: 80 },
  { name: 'Imitação com objetos', domain: 'motor', collectionType: 'dtt', criterion: 80 },

  // ── Habilidades Sociais / Brincar ──
  { name: 'Esperar a vez (jogo de turnos)', domain: 'social', collectionType: 'dtt', criterion: 80 },
  { name: 'Cumprimentar pares', domain: 'social', collectionType: 'dtt', criterion: 80 },
  { name: 'Brincar funcional com brinquedo', domain: 'brincar', collectionType: 'dtt', criterion: 80 },

  // ── Acadêmico ──
  { name: 'Identificação de cores', domain: 'academico', collectionType: 'dtt', criterion: 80 },
  { name: 'Identificação de números', domain: 'academico', collectionType: 'dtt', criterion: 80 },
  { name: 'Identificação de letras', domain: 'academico', collectionType: 'dtt', criterion: 80 },

  // ── AVDs (Análise de Tarefa) ──
  {
    name: 'Lavar as mãos', domain: 'avd', collectionType: 'task_analysis', criterion: 80,
    taSteps: ['Abrir a torneira', 'Molhar as mãos', 'Pegar o sabonete', 'Esfregar as mãos', 'Enxaguar', 'Fechar a torneira', 'Secar as mãos'],
  },
  {
    name: 'Escovar os dentes', domain: 'avd', collectionType: 'task_analysis', criterion: 80,
    taSteps: ['Pegar a escova', 'Colocar pasta', 'Molhar a escova', 'Escovar dentes de cima', 'Escovar dentes de baixo', 'Cuspir', 'Enxaguar a boca', 'Guardar a escova'],
  },
  {
    name: 'Vestir camiseta', domain: 'avd', collectionType: 'task_analysis', criterion: 80,
    taSteps: ['Segurar a camiseta pela barra', 'Passar a cabeça', 'Passar o braço direito', 'Passar o braço esquerdo', 'Ajustar a barra'],
  },
  {
    name: 'Calçar sapatos', domain: 'avd', collectionType: 'task_analysis', criterion: 80,
    taSteps: ['Pegar o sapato certo', 'Afrouxar o cadarço', 'Colocar o pé', 'Ajustar o calcanhar', 'Amarrar o cadarço'],
  },

  // ── Comportamento (Intervalo) ──
  { name: 'Comportamento on-task (engajamento)', domain: 'comportamento', collectionType: 'interval', criterion: 80, note: 'Registro por intervalo parcial' },
  { name: 'Estereotipia', domain: 'comportamento', collectionType: 'interval', criterion: 20, note: 'Meta: reduzir ocorrência' },
  { name: 'Permanecer sentado', domain: 'comportamento', collectionType: 'duration', criterion: 80 },
]
