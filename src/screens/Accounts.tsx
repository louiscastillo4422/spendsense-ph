import { useState } from 'react'
import { useApp } from '../state/store'
import { ScreenShell, PageHeader } from '../components/Screen'
import { Card, Button, Sheet, Field, PesoInput, AccountBadge, DirectionAmount } from '../components/ui'
import { accountBalance, monthFlow, lastTransaction } from '../lib/calc'
import { peso, fmtDate, fmtDateTime, relativeDays, daysBetween } from '../lib/format'
import type { AccountId } from '../types'

export function Accounts() {
  const { state } = useApp()
  const [reconciling, setReconciling] = useState<AccountId | null>(null)

  return (
    <ScreenShell>
      <PageHeader title="Accounts" subtitle="Estimated balances from your starting point + imported messages" />

      {(['bpi', 'gcash'] as AccountId[]).map((id) => (
        <AccountCard key={id} id={id} onReconcile={() => setReconciling(id)} />
      ))}

      <div className="rounded-2xl bg-slate-100/70 dark:bg-slate-900 p-4 text-[13px] text-slate-500 dark:text-slate-400 mt-2">
        Balances are <b>estimates</b>. Transaction messages don’t always include a running balance, so reconcile whenever you
        check your real balance in the bank/wallet app. Reconciling sets a fresh starting point and keeps your history.
      </div>

      {reconciling && <ReconcileSheet id={reconciling} onClose={() => setReconciling(null)} />}
    </ScreenShell>
  )
}

function AccountCard({ id, onReconcile }: { id: AccountId; onReconcile: () => void }) {
  const { state } = useApp()
  const acct = state.accounts[id]
  const balance = accountBalance(state, id)
  const flow = monthFlow(state, id)
  const last = lastTransaction(state, id)
  const hide = state.settings.notificationPrivacy === 'hideBalances'
  const stale = daysBetween(new Date(acct.reconciledAt), new Date()) > 14
  const accent = id === 'bpi' ? 'from-bpi/10' : 'from-gcash/10'

  return (
    <Card className={`bg-gradient-to-br ${accent} to-transparent p-5 mb-4`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AccountBadge id={id} />
          <span className="text-[15px] font-bold text-slate-900 dark:text-white">{acct.name}</span>
        </div>
        <span className={`text-[11px] font-semibold ${stale ? 'text-amber-600' : 'text-emerald-600'}`}>
          {stale ? '⚠ Reconcile soon' : '✓ Recently reconciled'}
        </span>
      </div>

      <p className="text-[13px] text-slate-500">Estimated balance</p>
      <p className="text-[32px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">{peso(balance, { hide })}</p>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="rounded-2xl bg-white/60 dark:bg-slate-950/40 px-3 py-2.5 border border-slate-200/50 dark:border-slate-800">
          <p className="text-[12px] text-slate-500">In this month</p>
          <p className="text-[16px] font-bold text-emerald-600">+{peso(flow.in, { hide })}</p>
        </div>
        <div className="rounded-2xl bg-white/60 dark:bg-slate-950/40 px-3 py-2.5 border border-slate-200/50 dark:border-slate-800">
          <p className="text-[12px] text-slate-500">Out this month</p>
          <p className="text-[16px] font-bold text-slate-900 dark:text-white">−{peso(flow.out, { hide })}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-[13px]">
        <span className="text-slate-500">Last transaction</span>
        <span className="text-slate-700 dark:text-slate-200 font-medium">
          {last ? (
            <span className="inline-flex items-center gap-2">
              {last.counterparty ?? 'Transaction'} <DirectionAmount direction={last.direction} amount={last.amount} hide={hide} />
            </span>
          ) : (
            'None yet'
          )}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[13px]">
        <span className="text-slate-500">Last reconciled</span>
        <span className="text-slate-700 dark:text-slate-200 font-medium">
          {fmtDate(acct.reconciledAt)} ({relativeDays(acct.reconciledAt)})
        </span>
      </div>

      <Button className="mt-4 w-full" variant="soft" onClick={onReconcile}>
        Edit / reconcile balance
      </Button>
    </Card>
  )
}

function ReconcileSheet({ id, onClose }: { id: AccountId; onClose: () => void }) {
  const { state, reconcileAccount, notify } = useApp()
  const current = accountBalance(state, id)
  const [value, setValue] = useState(Math.round(current))

  function save() {
    reconcileAccount(id, value)
    notify({ title: `${state.accounts[id].name} balance updated`, body: `New starting point: ${peso(value)}`, tone: 'good' })
    onClose()
  }

  return (
    <Sheet title={`Reconcile ${state.accounts[id].name}`} onClose={onClose}>
      <p className="text-[14px] text-slate-600 dark:text-slate-300 mb-4">
        Open your real {state.accounts[id].name} app, check the actual balance, and enter it here. We’ll use this as the new
        starting point. <b>Past transactions are kept</b> for your records.
      </p>
      <Field label="Actual balance right now">
        <PesoInput value={value} onChange={setValue} />
      </Field>
      <div className="mt-3 rounded-2xl bg-slate-100 dark:bg-slate-900 p-3.5 text-[13px] text-slate-500">
        <div className="flex justify-between">
          <span>Current estimate</span>
          <span className="font-semibold">{peso(current)}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Difference</span>
          <span className={`font-semibold ${value - current < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
            {peso(value - current, { sign: true })}
          </span>
        </div>
      </div>
      <Button className="mt-4 w-full" onClick={save}>
        Save new balance
      </Button>
    </Sheet>
  )
}
