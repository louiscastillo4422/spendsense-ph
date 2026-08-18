import { useMemo, useState } from 'react'
import { useApp } from '../state/store'
import { ScreenShell, PageHeader } from '../components/Screen'
import { Card, SectionTitle, StatusPill, Button, Progress, PesoInput, CategoryIcon, AccountBadge } from '../components/ui'
import { Breakdown } from '../components/Breakdown'
import { Sheet } from '../components/ui'
import {
  computeSafeToSpend,
  totalAvailable,
  saveNowRecommendation,
  billsDueBeforePayday,
  activeGoals,
} from '../lib/calc'
import { peso, fmtDate, fmtDateShort, relativeDays, daysBetween } from '../lib/format'
import type { Screen } from '../components/TabBar'
import type { Transaction } from '../types'

export function Home({ navigate }: { navigate: (s: Screen) => void }) {
  const { state, upsertGoal, updateTransaction, notify } = useApp()
  const [showCalc, setShowCalc] = useState(false)
  const [whatIf, setWhatIf] = useState(0)
  const [dismissedSave, setDismissedSave] = useState<string | null>(null)

  const sts = useMemo(() => computeSafeToSpend(state), [state])
  const bills = useMemo(() => billsDueBeforePayday(state), [state])
  const hide = state.settings.notificationPrivacy === 'hideBalances'

  // Most recent real money-in for the Save-Now nudge.
  const lastIn = useMemo(
    () =>
      [...state.transactions]
        .filter((t) => t.direction === 'in' && !t.isTransfer && !t.excluded)
        .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0],
    [state.transactions],
  )
  const saveNow = lastIn ? saveNowRecommendation(state, lastIn) : null

  const recentIn = state.transactions.filter((t) => t.direction === 'in' && !t.isTransfer).slice(0, 3)
  const recentOut = state.transactions.filter((t) => t.direction !== 'in' && !t.isTransfer).slice(0, 3)

  const daysStale = daysBetween(new Date(state.accounts.bpi.reconciledAt), new Date())
  const stale = daysStale > 14

  const heroTone =
    sts.status === 'green'
      ? 'from-emerald-500/15 to-emerald-500/5'
      : sts.status === 'amber'
        ? 'from-amber-500/15 to-amber-500/5'
        : 'from-red-500/15 to-red-500/5'

  const projectedSafe = Math.max(0, sts.safe - whatIf)
  const projectedDaily = projectedSafe / sts.daysLeft

  function applySave() {
    if (!saveNow || saveNow.amount <= 0 || !saveNow.goal) return
    upsertGoal({ ...saveNow.goal, saved: saveNow.goal.saved + saveNow.amount })
    notify({
      title: `Saved ${peso(saveNow.amount)} to ${saveNow.goal.name}`,
      body: 'Nice one. Future you says thanks. 💚',
      tone: 'good',
    })
    setDismissedSave(lastIn?.id ?? null)
  }

  return (
    <ScreenShell>
      <PageHeader
        title="Good day 👋"
        subtitle={`Next income ${relativeDays(state.settings.income.nextDate)} · ${fmtDate(state.settings.income.nextDate)}`}
      />

      {/* Safe to spend hero */}
      <Card className={`bg-gradient-to-b ${heroTone} p-5 mb-4`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">Safe to spend until payday</span>
          <StatusPill status={sts.status} />
        </div>

        {sts.enoughInfo ? (
          <>
            <div className="flex items-end gap-2">
              <span className="text-[40px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
                {sts.shortfall > 0 ? '−' : ''}
                {peso(sts.shortfall > 0 ? sts.shortfall : sts.safe, { hide })}
              </span>
            </div>
            <p className="text-[14px] text-slate-600 dark:text-slate-300 mt-2 leading-snug">{sts.headline}</p>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <MiniStat label="Suggested daily" value={peso(sts.dailyLimit, { hide })} />
              <MiniStat label="Days to payday" value={`${sts.daysLeft} ${sts.daysLeft === 1 ? 'day' : 'days'}`} />
            </div>

            <button onClick={() => setShowCalc(true)} className="mt-3 text-[13px] font-semibold text-blue-600 dark:text-blue-400">
              How was this calculated?
            </button>
          </>
        ) : (
          <div className="mt-2">
            <p className="text-[15px] text-slate-700 dark:text-slate-200 leading-snug">{sts.headline}</p>
            <Button className="mt-3" onClick={() => navigate('budget')}>
              Add missing details
            </Button>
          </div>
        )}
      </Card>

      {/* Save-Now recommendation */}
      {saveNow && lastIn && dismissedSave !== lastIn.id && (
        <Card className="p-4 mb-4 border-emerald-300/60 dark:border-emerald-500/30">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">💡</span>
            <span className="text-[13px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Save now?</span>
          </div>
          <p className="text-[14px] text-slate-700 dark:text-slate-200 leading-snug">{saveNow.reason}</p>
          <div className="mt-3">
            <Breakdown items={saveNow.breakdown} />
          </div>
          <div className="flex gap-2 mt-3">
            {saveNow.amount > 0 && saveNow.goal ? (
              <Button size="sm" onClick={applySave}>
                Set aside {peso(saveNow.amount)}
              </Button>
            ) : (
              <Button size="sm" variant="soft" onClick={() => navigate('goals')}>
                Review goals
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setDismissedSave(lastIn.id)}>
              Not now
            </Button>
          </div>
        </Card>
      )}

      {/* Totals row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="p-4" onClick={() => navigate('accounts')}>
          <p className="text-[12px] text-slate-500">Total available</p>
          <p className="text-[22px] font-extrabold text-slate-900 dark:text-white mt-1">{peso(totalAvailable(state), { hide })}</p>
          <p className="text-[11px] text-slate-400 mt-1">BPI + GCash</p>
        </Card>
        <Card className={`p-4 ${stale ? 'border-amber-300 dark:border-amber-500/40' : ''}`}>
          <p className="text-[12px] text-slate-500">Data confidence</p>
          <p className={`text-[16px] font-bold mt-1 ${stale ? 'text-amber-600' : 'text-emerald-600'}`}>
            {stale ? 'Check balances' : 'Looks current'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Reconciled {relativeDays(state.accounts.bpi.reconciledAt)}</p>
        </Card>
      </div>

      {/* Scenario tester */}
      {sts.enoughInfo && (
        <>
          <SectionTitle>Try a purchase</SectionTitle>
          <Card className="p-4 mb-4">
            <p className="text-[13px] text-slate-500 mb-2">See how spending a set amount changes things.</p>
            <PesoInput value={whatIf} onChange={setWhatIf} placeholder="e.g. 1500" />
            {whatIf > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <MiniStat
                  label="Safe left"
                  value={peso(projectedSafe)}
                  tone={projectedSafe <= 0 ? 'bad' : projectedSafe < sts.safe * 0.3 ? 'warn' : 'good'}
                />
                <MiniStat label="New daily" value={peso(projectedDaily)} />
              </div>
            )}
            {whatIf > sts.safe && (
              <p className="text-[13px] text-red-600 mt-2 font-medium">
                That’s {peso(whatIf - sts.safe)} more than your safe amount. It would eat into protected money.
              </p>
            )}
          </Card>
        </>
      )}

      {/* Bills due before payday */}
      <SectionTitle right={<button onClick={() => navigate('budget')} className="text-[13px] font-semibold text-blue-600">Manage</button>}>
        Bills before payday
      </SectionTitle>
      <Card className="p-2 mb-4">
        {bills.items.length === 0 ? (
          <p className="px-3 py-4 text-[14px] text-slate-500">No bills due before your next income. 🎉</p>
        ) : (
          bills.items.map((b, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2.5">
              <div>
                <p className="text-[14px] font-medium text-slate-800 dark:text-slate-100">{b.label}</p>
                <p className="text-[12px] text-slate-400">Due {b.note}</p>
              </div>
              <span className="text-[14px] font-semibold text-slate-900 dark:text-white">{peso(b.amount)}</span>
            </div>
          ))
        )}
      </Card>

      {/* Goals snapshot */}
      <SectionTitle right={<button onClick={() => navigate('goals')} className="text-[13px] font-semibold text-blue-600">All goals</button>}>
        Savings goals
      </SectionTitle>
      <Card className="p-4 mb-4 space-y-3">
        {activeGoals(state).slice(0, 3).map((g) => {
          const p = (g.saved / g.target) * 100
          return (
            <div key={g.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[14px] font-medium text-slate-800 dark:text-slate-100">
                  {g.emoji} {g.name}
                </span>
                <span className="text-[12px] text-slate-500">
                  {peso(g.saved, { hide })} / {peso(g.target, { hide })}
                </span>
              </div>
              <Progress value={p} tone={g.isEmergency ? 'emerald' : 'blue'} />
            </div>
          )
        })}
        {activeGoals(state).length === 0 && <p className="text-[14px] text-slate-500">No active goals yet.</p>}
      </Card>

      {/* Recent activity */}
      <SectionTitle right={<button onClick={() => navigate('transactions')} className="text-[13px] font-semibold text-blue-600">See all</button>}>
        Recent money in
      </SectionTitle>
      <Card className="p-2 mb-4">
        {recentIn.length ? recentIn.map((t) => <RecentRow key={t.id} t={t} hide={hide} />) : <Empty text="No incoming money yet." />}
      </Card>

      <SectionTitle>Recent money out</SectionTitle>
      <Card className="p-2 mb-2">
        {recentOut.length ? recentOut.map((t) => <RecentRow key={t.id} t={t} hide={hide} />) : <Empty text="No spending yet." />}
      </Card>

      {showCalc && (
        <Sheet title="How was this calculated?" onClose={() => setShowCalc(false)}>
          <p className="text-[14px] text-slate-600 dark:text-slate-300 mb-3">
            Safe-to-Spend protects your bills, savings set-aside and buffers first. Everything left is genuinely free to spend
            before <b>{fmtDate(state.settings.income.nextDate)}</b>.
          </p>
          <Breakdown items={sts.breakdown} total={sts.safe} totalLabel="Safe to spend" />
          <div className="mt-4 rounded-2xl bg-slate-100 dark:bg-slate-900 p-3.5 text-[13px] text-slate-600 dark:text-slate-300 space-y-1">
            <p>
              ÷ {sts.daysLeft} days until payday = <b>{peso(sts.dailyLimit)}</b> suggested per day.
            </p>
            <p className="text-slate-400">
              Internal transfers never count as income. Figures update as you reconcile balances and import transactions.
            </p>
          </div>
        </Sheet>
      )}
    </ScreenShell>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'warn' | 'bad' }) {
  const color =
    tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : tone === 'good' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'
  return (
    <div className="rounded-2xl bg-white/70 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800 px-3 py-2.5">
      <p className="text-[12px] text-slate-500">{label}</p>
      <p className={`text-[17px] font-bold ${color}`}>{value}</p>
    </div>
  )
}

function RecentRow({ t, hide }: { t: Transaction; hide: boolean }) {
  const isIn = t.direction === 'in'
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <CategoryIcon category={t.category} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[14px] font-medium text-slate-800 dark:text-slate-100 truncate">{t.counterparty ?? 'Transaction'}</p>
          <AccountBadge id={t.account} />
        </div>
        <p className="text-[12px] text-slate-400">{fmtDateShort(t.timestamp)}</p>
      </div>
      <span className={`text-[14px] font-bold tabular-nums ${isIn ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
        {isIn ? '+' : '−'}
        {peso(t.amount, { hide }).replace('₱', '₱')}
      </span>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="px-3 py-4 text-[14px] text-slate-500">{text}</p>
}
