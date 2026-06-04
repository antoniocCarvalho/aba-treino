import { cls } from '../../lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string }
export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>}
      <input className={cls('w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all', error && 'border-red-400', className)} {...props} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string }
export function Select({ label, className, children, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>}
      <select className={cls('w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white', className)} {...props}>{children}</select>
    </div>
  )
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string }
export function TextArea({ label, className, ...props }: TextAreaProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>}
      <textarea className={cls('w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none', className)} {...props} />
    </div>
  )
}
