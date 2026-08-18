import { useEffect, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import type { Category, Direction } from '../types'

// --- Cards -----------------------------------------------------------------

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={
        'rounded-3xl bg-white/90 dark:bg-slate-900/70 backdrop-blur border border-slate-200/70 dark:border-slate-800 shadow-card ' +
        (onClick ? 'cursor-pointer active:scale-[0.99] transition ' : '') +
        className
      }
    >
      {children}
    </div>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1 mb-2">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{children}</h2>
      {right}
    </div>
  )
}

// --- Buttons ---------------------------------------------------------------

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'soft' | 'danger'
  size?: 'sm' | 'md'
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-2xl font-semibold transition active:scale-95 disabled:opacity-40 disabled:active:scale-100'
  const sizes = { sm: 'text-[13px] px-3 py-1.5', md: 'text-[15px] px-4 py-2.5' }
  const variants = {
    primary: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm',
    soft: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100',
    ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
    danger: 'bg-red-600 text-white',
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  )
}

// --- Status pill -----------------------------------------------------------

export function StatusDot({ status }: { status: 'green' | 'amber' | 'red' }) {
  const map = { green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500' }
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${map[status]}`} />
}

export function StatusPill({ status }: { status: 'green' | 'amber' | 'red' }) {
  const map = {
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  }
  const label = { green: 'Safe to spend', amber: 'Be careful', red: 'Protect your money' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${map[status]}`}>
      <StatusDot status={status} /> {label[status]}
    </span>
  )
}

// --- Progress --------------------------------------------------------------

export function Progress({ value, tone = 'slate' }: { value: number; tone?: 'slate' | 'emerald' | 'blue' | 'amber' }) {
  const tones = { slate: 'bg-slate-900 dark:bg-white', emerald: 'bg-emerald-500', blue: 'bg-blue-500', amber: 'bg-amber-500' }
  return (
    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
      <div className={`h-full rounded-full ${tones[tone]}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

// --- Form fields -----------------------------------------------------------

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="text-[13px] font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</div>
      {children}
      {hint && <div className="text-[12px] text-slate-400 mt-1">{hint}</div>}
    </label>
  )
}

const inputCls =
  'w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/40 px-3.5 py-2.5 text-[15px] text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 placeholder:text-slate-400'

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />
}

export function PesoInput({ value, onChange, placeholder }: { value: number; onChange: (n: number) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">₱</span>
      <input
        inputMode="decimal"
        value={Number.isFinite(value) && value !== 0 ? value : value === 0 ? '' : ''}
        placeholder={placeholder ?? '0'}
        onChange={(e) => onChange(parseFloat(e.target.value.replace(/[^\d.]/g, '')) || 0)}
        className={`${inputCls} pl-7`}
      />
    </div>
  )
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} min-h-[110px] leading-snug ${props.className ?? ''}`} />
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className={inputCls}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`h-7 w-12 rounded-full transition relative ${on ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
      aria-pressed={on}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="flex gap-1 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-xl px-2 py-1.5 text-[13px] font-semibold transition ${
            value === o.value ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// --- Modal / Sheet ---------------------------------------------------------

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="absolute inset-0 z-40 flex items-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-sheet relative z-10 max-h-[88%] w-full overflow-y-auto no-scrollbar rounded-t-3xl bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 pb-8">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur px-4 py-3 border-b border-slate-200/60 dark:border-slate-800">
          <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700 absolute left-1/2 -translate-x-1/2 -top-2" />
          <h3 className="text-[17px] font-bold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-[15px] font-semibold text-blue-600 dark:text-blue-400">
            Done
          </button>
        </div>
        <div className="px-4 pt-4">{children}</div>
      </div>
    </div>
  )
}

// --- Category / direction chrome ------------------------------------------

export const CATEGORY_META: Record<Category, { label: string; emoji: string }> = {
  salary: { label: 'Salary/income', emoji: '💰' },
  food: { label: 'Food', emoji: '🍽️' },
  shopping: { label: 'Shopping', emoji: '🛍️' },
  transport: { label: 'Transportation', emoji: '🚗' },
  bills: { label: 'Bills', emoji: '🧾' },
  subscriptions: { label: 'Subscriptions', emoji: '🔁' },
  cash: { label: 'Cash withdrawal', emoji: '🏧' },
  fee: { label: 'Bank fee', emoji: '🏦' },
  transfer: { label: 'Transfer', emoji: '↔️' },
  savings: { label: 'Savings', emoji: '🐷' },
  other: { label: 'Other', emoji: '•' },
}

export function CategoryIcon({ category }: { category: Category }) {
  return (
    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-lg">
      {CATEGORY_META[category].emoji}
    </span>
  )
}

export function AccountBadge({ id }: { id: 'bpi' | 'gcash' }) {
  const isBpi = id === 'bpi'
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${
        isBpi ? 'bg-bpi/10 text-bpi' : 'bg-gcash/10 text-gcash'
      }`}
    >
      {isBpi ? 'BPI' : 'GCASH'}
    </span>
  )
}

export function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const tone = value >= 0.75 ? 'text-emerald-600' : value >= 0.5 ? 'text-amber-600' : 'text-red-600'
  return <span className={`text-[11px] font-semibold ${tone}`}>{pct}% sure</span>
}

export function DirectionAmount({ direction, amount, hide }: { direction: Direction; amount: number; hide?: boolean }) {
  const isIn = direction === 'in'
  const cls = isIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
  const sign = isIn ? '+' : '−'
  const val = hide ? '••••' : amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (
    <span className={`font-bold tabular-nums ${cls}`}>
      {sign}₱{val}
    </span>
  )
}
