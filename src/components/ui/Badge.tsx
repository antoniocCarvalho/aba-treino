import { cls } from '../../lib/utils'
import type { ProgramStatus } from '../../types'
import { statusColor, STATUS_LABEL } from '../../lib/aba'

interface StatusBadgeProps { status: ProgramStatus; className?: string }
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return <span className={cls('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', statusColor(status), className)}>{STATUS_LABEL[status]}</span>
}

interface BadgeProps { children: React.ReactNode; color?: 'indigo' | 'green' | 'amber' | 'red' | 'gray'; className?: string }
export function Badge({ children, color = 'indigo', className }: BadgeProps) {
  const colors = { indigo: 'bg-indigo-100 text-indigo-700', green: 'bg-green-100 text-green-800', amber: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-800', gray: 'bg-gray-100 text-gray-600' }
  return <span className={cls('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', colors[color], className)}>{children}</span>
}
