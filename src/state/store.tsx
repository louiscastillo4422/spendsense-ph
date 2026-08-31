import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppState, Bill, Goal, ParseRule, Settings, Transaction, AccountId } from '../types'
import { clearState, loadState, saveState, uid } from '../lib/storage'
import { makeSeedState } from '../lib/seed'

export interface Toast {
  id: string
  title: string
  body?: string
  tone?: 'default' | 'good' | 'warn' | 'bad'
}

interface Store {
  state: AppState
  /** Functional update; persistence happens automatically. */
  mutate: (fn: (s: AppState) => AppState) => void

  // Transactions
  addTransaction: (t: Transaction) => void
  updateTransaction: (id: string, patch: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  confirmTransfer: (outId: string, inId: string) => void

  // Goals
  upsertGoal: (g: Goal) => void
  deleteGoal: (id: string) => void
  reorderGoals: (ids: string[]) => void

  // Bills
  upsertBill: (b: Bill) => void
  deleteBill: (id: string) => void

  // Settings & accounts
  patchSettings: (patch: Partial<Settings>) => void
  reconcileAccount: (id: AccountId, balance: number) => void

  // Parse rules
  upsertRule: (r: ParseRule) => void
  deleteRule: (id: string) => void

  // Data lifecycle
  resetToSample: () => void
  wipeAll: () => void
  /** Replace all state with a validated backup (from Security > Import). */
  importData: (next: AppState) => void

  // Toasts (used for simulated notifications)
  toasts: Toast[]
  notify: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
}

const Ctx = createContext<Store | null>(null)

function emptyState(): AppState {
  const seed = makeSeedState()
  return {
    ...seed,
    accounts: {
      bpi: { id: 'bpi', name: 'BPI', startingBalance: 0, reconciledAt: new Date().toISOString() },
      gcash: { id: 'gcash', name: 'GCash', startingBalance: 0, reconciledAt: new Date().toISOString() },
    },
    transactions: [],
    bills: [],
    goals: [],
    parseRules: seed.parseRules,
    settings: { ...seed.settings, onboarded: false, income: { amount: 0, nextDate: '', frequency: 'semimonthly' } },
    automation: { bpiConnected: false, gcashConnected: false },
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState())
  const [toasts, setToasts] = useState<Toast[]>([])
  const first = useRef(true)

  // Persist on every change (skip the very first render which already loaded).
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    saveState(state)
  }, [state])

  // Apply theme to <html>.
  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const pref = state.settings.theme
      const dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      root.classList.toggle('dark', dark)
    }
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [state.settings.theme])

  const store = useMemo<Store>(() => {
    const mutate = (fn: (s: AppState) => AppState) => setState((s) => fn(s))

    const notify: Store['notify'] = (t) => {
      const toast = { ...t, id: uid('toast') }
      setToasts((list) => [...list, toast])
      window.setTimeout(() => setToasts((list) => list.filter((x) => x.id !== toast.id)), 6500)
    }

    return {
      state,
      mutate,
      addTransaction: (t) => mutate((s) => ({ ...s, transactions: [t, ...s.transactions] })),
      updateTransaction: (id, patch) =>
        mutate((s) => ({ ...s, transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteTransaction: (id) => mutate((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) })),
      confirmTransfer: (outId, inId) =>
        mutate((s) => {
          const gid = uid('tg')
          return {
            ...s,
            transactions: s.transactions.map((t) =>
              t.id === outId || t.id === inId
                ? { ...t, isTransfer: true, transferGroupId: gid, category: 'transfer' as const }
                : t,
            ),
          }
        }),
      upsertGoal: (g) =>
        mutate((s) => {
          const exists = s.goals.some((x) => x.id === g.id)
          return { ...s, goals: exists ? s.goals.map((x) => (x.id === g.id ? g : x)) : [...s.goals, g] }
        }),
      deleteGoal: (id) => mutate((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) })),
      reorderGoals: (ids) =>
        mutate((s) => ({ ...s, goals: ids.map((id) => s.goals.find((g) => g.id === id)!).filter(Boolean) })),
      upsertBill: (b) =>
        mutate((s) => {
          const exists = s.bills.some((x) => x.id === b.id)
          return { ...s, bills: exists ? s.bills.map((x) => (x.id === b.id ? b : x)) : [...s.bills, b] }
        }),
      deleteBill: (id) => mutate((s) => ({ ...s, bills: s.bills.filter((b) => b.id !== id) })),
      patchSettings: (patch) => mutate((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      reconcileAccount: (id, balance) =>
        mutate((s) => ({
          ...s,
          accounts: { ...s.accounts, [id]: { ...s.accounts[id], startingBalance: balance, reconciledAt: new Date().toISOString() } },
        })),
      upsertRule: (r) =>
        mutate((s) => {
          const exists = s.parseRules.some((x) => x.id === r.id)
          return { ...s, parseRules: exists ? s.parseRules.map((x) => (x.id === r.id ? r : x)) : [...s.parseRules, r] }
        }),
      deleteRule: (id) => mutate((s) => ({ ...s, parseRules: s.parseRules.filter((r) => r.id !== id) })),
      resetToSample: () => setState(makeSeedState()),
      importData: (next) => setState(next),
      wipeAll: () => {
        clearState()
        setState(emptyState())
      },
      toasts,
      notify,
      dismissToast: (id) => setToasts((list) => list.filter((x) => x.id !== id)),
    }
  }, [state, toasts])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useApp(): Store {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used within StoreProvider')
  return ctx
}
