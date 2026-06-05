import { Home, Plus, BarChart2, FileText, CalendarDays } from 'lucide-react'
import { cls } from '../../lib/utils'

interface BottomNavProps { tab: string; onTab: (t: string) => void }

export function BottomNav({ tab, onTab }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 safe-bottom shadow-[0_-4px_24px_rgba(0,0,0,0.07)] no-print">
      <div className="max-w-2xl mx-auto flex items-stretch h-16">
        <button onClick={() => onTab('patients')} className={cls('flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors', tab === 'patients' ? 'text-primary' : 'text-slate-400 hover:text-slate-600')}>
          <Home size={20} strokeWidth={tab === 'patients' ? 2.5 : 1.8} />
          Início
        </button>

        <button onClick={() => onTab('history')} className={cls('flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors', tab === 'history' ? 'text-primary' : 'text-slate-400 hover:text-slate-600')}>
          <BarChart2 size={20} strokeWidth={tab === 'history' ? 2.5 : 1.8} />
          Histórico
        </button>

        {/* FAB center */}
        <div className="flex items-center justify-center px-4">
          <button
            onClick={() => onTab('session')}
            className="w-14 h-14 -mt-5 rounded-full bg-primary shadow-lg shadow-primary/40 flex items-center justify-center hover:bg-primary-600 active:scale-95 transition-all"
          >
            <Plus size={24} className="text-white" strokeWidth={2.5} />
          </button>
        </div>

        <button onClick={() => onTab('report')} className={cls('flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors', tab === 'report' ? 'text-primary' : 'text-slate-400 hover:text-slate-600')}>
          <FileText size={20} strokeWidth={tab === 'report' ? 2.5 : 1.8} />
          Relatório
        </button>

        <button onClick={() => onTab('calendar')} className={cls('flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors', tab === 'calendar' ? 'text-primary' : 'text-slate-400 hover:text-slate-600')}>
          <CalendarDays size={20} strokeWidth={tab === 'calendar' ? 2.5 : 1.8} />
          Agenda
        </button>
      </div>
    </nav>
  )
}
