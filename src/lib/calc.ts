// ---------------------------------------------------------------------------
// Transparent, deterministic money maths. Every figure here is explainable
// and surfaced through "How was this calculated?" in the UI.
// ---------------------------------------------------------------------------

import type { AccountId, AppState, Category, Goal, Transaction } from '../types'
import { daysBetween } from './format'

export interface LineItem {
  label: string
  amount: number
  note?: string
}

export interface SafeToSpend {
  available: number
  billsDue: number
  savingsDue: number
  protectedFloor: number
  safetyBuffer: number
  raw: number // may be negative
  safe: number // clamped at 0
  shortfall: number // positive when raw < 0
  daysLeft: number
  dailyLimit: number
  status: 'green' | 'amber' | 'red'
  headline: string
  breakdown: LineItem[]
  enoughInfo: boolean
  missing: string[]
}

const DAY = 24 * 60 * 60 * 1000

// --- Balances & aggregates -------------------------------------------------

/** Does this transaction move real money in the account balance? */
function countsForBalance(t: Transaction): boolean {
  return !t.excluded
}

/** Should this transaction appear in income / spending totals? */
function countsForFlow(t: Transaction): boolean {
  return !t.excluded && !t.isTransfer
}

function signed(t: Transaction): number {
  return t.direction === 'in' ? t.amount : -t.amount
}

export function accountBalance(state: AppState, id: AccountId): number {
  const acct = state.accounts[id]
  const since = new Date(acct.reconciledAt).getTime()
  const delta = state.transactions
    .filter((t) => t.account === id && countsForBalance(t) && new Date(t.timestamp).getTime() > since)
    .reduce((sum, t) => sum + signed(t), 0)
  return acct.startingBalance + delta
}

export function totalAvailable(state: AppState): number {
  return accountBalance(state, 'bpi') + accountBalance(state, 'gcash')
}

function isThisMonth(iso: string, ref = new Date()): boolean {
  const d = new Date(iso)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

export function monthFlow(state: AppState, id: AccountId): { in: number; out: number } {
  let income = 0
  let spend = 0
  for (const t of state.transactions) {
    if (t.account !== id || !countsForFlow(t) || !isThisMonth(t.timestamp)) continue
    if (t.direction === 'in') income += t.amount
    else spend += t.amount
  }
  return { in: income, out: spend }
}

export function lastTransaction(state: AppState, id: AccountId): Transaction | undefined {
  return [...state.transactions]
    .filter((t) => t.account === id)
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0]
}

// --- Spending by category --------------------------------------------------

export type SpendWindow = 'month' | '30d'

export interface CategorySpend {
  category: Category
  amount: number
  count: number
  /** Share of total spend in the window, 0-100. */
  pct: number
}

/**
 * Total spending grouped by category for a window. Income and internal
 * transfers are excluded; transfer fees still count (they are real spending).
 * Result is sorted largest-first.
 */
export function spendingByCategory(
  state: AppState,
  window: SpendWindow = 'month',
  from = new Date(),
): { items: CategorySpend[]; total: number } {
  const totals = new Map<Category, { amount: number; count: number }>()
  let total = 0
  for (const t of state.transactions) {
    if (t.direction === 'in' || !countsForFlow(t)) continue
    const inWindow = window === 'month' ? isThisMonth(t.timestamp, from) : daysBetween(new Date(t.timestamp), from) <= 30
    if (!inWindow) continue
    const cur = totals.get(t.category) ?? { amount: 0, count: 0 }
    cur.amount += t.amount
    cur.count += 1
    totals.set(t.category, cur)
    total += t.amount
  }
  const items: CategorySpend[] = [...totals.entries()]
    .map(([category, v]) => ({ category, amount: v.amount, count: v.count, pct: total > 0 ? (v.amount / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount)
  return { items, total }
}

// --- Bills & savings due before payday -------------------------------------

/** Next calendar occurrence of a day-of-month, on/after `from`. */
export function nextDueDate(dueDay: number, from = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), dueDay)
  if (d.getTime() < new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()) {
    d.setMonth(d.getMonth() + 1)
  }
  return d
}

export function billsDueBeforePayday(state: AppState, from = new Date()): { total: number; items: LineItem[] } {
  const payday = new Date(state.settings.income.nextDate)
  const items: LineItem[] = []
  let total = 0
  for (const bill of state.bills) {
    const due = nextDueDate(bill.dueDay, from)
    if (due.getTime() <= payday.getTime()) {
      total += bill.amount
      items.push({ label: bill.name, amount: bill.amount, note: due.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) })
    }
  }
  return { total, items }
}

export function activeGoals(state: AppState): Goal[] {
  return state.goals.filter((g) => !g.paused)
}

export function savingsDueBeforePayday(state: AppState): { total: number; items: LineItem[] } {
  const items: LineItem[] = []
  let total = 0
  for (const g of activeGoals(state)) {
    if (g.contributionType !== 'fixed') continue // percent rules trigger on money-in
    if (g.saved >= g.target) continue
    total += g.contributionValue
    items.push({ label: g.name, amount: g.contributionValue, note: `${g.frequency} set-aside` })
  }
  return { total, items }
}

// --- Safe to Spend ---------------------------------------------------------

export function daysUntilIncome(state: AppState, from = new Date()): number {
  return Math.max(0, daysBetween(from, new Date(state.settings.income.nextDate)))
}

export function computeSafeToSpend(state: AppState, from = new Date()): SafeToSpend {
  const s = state.settings
  const missing: string[] = []
  if (!s.income.amount) missing.push('regular income amount')
  if (!s.income.nextDate) missing.push('next income date')

  const available = totalAvailable(state)
  const bills = billsDueBeforePayday(state, from)
  const savings = savingsDueBeforePayday(state)
  const protectedFloor = Math.max(s.emergencyBuffer, s.minProtectedBalance)
  const safetyBuffer = s.safetyBuffer

  const raw = available - bills.total - savings.total - protectedFloor - safetyBuffer
  const safe = Math.max(0, raw)
  const shortfall = raw < 0 ? Math.abs(raw) : 0
  const daysLeft = Math.max(1, daysUntilIncome(state, from))
  const dailyLimit = safe / daysLeft

  const enoughInfo = missing.length === 0

  let status: SafeToSpend['status'] = 'green'
  if (raw <= 0 || available < protectedFloor) status = 'red'
  else if (available > 0 && safe / available < 0.2) status = 'amber'

  const paydayLabel = new Date(s.income.nextDate).toLocaleDateString('en-PH', { month: 'long', day: 'numeric' })

  let headline: string
  if (!enoughInfo) {
    headline = `Not enough information yet. Add your ${missing.join(' and ')} so we can work out a reliable Safe-to-Spend.`
  } else if (shortfall > 0) {
    headline = `You're about ${money(shortfall)} short of covering your bills, savings and ₱${protectedFloor.toLocaleString('en-PH')} protected buffer before ${paydayLabel}. Hold off on non-essentials.`
  } else {
    headline = `You can safely spend about ${money(safe)} until ${paydayLabel} after protecting your bills, savings set-aside and ₱${protectedFloor.toLocaleString('en-PH')} buffer. That works out to roughly ${money(dailyLimit)} a day.`
  }

  const breakdown: LineItem[] = [
    { label: 'Estimated available funds', amount: available, note: 'BPI + GCash' },
    { label: 'Less: bills due before payday', amount: -bills.total, note: `${bills.items.length} ${bills.items.length === 1 ? 'bill' : 'bills'}` },
    { label: 'Less: savings set-aside', amount: -savings.total, note: `${savings.items.length} ${savings.items.length === 1 ? 'goal' : 'goals'}` },
    { label: 'Less: protected buffer', amount: -protectedFloor, note: 'emergency / minimum' },
    { label: 'Less: your safety buffer', amount: -safetyBuffer },
  ]

  return {
    available,
    billsDue: bills.total,
    savingsDue: savings.total,
    protectedFloor,
    safetyBuffer,
    raw,
    safe,
    shortfall,
    daysLeft,
    dailyLimit,
    status,
    headline,
    breakdown,
    enoughInfo,
    missing,
  }
}

// --- Save Now recommendation ----------------------------------------------

export interface SaveNow {
  amount: number
  goal?: Goal
  reason: string
  breakdown: LineItem[]
  keepAvailable: boolean
}

/** Suggest how much of an incoming amount to set aside. */
export function saveNowRecommendation(state: AppState, incoming: Transaction, from = new Date()): SaveNow {
  const s = state.settings
  const isSalary = incoming.category === 'salary'
  const rule = s.moneyInRules.find(
    (r) => r.enabled && r.appliesTo === (isSalary ? 'salary' : 'other') && incoming.amount >= r.minAmount,
  )

  const bills = billsDueBeforePayday(state, from)
  const protectedFloor = Math.max(s.emergencyBuffer, s.minProtectedBalance)
  const available = totalAvailable(state)
  const spareAfterObligations = Math.max(0, available - protectedFloor - bills.total)

  // A bill is due very soon and cash is tight, so keep the money liquid.
  const billSoon = bills.items.length > 0 && spareAfterObligations < incoming.amount
  if (billSoon && !isSalary) {
    return {
      amount: 0,
      reason: `Keep this ${money(incoming.amount)} available. You have ${bills.items.length} ${bills.items.length === 1 ? 'bill' : 'bills'} due before payday and only ${money(spareAfterObligations)} of slack.`,
      breakdown: bills.items,
      keepAvailable: true,
    }
  }

  const byRule = rule ? Math.round(incoming.amount * (rule.percent / 100)) : 0
  const capped = Math.max(0, Math.min(byRule, spareAfterObligations))

  // Route to the highest-priority, most-behind, active goal.
  const target = pickGoalForContribution(state)

  const breakdown: LineItem[] = [
    { label: `Incoming ${isSalary ? 'salary' : 'money'}`, amount: incoming.amount },
    rule
      ? { label: rule.label, amount: -byRule, note: `${rule.percent}%` }
      : { label: 'No savings rule matched', amount: 0 },
  ]
  if (capped < byRule) {
    breakdown.push({ label: 'Capped to protect bills & buffer', amount: capped - byRule })
  }

  let reason: string
  if (capped <= 0) {
    reason = `No set-aside suggested right now. Covering your bills and the ₱${protectedFloor.toLocaleString('en-PH')} buffer comes first.`
  } else if (target) {
    const remainingSafe = Math.max(0, spareAfterObligations - capped)
    reason = `${money(incoming.amount)} received. You can put ${money(capped)} toward ${target.name} and still keep about ${money(remainingSafe)} available before payday.`
  } else {
    reason = `${money(incoming.amount)} received. Consider setting aside ${money(capped)} into savings.`
  }

  return { amount: capped, goal: target, reason, breakdown, keepAvailable: false }
}

export function pickGoalForContribution(state: AppState): Goal | undefined {
  const order = { high: 0, medium: 1, low: 2 }
  return activeGoals(state)
    .filter((g) => g.saved < g.target)
    .sort((a, b) => {
      const behindA = goalIsBehind(a) ? 0 : 1
      const behindB = goalIsBehind(b) ? 0 : 1
      if (behindA !== behindB) return behindA - behindB
      return order[a.priority] - order[b.priority]
    })[0]
}

// --- Goal projections ------------------------------------------------------

export function goalRequiredPerPeriod(goal: Goal, from = new Date()): { weekly: number; monthly: number } {
  const remaining = Math.max(0, goal.target - goal.saved)
  if (!goal.targetDate) return { weekly: 0, monthly: 0 }
  const days = Math.max(1, daysBetween(from, new Date(goal.targetDate)))
  const weeks = Math.max(1, days / 7)
  const months = Math.max(1, days / 30)
  return { weekly: remaining / weeks, monthly: remaining / months }
}

export function goalIsBehind(goal: Goal, from = new Date()): boolean {
  if (!goal.targetDate) return false
  const totalDays = daysBetween(new Date(goal.targetDate), from) // negative if in future
  if (totalDays >= 0) return goal.saved < goal.target // past due & unmet
  const need = goalRequiredPerPeriod(goal, from)
  const perPeriod = goal.contributionType === 'fixed' ? goal.contributionValue : 0
  if (goal.contributionType === 'fixed' && perPeriod > 0) {
    return (goal.frequency === 'weekly' ? need.weekly : need.monthly) > perPeriod * 1.05
  }
  return false
}

export function goalProjectedDate(goal: Goal, from = new Date()): Date | null {
  const remaining = Math.max(0, goal.target - goal.saved)
  if (remaining === 0) return from
  if (goal.contributionType !== 'fixed' || goal.contributionValue <= 0) return null
  const periods = Math.ceil(remaining / goal.contributionValue)
  const d = new Date(from)
  if (goal.frequency === 'weekly') d.setDate(d.getDate() + periods * 7)
  else d.setMonth(d.getMonth() + periods)
  return d
}

// Local helper mirroring format.peso without a circular import concern.
function money(v: number): string {
  return `₱${Math.abs(Math.round(v)).toLocaleString('en-PH')}`
}
