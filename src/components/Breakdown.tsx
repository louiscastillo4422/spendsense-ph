import type { LineItem } from '../lib/calc'
import { peso } from '../lib/format'

/** Renders a transparent list of numbers with an optional total row. */
export function Breakdown({ items, total, totalLabel }: { items: LineItem[]; total?: number; totalLabel?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
      {items.map((it, i) => (
        <div key={i} className="flex items-center justify-between px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="text-[14px] text-slate-700 dark:text-slate-200 truncate">{it.label}</p>
            {it.note && <p className="text-[12px] text-slate-400">{it.note}</p>}
          </div>
          <span
            className={`text-[14px] font-semibold tabular-nums ${
              it.amount < 0 ? 'text-red-500' : it.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
            }`}
          >
            {peso(it.amount, { sign: true })}
          </span>
        </div>
      ))}
      {total !== undefined && (
        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 px-3.5 py-3">
          <span className="text-[14px] font-bold text-slate-900 dark:text-white">{totalLabel ?? 'Total'}</span>
          <span className="text-[15px] font-extrabold tabular-nums text-slate-900 dark:text-white">{peso(total)}</span>
        </div>
      )}
    </div>
  )
}
