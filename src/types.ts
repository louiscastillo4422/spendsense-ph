// ---------------------------------------------------------------------------
// SpendSense PH domain types
// ---------------------------------------------------------------------------

export type AccountId = 'bpi' | 'gcash'

/** Direction stored on a transaction. Transfers are recorded as in/out legs
 *  plus `isTransfer`, so the account balance still moves but income/spend
 *  totals ignore them. */
export type Direction = 'in' | 'out' | 'fee'

/** Direction the parser may output before a transaction is finalised. */
export type ParsedDirection = 'in' | 'out' | 'fee' | 'transfer' | 'unknown'

export type Category =
  | 'salary'
  | 'food'
  | 'shopping'
  | 'transport'
  | 'bills'
  | 'subscriptions'
  | 'cash'
  | 'fee'
  | 'transfer'
  | 'savings'
  | 'other'

export type IncomeFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'
export type Priority = 'high' | 'medium' | 'low'
export type ContributionFrequency = 'weekly' | 'monthly'
export type NotificationPrivacy = 'full' | 'hideBalances' | 'generic'
export type ThemePref = 'light' | 'dark' | 'system'

export interface Account {
  id: AccountId
  name: string
  /** Reconciled anchor balance. */
  startingBalance: number
  /** ISO timestamp of the last reconciliation. */
  reconciledAt: string
}

export interface Transaction {
  id: string
  account: AccountId
  direction: Direction
  /** Positive magnitude in pesos. */
  amount: number
  category: Category
  /** ISO timestamp (Asia/Manila). */
  timestamp: string
  counterparty?: string
  reference?: string
  /** Balance reported inside the message, if any. */
  balanceReported?: number
  /** 0..1 parsing confidence. */
  confidence: number
  /** Raw message kept locally for audit; masked in the UI. */
  rawMessage: string
  /** True when the user manually excluded it from all totals & balance. */
  excluded?: boolean
  /** True when this leg is part of an internal own-account transfer. */
  isTransfer?: boolean
  transferGroupId?: string
  needsReview?: boolean
  note?: string
  /** Source of the record, for the audit trail. */
  source?: 'seed' | 'sms' | 'manual' | 'shortcut'
}

export interface Bill {
  id: string
  name: string
  amount: number
  /** Day of month (1-31) the bill is due. */
  dueDay: number
  account?: AccountId
  category: Category
}

export interface Goal {
  id: string
  name: string
  emoji: string
  target: number
  saved: number
  targetDate?: string
  priority: Priority
  paused?: boolean
  frequency: ContributionFrequency
  contributionType: 'fixed' | 'percent'
  /** Peso amount when fixed, percent (0-100) of income when percent. */
  contributionValue: number
  isEmergency?: boolean
}

export interface MoneyInRule {
  id: string
  label: string
  /** Applies to salary deposits or to any other money-in. */
  appliesTo: 'salary' | 'other'
  percent: number
  /** Only applies when the incoming amount is above this threshold. */
  minAmount: number
  enabled: boolean
}

export interface CategoryLimit {
  category: Category
  limit: number
  period: 'weekly' | 'monthly'
}

export interface Settings {
  onboarded: boolean
  theme: ThemePref
  income: {
    amount: number
    nextDate: string // ISO date
    frequency: IncomeFrequency
  }
  /** Emergency fund floor that Safe-to-Spend must protect. */
  emergencyBuffer: number
  /** Minimum balance to always keep untouched. */
  minProtectedBalance: number
  /** Discretionary safety cushion chosen by the user. */
  safetyBuffer: number
  transferWindowMinutes: number
  transferAmountTolerance: number
  rollover: 'carry' | 'reset'
  moneyInRules: MoneyInRule[]
  categoryLimits: CategoryLimit[]
  // Security & privacy
  faceIdLock: boolean
  notificationPrivacy: NotificationPrivacy
  maskAccountNumbers: boolean
}

export interface ParseRule {
  id: string
  label: string
  /** Institution this rule targets. */
  account: AccountId | 'any'
  /** Substring that must appear in the message for the rule to apply. */
  match: string
  category: Category
  enabled: boolean
  /** Created from a user correction. */
  learned?: boolean
}

export interface AppState {
  version: number
  accounts: Record<AccountId, Account>
  transactions: Transaction[]
  bills: Bill[]
  goals: Goal[]
  settings: Settings
  parseRules: ParseRule[]
  automation: {
    bpiConnected: boolean
    gcashConnected: boolean
    lastImport?: string
  }
}

// ---------------------------------------------------------------------------
// Parser output
// ---------------------------------------------------------------------------

export interface ParsedMessage {
  institution: AccountId | 'unknown'
  direction: ParsedDirection
  amount: number | null
  timestamp: string | null
  last4: string | null
  counterparty: string | null
  reference: string | null
  balance: number | null
  category: Category
  confidence: number
  notes: string[]
  raw: string
}
