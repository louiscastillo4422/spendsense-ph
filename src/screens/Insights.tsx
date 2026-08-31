import { useMemo, useState, type CSSProperties } from 'react'
import { useApp } from '../state/store'
import { ScreenShell, PageHeader } from '../components/Screen'
import { Card, SectionTitle, Segmented, CATEGORY_META } from '../components/ui'
import { spendingByCategory, type SpendWindow, type CategorySpend } from '../lib/calc'
import { peso } from '../lib/format'

/** CSS vars for a category's light/dark fill, consumed by bg-[color:var(--cl)]. */
function catVars(category: CategorySpend['category']): CSSProperties {
  const c = CATEGORY_META[category].color
  return { ['--cl' as string]: c.light, ['--cd' as string]: c.dark }
}

export function Insights() {
  const { state } = useApp()
  const [window, setWindow] = useState<SpendWindow>('month')
  const hide = state.settings.notificationPrivacy === 'hideBalances'

  const { items, total } = useMemo(() => spendingByCategory(state, window), [state, window])
  const top = items[0]
  const max = top?.amount ?? 0

  return (
    <ScreenShell>
      <PageHeader title="Insights" subtitle="Where your money goes" />

      <Segmented<SpendWindow>
        value={window}
        onChange={setWindow}
        options={[
          { value: 'month', label: 'This month' },
          { value: '30d', label: 'Last 30 days' },
        ]}
      />

      {total === 0 ? (
        <Card className="mt-4 p-6 text-center">
          <p className="text-[40px] mb-2">🌿</p>
          <p className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">No spending {window === 'month' ? 'this month' : 'in the last 30 days'} yet.</p>
          <p className="text-[13px] text-slate-500 mt-1">Once money starts going out, you'll see exactly where it went here.</p>
        </Card>
      ) : (
        <>
          {/* Total + composition bar */}
          <Card className="mt-4 mb-4 p-5">
            <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">Total spent {window === 'month' ? 'this month' : 'in 30 days'}</p>
            <p className="text-[32px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-none mt-1">
              {peso(total, { hide })}
            </p>

            <div className="mt-4 flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
              {items.map((it) => (
                <div
                  key={it.category}
                  className="h-full bg-[color:var(--cl)] dark:bg-[color:var(--cd)] first:rounded-l-full last:rounded-r-full"
                  style={{ ...catVars(it.category), width: `${it.pct}%` }}
                  title={`${CATEGORY_META[it.category].label} ${Math.round(it.pct)}%`}
                />
              ))}
            </div>

            {top && (
              <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-3 leading-snug">
                Your biggest slice is <b>{CATEGORY_META[top.category].label}</b> at {peso(top.amount, { hide })}
                {', '}about {Math.round(top.pct)}% of everything you spent.
              </p>
            )}
          </Card>

          {/* Ranked breakdown */}
          <SectionTitle>Breakdown by category</SectionTitle>
          <Card className="p-4 mb-4 space-y-3.5">
            {items.map((it) => {
              const meta = CATEGORY_META[it.category]
              return (
                <div key={it.category}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-[15px]">{meta.emoji}</span>
                      <span className="text-[14px] font-medium text-slate-800 dark:text-slate-100 truncate">{meta.label}</span>
                      <span className="text-[12px] text-slate-400 shrink-0">{Math.round(it.pct)}%</span>
                    </span>
                    <span className="text-[14px] font-semibold tabular-nums text-slate-900 dark:text-white shrink-0">
                      {peso(it.amount, { hide })}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[color:var(--cl)] dark:bg-[color:var(--cd)]"
                      style={{ ...catVars(it.category), width: `${max > 0 ? (it.amount / max) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {it.count} {it.count === 1 ? 'transaction' : 'transactions'}
                  </p>
                </div>
              )
            })}
          </Card>

          {/* How it's counted - keep the maths transparent */}
          <div className="rounded-2xl bg-slate-100 dark:bg-slate-900 p-4 mb-6 text-[12px] text-slate-500 dark:text-slate-400 space-y-1">
            <p className="font-semibold text-slate-600 dark:text-slate-300">How this is counted</p>
            <p>Only money going out is counted. Salary and other income are left out.</p>
            <p>Internal transfers between your own BPI and GCash don't count. Bank and transfer fees do, since that's money genuinely spent.</p>
          </div>
        </>
      )}
    </ScreenShell>
  )
}
