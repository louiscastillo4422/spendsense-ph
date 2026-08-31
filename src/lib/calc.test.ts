import { describe, it, expect } from 'vitest'
import {
  accountBalance,
  totalAvailable,
  nextDueDate,
  computeSafeToSpend,
  saveNowRecommendation,
  pickGoalForContribution,
  goalProjectedDate,
  spendingByCategory,
} from './calc'
import { makeState, tx, goal, bill } from './testFixtures'

describe('accountBalance', () => {
  it('anchors to the reconciled starting balance and applies signed deltas', () => {
    const state = makeState({
      transactions: [
        tx({ account: 'bpi', direction: 'out', amount: 5000, timestamp: '2026-08-10T09:00:00.000Z' }),
      ],
    })
    // 20000 start − 5000 out = 15000
    expect(accountBalance(state, 'bpi')).toBe(15000)
  })

  it('ignores excluded transactions but still counts transfer legs', () => {
    const state = makeState({
      transactions: [
        tx({ account: 'bpi', direction: 'out', amount: 5000, timestamp: '2026-08-10T09:00:00.000Z' }),
        tx({ account: 'bpi', direction: 'in', amount: 1000, timestamp: '2026-08-11T09:00:00.000Z', excluded: true }),
        tx({ account: 'bpi', direction: 'out', amount: 2000, timestamp: '2026-08-12T09:00:00.000Z', isTransfer: true }),
      ],
    })
    // 20000 − 5000 − (excluded 1000 ignored) − 2000 transfer = 13000
    expect(accountBalance(state, 'bpi')).toBe(13000)
  })

  it('ignores transactions dated before the reconciliation anchor', () => {
    const state = makeState({
      transactions: [
        tx({ account: 'bpi', direction: 'out', amount: 9999, timestamp: '2026-07-15T09:00:00.000Z' }),
      ],
    })
    expect(accountBalance(state, 'bpi')).toBe(20000)
  })

  it('totalAvailable sums both accounts', () => {
    const state = makeState()
    expect(totalAvailable(state)).toBe(25000) // 20000 + 5000
  })
})

describe('spendingByCategory', () => {
  const from = new Date('2026-08-20T00:00:00.000Z')

  it('groups money-out by category, sorted largest-first, with shares', () => {
    const state = makeState({
      transactions: [
        tx({ direction: 'out', amount: 300, category: 'food', timestamp: '2026-08-10T10:00:00.000Z' }),
        tx({ direction: 'out', amount: 100, category: 'food', timestamp: '2026-08-11T10:00:00.000Z' }),
        tx({ direction: 'out', amount: 100, category: 'transport', timestamp: '2026-08-12T10:00:00.000Z' }),
        tx({ direction: 'fee', amount: 50, category: 'fee', timestamp: '2026-08-13T10:00:00.000Z' }),
        // Excluded from spend:
        tx({ direction: 'in', amount: 5000, category: 'salary', timestamp: '2026-08-05T10:00:00.000Z' }),
        tx({ direction: 'out', amount: 200, category: 'transfer', isTransfer: true, timestamp: '2026-08-06T10:00:00.000Z' }),
      ],
    })
    const { items, total } = spendingByCategory(state, 'month', from)
    expect(total).toBe(550) // 400 food + 100 transport + 50 fee
    expect(items.map((i) => i.category)).toEqual(['food', 'transport', 'fee'])
    expect(items[0]).toMatchObject({ amount: 400, count: 2 })
    expect(Math.round(items[0].pct)).toBe(73) // 400 / 550
    // Neither income nor transfer appears.
    expect(items.some((i) => i.category === 'salary' || i.category === 'transfer')).toBe(false)
  })

  it('the 30-day window includes recent spend the calendar-month view drops', () => {
    const state = makeState({
      transactions: [
        tx({ direction: 'out', amount: 100, category: 'food', timestamp: '2026-08-15T10:00:00.000Z' }),
      ],
    })
    const sept = new Date('2026-09-01T00:00:00.000Z')
    expect(spendingByCategory(state, 'month', sept).total).toBe(0) // different calendar month
    expect(spendingByCategory(state, '30d', sept).total).toBe(100) // 17 days ago
  })
})

describe('nextDueDate', () => {
  it('returns this month when the due day is still ahead', () => {
    const d = nextDueDate(10, new Date(2026, 8, 5)) // Sep 5
    expect(d.getMonth()).toBe(8) // September
    expect(d.getDate()).toBe(10)
  })

  it('rolls to next month when the due day has passed', () => {
    const d = nextDueDate(10, new Date(2026, 8, 15)) // Sep 15
    expect(d.getMonth()).toBe(9) // October
    expect(d.getDate()).toBe(10)
  })
})

describe('computeSafeToSpend', () => {
  const from = new Date(2026, 8, 1) // Sep 1, payday is Sep 15

  it('subtracts bills, savings, protected floor and safety buffer', () => {
    const state = makeState({
      bills: [bill({ amount: 2000, dueDay: 10 })], // due Sep 10 ≤ payday
      goals: [goal({ contributionType: 'fixed', contributionValue: 1000, saved: 0, target: 10000 })],
    })
    const r = computeSafeToSpend(state, from)
    // 25000 − 2000 − 1000 − 5000 floor − 500 buffer = 16500
    expect(r.available).toBe(25000)
    expect(r.billsDue).toBe(2000)
    expect(r.savingsDue).toBe(1000)
    expect(r.raw).toBe(16500)
    expect(r.safe).toBe(16500)
    expect(r.shortfall).toBe(0)
    expect(r.status).toBe('green')
    expect(r.enoughInfo).toBe(true)
  })

  it('reports a shortfall (never a negative safe) and goes red when underwater', () => {
    const state = makeState({
      accounts: {
        bpi: { id: 'bpi', name: 'BPI', startingBalance: 1000, reconciledAt: '2026-08-01T00:00:00.000Z' },
        gcash: { id: 'gcash', name: 'GCash', startingBalance: 0, reconciledAt: '2026-08-01T00:00:00.000Z' },
      },
      bills: [bill({ amount: 2000, dueDay: 10 })],
    })
    const r = computeSafeToSpend(state, from)
    expect(r.safe).toBe(0)
    expect(r.shortfall).toBeGreaterThan(0)
    expect(r.status).toBe('red')
  })

  it('flags missing income info instead of inventing a number', () => {
    const state = makeState({ settings: { income: { amount: 0, nextDate: '', frequency: 'monthly' } } as never })
    const r = computeSafeToSpend(state, from)
    expect(r.enoughInfo).toBe(false)
    expect(r.missing.length).toBeGreaterThan(0)
    expect(r.headline).toContain('Not enough information')
  })

  it('excludes bills that fall after payday', () => {
    const state = makeState({
      bills: [bill({ amount: 2000, dueDay: 20 })], // Sep 20 is after Sep 15 payday
    })
    const r = computeSafeToSpend(state, from)
    expect(r.billsDue).toBe(0)
  })
})

describe('saveNowRecommendation', () => {
  const from = new Date(2026, 8, 1)

  it('sets aside the salary percentage when funds are ample', () => {
    const state = makeState({
      accounts: {
        bpi: { id: 'bpi', name: 'BPI', startingBalance: 50000, reconciledAt: '2026-08-01T00:00:00.000Z' },
        gcash: { id: 'gcash', name: 'GCash', startingBalance: 5000, reconciledAt: '2026-08-01T00:00:00.000Z' },
      },
      goals: [goal({ saved: 0, target: 100000 })],
    })
    const incoming = tx({ account: 'bpi', direction: 'in', amount: 42000, category: 'salary' })
    const r = saveNowRecommendation(state, incoming, from)
    // 30% of 42000 = 12600, uncapped because slack is large
    expect(r.amount).toBe(12600)
    expect(r.keepAvailable).toBe(false)
    expect(r.goal).toBeDefined()
  })

  it('keeps non-salary money liquid when a bill is due and cash is tight', () => {
    const state = makeState({
      accounts: {
        bpi: { id: 'bpi', name: 'BPI', startingBalance: 6000, reconciledAt: '2026-08-01T00:00:00.000Z' },
        gcash: { id: 'gcash', name: 'GCash', startingBalance: 0, reconciledAt: '2026-08-01T00:00:00.000Z' },
      },
      bills: [bill({ amount: 3000, dueDay: 10 })],
    })
    const incoming = tx({ account: 'gcash', direction: 'in', amount: 3000, category: 'other' })
    const r = saveNowRecommendation(state, incoming, from)
    expect(r.amount).toBe(0)
    expect(r.keepAvailable).toBe(true)
  })
})

describe('pickGoalForContribution', () => {
  it('prefers the higher-priority goal when neither is behind', () => {
    const state = makeState({
      goals: [
        goal({ id: 'low', name: 'Gadget', priority: 'low', saved: 0, target: 5000 }),
        goal({ id: 'high', name: 'Emergency', priority: 'high', saved: 0, target: 5000 }),
      ],
    })
    expect(pickGoalForContribution(state)?.id).toBe('high')
  })

  it('skips fully-funded goals', () => {
    const state = makeState({
      goals: [goal({ id: 'done', saved: 5000, target: 5000 })],
    })
    expect(pickGoalForContribution(state)).toBeUndefined()
  })
})

describe('goalProjectedDate', () => {
  it('projects a fixed monthly goal by whole contribution periods', () => {
    const g = goal({ saved: 7000, target: 10000, contributionType: 'fixed', contributionValue: 1000, frequency: 'monthly' })
    const from = new Date(2026, 8, 1) // Sep 1
    const d = goalProjectedDate(g, from)
    // remaining 3000 / 1000 = 3 months → Dec 1
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(11) // December
  })

  it('returns null for a percent goal with no fixed contribution', () => {
    const g = goal({ contributionType: 'percent', contributionValue: 10 })
    expect(goalProjectedDate(g, new Date(2026, 8, 1))).toBeNull()
  })
})
