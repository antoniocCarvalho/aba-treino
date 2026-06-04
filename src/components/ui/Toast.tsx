import { useAppStore } from '../../stores/appStore'
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'

export function Toast() {
  const toast = useAppStore((s) => s.toast)
  if (!toast.show) return null
  const configs = {
    success: { bg: 'bg-emerald-600', Icon: CheckCircle },
    warning: { bg: 'bg-amber-500',   Icon: AlertTriangle },
    error:   { bg: 'bg-red-600',     Icon: XCircle },
    info:    { bg: 'bg-slate-700',   Icon: Info },
  }
  const { bg, Icon } = configs[toast.type]
  return (
    <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 ${bg} text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-modal flex items-center gap-2 no-print whitespace-nowrap`}>
      <Icon size={14} />
      {toast.msg}
    </div>
  )
}
