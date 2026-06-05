import { useState } from 'react'
import {
  ChevronDown, Rocket, ClipboardList, BarChart3, Target, Award,
  Users, WifiOff, FileText, Lightbulb, BookMarked, GraduationCap, Layers,
} from 'lucide-react'
import { Card } from '../components/ui/Card'

interface SectionProps { id: string; icon: React.ReactNode; title: string; subtitle: string; open: string | null; setOpen: (id: string | null) => void; children: React.ReactNode }

function Section({ id, icon, title, subtitle, open, setOpen, children }: SectionProps) {
  const isOpen = open === id
  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen(isOpen ? null : id)} className="w-full flex items-center gap-3 p-4 text-left">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm">{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="px-4 pb-4 -mt-1 text-sm text-slate-600 leading-relaxed space-y-3">{children}</div>}
    </Card>
  )
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{children}</span>
}

export function GuidePage() {
  const [open, setOpen] = useState<string | null>('start')

  return (
    <div className="space-y-3">
      {/* Cabeçalho */}
      <div className="bg-primary rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap size={22} />
          <h1 className="text-lg font-black">Guia do Profissional</h1>
        </div>
        <p className="text-sm text-white/80">Tudo que você precisa para registrar sessões de ABA com precisão clínica. Toque em cada tópico para expandir.</p>
      </div>

      {/* Início rápido */}
      <Section id="start" icon={<Rocket size={18} />} title="Início rápido" subtitle="Sua primeira sessão em 4 passos" open={open} setOpen={setOpen}>
        <ol className="list-decimal list-inside space-y-2">
          <li><strong>Toque no botão central (+)</strong> para abrir a configuração de uma nova sessão.</li>
          <li><strong>Informe o Aluno e o Programa.</strong> Você pode usar a <strong>Biblioteca</strong> (ícone 📚) para escolher um programa pronto com critério e passos já configurados.</li>
          <li><strong>Escolha o Tipo de Coleta</strong> (DTT, Frequência, Duração, ABC, Tarefa ou Intervalo) e defina o critério de maestria.</li>
          <li><strong>Inicie a sessão</strong> e registre cada tentativa. Ao encerrar, revise o resultado e salve.</li>
        </ol>
        <div className="bg-indigo-50 rounded-xl p-3 text-xs text-indigo-800">
          💡 O paciente é criado automaticamente na primeira sessão — não precisa cadastrar antes.
        </div>
      </Section>

      {/* Tipos de coleta */}
      <Section id="coleta" icon={<Layers size={18} />} title="Tipos de coleta de dados" subtitle="Qual usar em cada situação" open={open} setOpen={setOpen}>
        <p>O sistema oferece 6 métodos de mensuração. Escolha conforme o comportamento que está medindo:</p>
        <div className="space-y-2.5">
          <div className="border border-slate-100 rounded-xl p-3">
            <p className="font-bold text-slate-800">📊 DTT (Tentativas Discretas)</p>
            <p className="text-xs mt-0.5">Ensino estruturado tentativa a tentativa. Cada oportunidade recebe uma pontuação. <strong>Use para</strong> habilidades discretas: tato, mando, identificação receptiva, imitação.</p>
          </div>
          <div className="border border-slate-100 rounded-xl p-3">
            <p className="font-bold text-slate-800"># Frequência</p>
            <p className="text-xs mt-0.5">Conta quantas vezes um comportamento ocorre. <strong>Use para</strong> comportamentos com início e fim claros: levantar da cadeira, bater, pedir ajuda. Calcula taxa por minuto.</p>
          </div>
          <div className="border border-slate-100 rounded-xl p-3">
            <p className="font-bold text-slate-800">⏱ Duração</p>
            <p className="text-xs mt-0.5">Mede quanto tempo o comportamento dura (cronômetro start/stop). <strong>Use para</strong> birra, engajamento, permanência em tarefa.</p>
          </div>
          <div className="border border-slate-100 rounded-xl p-3">
            <p className="font-bold text-slate-800">🔍 ABC (Antecedente-Comportamento-Consequência)</p>
            <p className="text-xs mt-0.5">Registro funcional de comportamentos-problema. <strong>Use para</strong> entender a função de um comportamento: o que veio antes, o comportamento e o que veio depois.</p>
          </div>
          <div className="border border-slate-100 rounded-xl p-3">
            <p className="font-bold text-slate-800">🪜 Análise de Tarefa (Encadeamento)</p>
            <p className="text-xs mt-0.5">Divide uma habilidade complexa em passos, pontuando cada passo. <strong>Use para</strong> AVDs: lavar as mãos, escovar dentes, vestir-se.</p>
          </div>
          <div className="border border-slate-100 rounded-xl p-3">
            <p className="font-bold text-slate-800">⏲️ Registro por Intervalo</p>
            <p className="text-xs mt-0.5">Divide a observação em intervalos e marca se o comportamento ocorreu. <strong>Use para</strong> comportamentos contínuos: estereotipia, on-task. Tipos: parcial, total e momentâneo.</p>
          </div>
        </div>
      </Section>

      {/* Hierarquia de dicas */}
      <Section id="dicas" icon={<ClipboardList size={18} />} title="Hierarquia de dicas (prompts)" subtitle="Como pontuar a ajuda dada" open={open} setOpen={setOpen}>
        <p>No DTT você escolhe entre duas hierarquias na configuração:</p>
        <p><strong>Simplificada</strong> — 3 níveis, ideal para o dia a dia:</p>
        <ul className="space-y-1">
          <li><Pill color="bg-emerald-100 text-emerald-700">I — Independente</Pill> respondeu sozinho · <strong>1,0 pt</strong></li>
          <li><Pill color="bg-amber-100 text-amber-700">P — Com Prompt</Pill> precisou de ajuda · <strong>0,5 pt</strong></li>
          <li><Pill color="bg-red-100 text-red-700">E — Erro</Pill> errou ou não respondeu · <strong>0,0 pt</strong></li>
        </ul>
        <p className="mt-2"><strong>Completa</strong> — 7 níveis, mede o desbotamento (fading) da dica:</p>
        <ul className="text-xs space-y-0.5">
          <li>I (Independente) 1,0 · V (Verbal) 0,83 · G (Gestual) 0,67 · M (Modelo) 0,50</li>
          <li>PP (Físico Parcial) 0,33 · FP (Físico Total) 0,17 · E (Erro) 0,0</li>
        </ul>
        <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-800">
          💡 Quanto mais "leve" a dica necessária, maior a pontuação. A meta é o aluno migrar das dicas mais intrusivas (FP) para a independência (I).
        </div>
      </Section>

      {/* Fases do programa */}
      <Section id="fases" icon={<Target size={18} />} title="Fases do programa" subtitle="Baseline, Aquisição, Manutenção, Generalização" open={open} setOpen={setOpen}>
        <p>Você define a fase ao iniciar cada sessão. Ela documenta <em>onde</em> o programa está no plano de ensino:</p>
        <ul className="space-y-2">
          <li><Pill color="bg-slate-100 text-slate-600">Baseline</Pill> Linha de base — mede o desempenho <strong>antes</strong> de ensinar, sem ajuda nem reforço.</li>
          <li><Pill color="bg-indigo-100 text-indigo-700">Aquisição</Pill> Ensino ativo da habilidade nova.</li>
          <li><Pill color="bg-emerald-100 text-emerald-700">Manutenção</Pill> Verifica se a habilidade dominada se mantém ao longo do tempo.</li>
          <li><Pill color="bg-cyan-100 text-cyan-700">Generalização</Pill> Testa a habilidade em novos contextos, materiais ou pessoas.</li>
        </ul>
        <div className="bg-indigo-50 rounded-xl p-3 text-xs text-indigo-800">
          📈 No gráfico do histórico, as mudanças de fase aparecem como <strong>linhas verticais tracejadas</strong> — facilitam interpretar a evolução.
        </div>
      </Section>

      {/* Status das tarefas — REGRA DE NEGÓCIO */}
      <Section id="status" icon={<Award size={18} />} title="Status do programa (regra de negócio)" subtitle="Como o sistema classifica cada programa" open={open} setOpen={setOpen}>
        <p>O status é <strong>calculado automaticamente</strong> a partir do desempenho real das sessões. Ele não é escolhido manualmente:</p>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Pill color="bg-emerald-100 text-emerald-700">Masterizado ✓</Pill>
            <span className="text-xs flex-1">Habilidade dominada — <strong>3 sessões consecutivas</strong> com taxa ≥ critério.</span>
          </div>
          <div className="flex items-start gap-2">
            <Pill color="bg-amber-100 text-amber-700">Próx. Maestria ⭐</Pill>
            <span className="text-xs flex-1">Quase lá — <strong>2 sessões consecutivas</strong> ≥ critério.</span>
          </div>
          <div className="flex items-start gap-2">
            <Pill color="bg-indigo-100 text-indigo-700">Em Aquisição</Pill>
            <span className="text-xs flex-1">Ensino em andamento — ainda não atingiu o critério de forma consistente. É o estado mais comum durante o aprendizado.</span>
          </div>
          <div className="flex items-start gap-2">
            <Pill color="bg-red-100 text-red-700">Regressão ⚠</Pill>
            <span className="text-xs flex-1">Precisa de atenção — última taxa &lt; 35% ou tendência de queda acentuada.</span>
          </div>
          <div className="flex items-start gap-2">
            <Pill color="bg-slate-100 text-slate-500">Sem Dados</Pill>
            <span className="text-xs flex-1">Ainda não há sessões suficientes para classificar.</span>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-800">
          ⚠️ <strong>Fase ≠ Status.</strong> A <em>fase</em> você define manualmente (onde o programa está no plano). O <em>status</em> o sistema calcula sozinho com base nos resultados.
        </div>
      </Section>

      {/* Métricas */}
      <Section id="metricas" icon={<BarChart3 size={18} />} title="Métricas explicadas" subtitle="Taxa, IDI, tendência, critério" open={open} setOpen={setOpen}>
        <ul className="space-y-2.5">
          <li><strong>Taxa de acertos (%)</strong> — soma dos pontos ÷ tentativas × 100. É o principal indicador de desempenho.</li>
          <li><strong>IDI — Índice de Independência</strong> — entre as respostas certas, quantas foram <em>sem ajuda</em>: Independentes ÷ (Independentes + Com Prompt). Dois alunos com 70% podem ter perfis opostos: um independente, outro dependente de dica. O IDI revela isso.</li>
          <li><strong>Critério de Maestria</strong> — o % alvo que define "dominado" (padrão 80%). Configurável por programa.</li>
          <li><strong>Sequência consecutiva (x/3)</strong> — quantas sessões seguidas já bateram o critério. Ao chegar em 3, vira Masterizado.</li>
          <li><strong>Tendência (↑↑ / ↑ / → / ↓ / ↓↓)</strong> — direção do aprendizado nas últimas sessões, via regressão linear. Mostra se está acelerando ou caindo.</li>
          <li><strong>Média móvel</strong> — linha suavizada no gráfico (média de 3 sessões) que filtra a variação do dia a dia.</li>
        </ul>
      </Section>

      {/* Plano de tratamento */}
      <Section id="plano" icon={<Target size={18} />} title="Plano de tratamento" subtitle="Objetivos terapêuticos por paciente" open={open} setOpen={setOpen}>
        <p>No detalhe de cada paciente (toque no card), você gerencia os <strong>objetivos do plano</strong>:</p>
        <ul className="space-y-1">
          <li>• Organize por <strong>domínio</strong> (Comunicação, Social, AVDs, Acadêmico, Comportamento…)</li>
          <li>• Defina <strong>curto ou longo prazo</strong> e uma <strong>meta de conclusão</strong></li>
          <li>• Acompanhe o <strong>status</strong>: Em andamento → Alcançado → (ou Descontinuado)</li>
        </ul>
        <p className="text-xs text-slate-400">Os objetivos aparecem também no relatório/PDF, dando contexto clínico ao progresso.</p>
      </Section>

      {/* Sondas */}
      <Section id="sondas" icon={<Award size={18} />} title="Alertas de sondas" subtitle="Manutenção e generalização automáticas" open={open} setOpen={setOpen}>
        <p>O sistema monitora os programas <strong>masterizados</strong> e avisa no painel inicial quando é hora de re-checar:</p>
        <ul className="space-y-1.5">
          <li><Pill color="bg-teal-100 text-teal-700">Manutenção devida</Pill> programa dominado sem sessão há <strong>+14 dias</strong> — vale uma sonda para confirmar que se mantém.</li>
          <li><Pill color="bg-cyan-100 text-cyan-700">Generalização sugerida</Pill> programa dominado que <strong>nunca foi testado</strong> em fase de generalização.</li>
        </ul>
        <p className="text-xs text-slate-400">Tocar no alerta leva direto para iniciar a sessão de sonda.</p>
      </Section>

      {/* Supervisão */}
      <Section id="supervisao" icon={<Users size={18} />} title="Supervisão BCBA / RBT" subtitle="Trabalho em equipe e revisão clínica" open={open} setOpen={setOpen}>
        <p>No menu do usuário → <strong>Supervisão</strong>, defina seu papel:</p>
        <ul className="space-y-1.5">
          <li><strong>Supervisor (BCBA)</strong> — revisa as sessões da equipe, marca como <Pill color="bg-emerald-100 text-emerald-700">Revisado ✓</Pill> e adiciona notas de supervisão clínica.</li>
          <li><strong>Técnico (RBT)</strong> — vincula um supervisor pelo <strong>e-mail</strong>. Suas sessões passam a aparecer para o BCBA revisar.</li>
        </ul>
        <p className="text-xs text-slate-400">No Histórico, o supervisor pode filtrar por "pendentes de revisão". Cada psicólogo só enxerga seus próprios dados (e, se for supervisor, os da sua equipe).</p>
      </Section>

      {/* Offline */}
      <Section id="offline" icon={<WifiOff size={18} />} title="Modo offline e instalação" subtitle="Use sem internet, instale como app" open={open} setOpen={setOpen}>
        <p><strong>Funciona sem internet:</strong> se você registrar uma sessão offline, ela fica salva no dispositivo com o selo <Pill color="bg-amber-100 text-amber-700">Pendente</Pill> e sincroniza sozinha assim que a conexão voltar.</p>
        <p><strong>Instalar como app:</strong> no navegador do celular, abra o menu e toque em <strong>"Adicionar à Tela de Início"</strong>. O app abre em tela cheia, como um aplicativo nativo.</p>
        <div className="bg-indigo-50 rounded-xl p-3 text-xs text-indigo-800">
          💡 Uma sessão em andamento é salva automaticamente. Se o app fechar por acidente, ao reabrir aparece a opção de <strong>continuar a sessão</strong> (válida por 2h).
        </div>
      </Section>

      {/* Relatórios */}
      <Section id="relatorios" icon={<FileText size={18} />} title="Relatórios e exportação" subtitle="PDF, CSV e JSON" open={open} setOpen={setOpen}>
        <p>Na aba <strong>Relatório</strong>, selecione um paciente para gerar um documento completo: KPIs, status por programa, gráfico de evolução, distribuição de respostas e tabela detalhada.</p>
        <ul className="space-y-1">
          <li>• <strong>PDF</strong> — imprime com cabeçalho profissional (nome, CRP, período). Ideal para famílias e convênios.</li>
          <li>• <strong>CSV</strong> — abre no Excel para análises próprias.</li>
          <li>• <strong>JSON</strong> — backup completo dos dados.</li>
        </ul>
      </Section>

      {/* Boas práticas */}
      <Section id="dicas-praticas" icon={<Lightbulb size={18} />} title="Dicas e boas práticas" subtitle="Para registros mais confiáveis" open={open} setOpen={setOpen}>
        <ul className="space-y-2">
          <li>✅ <strong>Registre durante a sessão</strong>, não depois — a memória distorce os dados.</li>
          <li>✅ <strong>Mantenha o critério consistente</strong> entre sessões do mesmo programa para o cálculo de maestria fazer sentido.</li>
          <li>✅ <strong>Use a fase Baseline</strong> antes de ensinar — sem ela não há como comprovar o ganho.</li>
          <li>✅ <strong>Anote observações</strong> ao encerrar: intercorrências, mudanças de procedimento, comportamentos relevantes.</li>
          <li>✅ <strong>Acompanhe o IDI</strong>, não só a taxa — independência é o objetivo real.</li>
          <li>✅ <strong>Responda aos alertas de sonda</strong> para evitar que habilidades dominadas regridam sem você perceber.</li>
        </ul>
      </Section>

      {/* Glossário */}
      <Section id="glossario" icon={<BookMarked size={18} />} title="Glossário ABA" subtitle="Termos técnicos usados no sistema" open={open} setOpen={setOpen}>
        <dl className="space-y-2 text-xs">
          {[
            ['ABA', 'Análise do Comportamento Aplicada — abordagem baseada em evidências para ensino e mudança de comportamento.'],
            ['DTT', 'Discrete Trial Training — ensino por tentativas discretas, estruturado.'],
            ['Mando', 'Pedido — comportamento verbal de solicitar algo.'],
            ['Tato', 'Nomear/rotular um objeto, ação ou evento.'],
            ['Ecoico', 'Repetir vocalmente um modelo (imitação verbal).'],
            ['Prompt', 'Dica ou ajuda dada para o aluno emitir a resposta correta.'],
            ['Fading', 'Desbotamento — retirada gradual das dicas até a independência.'],
            ['SD', 'Estímulo Discriminativo — a instrução/estímulo que ocasiona a resposta.'],
            ['Critério de maestria', 'Padrão de desempenho que define uma habilidade como dominada.'],
            ['Generalização', 'Aplicar a habilidade em novos contextos, materiais ou pessoas.'],
            ['Manutenção', 'Conservar a habilidade dominada ao longo do tempo.'],
            ['IDI / PDI', 'Índice de Independência — proporção de respostas sem ajuda.'],
            ['BCBA', 'Analista do Comportamento Certificado (supervisor).'],
            ['RBT', 'Técnico em Comportamento Registrado.'],
          ].map(([term, def]) => (
            <div key={term}>
              <dt className="font-bold text-slate-700 inline">{term}: </dt>
              <dd className="inline text-slate-500">{def}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <p className="text-center text-xs text-slate-300 pt-2 pb-1">Evolvy · Guia do Profissional</p>
    </div>
  )
}
