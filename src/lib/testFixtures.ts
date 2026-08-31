// Test-only helpers for building an AppState. Not a test suite itself
// (Vitest only runs *.test.ts / *.spec.ts), just shared fixtures.
import type { AppState, Transaction, Goal, Bill, Settings } from '../types'

let seq = 0
export function tx(partial: Partial<Transaction> = {}): Transaction {
  seq += 1
  return {
    id: partial.id ?? `t${seq}`,
    account: partial.account ?? 'gcash',
    direction: partial.direction ?? 'out',
    amount: partial.amount ?? 100,
    category: partial.category ?? 'other',
    timestamp: partial.timestamp ?? '2026-08-15T10:00:00.000Z',
    confidence: partial.confidence ?? 0.9,
    rawMessage: partial.rawMessage ?? '',
    ...partial,
  }
}

export function goal(partial: Partial<Goal> = {}): Goal {
  return {
    id: partial.id ?? 'g1',
    name: partial.name ?? 'Emergency Fund',
    emoji: partial.emoji ?? '🛟',
    target: partial.target ?? 10000,
    saved: partial.saved ?? 0,
    priority: partial.priority ?? 'high',
    frequency: partial.frequency ?? 'monthly',
    contributionType: partial.contributionType ?? 'fixed',
    contributionValue: partial.contributionValue ?? 1000,
    ...partial,
  }
}

export function bill(partial: Partial<Bill> = {}): Bill {
  return {
    id: partial.id ?? 'b1',
    name: partial.name ?? 'Meralco',
    amount: partial.amount ?? 2000,
    dueDay: partial.dueDay ?? 15,
    category: partial.category ?? 'bills',
    ...partial,
  }
}

export function defaultSettings(partial: Partial<Settings> = {}): Settings {
  return {
    onboarded: true,
    theme: 'system',
    income: { amount: 42000, nextDate: '2026-09-15T00:00:00.000Z', frequency: 'monthly' },
    emergencyBuffer: 5000,
    minProtectedBalance: 1000,
    safetyBuffer: 500,
    transferWindowMinutes: 10,
    transferAmountTolerance: 50,
    rollover: 'carry',
    moneyInRules: [
      { id: 'r1', label: 'Save 30% of salary', appliesTo: 'salary', percent: 30, minAmount: 0, enabled: true },
      { id: 'r2', label: 'Save 10% of extra money in', appliesTo: 'other', percent: 10, minAmount: 2000, enabled: true },
    ],
    categoryLimits: [],
    faceIdLock: false,
    notificationPrivacy: 'full',
    maskAccountNumbers: true,
    ...partial,
  }
}

export function makeState(partial: Partial<AppState> = {}): AppState {
  return {
    version: 1,
    accounts: {
      bpi: { id: 'bpi', name: 'BPI', startingBalance: 20000, reconciledAt: '2026-08-01T00:00:00.000Z' },
      gcash: { id: 'gcash', name: 'GCash', startingBalance: 5000, reconciledAt: '2026-08-01T00:00:00.000Z' },
    },
    transactions: [],
    bills: [],
    goals: [],
    parseRules: [],
    automation: { bpiConnected: false, gcashConnected: false },
    ...partial,
    // Always resolve settings through the defaulter, even when `partial`
    // supplies a partial settings object — so it must come after `...partial`.
    settings: defaultSettings(partial.settings),
  }
}
