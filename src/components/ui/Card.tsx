import { cls } from '../../lib/utils'

interface CardProps { children: React.ReactNode; className?: string; onClick?: () => void }
export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cls('bg-white rounded-2xl shadow-card border border-slate-100', onClick && 'cursor-pointer active:bg-slate-50', className)}
    >
      {children}
    </div>
  )
}
