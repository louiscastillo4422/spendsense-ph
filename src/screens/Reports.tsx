import { useMemo, useState } from 'react'
import { useApp } from '../state/store'
import { ScreenShell, PageHeader } from '../components/Screen'
import { Card, SectionTitle, Button, Segmented } from '../components/ui'
import { computeSafeToSpend, monthFlow, activeGoals, billsDueBeforePayday } from '../lib/calc'
import { peso, fmtDate, relativeDays, daysBetween } from '../lib/format'
import { CATEGORY_META } from '../components/ui'
import type { Category } from '../types'

export function Reports() {
  const { state, notify } = useApp()
  const [kind, setKind] = useState<'daily' | 'weekly'>('daily')

  const report = useMemo(() => (kind === 'daily' ? buildDaily(state) : buildWeekly(state)), [kind, state])

  return (
    <ScreenShell>
      <PageHeader title="Email reports" subtitle="A friendly check-in in your inbox" />

      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { value: 'daily', label: 'Daily report' },
          { value: 'weekly', label: 'Weekly report' },
        ]}
      />

      {/* Email preview */}
      <Card className="mt-4 mb-4 overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50 dark:bg-slate-900">
          <p className="text-[12px] text-slate-400">
            From <b className="text-slate-600 dark:text-slate-300">SpendSense 💚</b> &lt;hello@spendsense.ph&gt;
          </p>
          <p className="text-[12px] text-slate-400">To you</p>
          <p className="text-[14px] font-bold text-slate-900 dark:text-white mt-1">{report.subject}</p>
        </div>
        <div className="px-4 py-4 text-[14px] text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
          {report.body}
        </div>
      </Card>

      <Button
        className="w-full mb-4"
        onClick={() => notify({ title: 'Report queued', body: `Your ${kind} report would arrive by email (simulated).`, tone: 'good' })}
      >
        Send me this now (simulated)
      </Button>

      <SectionTitle>Is this feasible?</SectionTitle>
      <Card className="p-4 mb-6 text-[13px] text-slate-600 dark:text-slate-300 space-y-2">
        <p>
          <b>Yes.</b> The friendly report you see above is generated entirely on-device from your data. To actually{' '}
          <i>email</i> it, a real build adds a tiny scheduled job:
        </p>
        <p>• A lightweight backend (or a serverless cron) runs each morning / every Monday.</p>
        <p>• It uses the same local summaries. <b>No raw bank messages leave your phone</b>, only the summary text.</p>
        <p>• Delivery via an email API (e.g. a transactional email service) or Apple’s local notifications if you prefer no server.</p>
        <p className="text-slate-400">
          For a truly serverless option, the app can also schedule a local “report ready” notification and let you tap to view.
          No email account needed.
        </p>
      </Card>
    </ScreenShell>
  )
}

function topCategory(state: ReturnType<typeof useApp>['state']): { category: Category; amount: number } | null {
  const totals = new Map<Category, number>()
  const now = new Date()
  for (const t of state.transactions) {
    if (t.direction === 'in' || t.isTransfer || t.excluded) continue
    if (daysBetween(new Date(t.timestamp), now) > 7) continue
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount)
  }
  let best: { category: Category; amount: number } | null = null
  for (const [category, amount] of totals) if (!best || amount > best.amount) best = { category, amount }
  return best
}

function buildDaily(state: ReturnType<typeof useApp>['state']) {
  const sts = computeSafeToSpend(state)
  const now = new Date()
  const today = state.transactions.filter((t) => daysBetween(new Date(t.timestamp), now) === 0 && !t.isTransfer && !t.excluded)
  const spentToday = today.filter((t) => t.direction !== 'in').reduce((a, t) => a + t.amount, 0)
  const inToday = today.filter((t) => t.direction === 'in').reduce((a, t) => a + t.amount, 0)

  const line =
    sts.status === 'green'
      ? `You're in good shape. Around ${peso(sts.dailyLimit)} a day keeps you comfy until payday. 🌤️`
      : sts.status === 'amber'
        ? `Bit of a careful day ahead. Try to keep spending under ${peso(sts.dailyLimit)} today. 🫶`
        : `Heads up, money's tight until payday. Best to pause the non-essentials for now. I've got your back. 🛡️`

  const txCount = today.length === 1 ? '1 transaction' : `${today.length} transactions`
  const body = `Hey! Quick money check-in for ${fmtDate(now.toISOString())} 👋

${today.length === 0 ? 'No transactions yet today. Nice and quiet.' : `Today so far: ${peso(spentToday)} out${inToday ? `, ${peso(inToday)} in` : ''} across ${txCount}.`}

Safe to spend until payday: ${peso(sts.safe)} (${sts.daysLeft} ${sts.daysLeft === 1 ? 'day' : 'days'} to go).
${line}

Talk tomorrow,
SpendSense`

  return { subject: `Your money today: ${peso(sts.safe)} safe to spend`, body }
}

function buildWeekly(state: ReturnType<typeof useApp>['state']) {
  const sts = computeSafeToSpend(state)
  const bpi = monthFlow(state, 'bpi')
  const gcash = monthFlow(state, 'gcash')
  const totalOut = bpi.out + gcash.out
  const totalIn = bpi.in + gcash.in
  const top = topCategory(state)
  const bills = billsDueBeforePayday(state)
  const goals = activeGoals(state).slice(0, 3)

  const goalLines = goals
    .map((g) => `  ${g.emoji} ${g.name}: ${Math.round((g.saved / g.target) * 100)}% there (${peso(g.saved)} / ${peso(g.target)})`)
    .join('\n')

  const body = `Hey, happy Monday! Here's your week in money 📅

This month so far:
  • Money in: ${peso(totalIn)}
  • Money out: ${peso(totalOut)}
${top ? `  • Biggest category this week: ${CATEGORY_META[top.category].emoji} ${CATEGORY_META[top.category].label} (${peso(top.amount)})` : ''}

Right now you can safely spend ${peso(sts.safe)} before payday (${relativeDays(state.settings.income.nextDate)}).

${bills.items.length ? `Bills to watch: ${bills.items.map((b) => `${b.label} (${peso(b.amount)})`).join(', ')}.` : 'No bills due before payday. Breathe easy. 😌'}

Your goals:
${goalLines || '  (no active goals yet, want to start one?)'}

Proud of you for keeping an eye on this. Same time next week?
SpendSense 💚`

  return { subject: `Your week: ${peso(totalOut)} spent, ${peso(sts.safe)} still safe`, body }
}
