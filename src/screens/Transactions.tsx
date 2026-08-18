import { useMemo, useState } from 'react'
import { useApp } from '../state/store'
import { ScreenShell, PageHeader, EmptyState } from '../components/Screen'
import {
  Card,
  Button,
  Sheet,
  Field,
  Select,
  Toggle,
  TextInput,
  PesoInput,
  CategoryIcon,
  AccountBadge,
  ConfidenceBadge,
  CATEGORY_META,
} from '../components/ui'
import { maskMessage } from '../lib/parser'
import { detectTransfers } from '../lib/transfers'
import { peso, fmtDateTime } from '../lib/format'
import type { Category, Transaction } from '../types'
import { uid } from '../lib/storage'

type Filter = 'all' | 'in' | 'out' | 'transfer' | 'review' | 'bpi' | 'gcash'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in', label: 'Money in' },
  { key: 'out', label: 'Money out' },
  { key: 'transfer', label: 'Transfers' },
  { key: 'review', label: 'Needs review' },
  { key: 'bpi', label: 'BPI' },
  { key: 'gcash', label: 'GCash' },
]

export function Transactions() {
  const { state, confirmTransfer, notify } = useApp()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Transaction | null>(null)

  const transfers = useMemo(() => detectTransfers(state), [state])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...state.transactions]
      .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
      .filter((t) => {
        if (filter === 'in') return t.direction === 'in' && !t.isTransfer
        if (filter === 'out') return t.direction !== 'in' && !t.isTransfer
        if (filter === 'transfer') return !!t.isTransfer
        if (filter === 'review') return !!t.needsReview
        if (filter === 'bpi') return t.account === 'bpi'
        if (filter === 'gcash') return t.account === 'gcash'
        return true
      })
      .filter((t) => {
        if (!q) return true
        return (
          (t.counterparty ?? '').toLowerCase().includes(q) ||
          (t.reference ?? '').toLowerCase().includes(q) ||
          t.rawMessage.toLowerCase().includes(q) ||
          CATEGORY_META[t.category].label.toLowerCase().includes(q)
        )
      })
  }, [state.transactions, filter, query])

  return (
    <ScreenShell>
      <PageHeader title="Activity" subtitle={`${state.transactions.length} transactions`} />

      <TextInput placeholder="Search merchant, reference, note…" value={query} onChange={(e) => setQuery(e.target.value)} className="mb-3" />

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-3 -mx-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
              filter === f.key
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}
          >
            {f.label}
            {f.key === 'review' && state.transactions.some((t) => t.needsReview) ? ' •' : ''}
          </button>
        ))}
      </div>

      {/* Transfer suggestion banner */}
      {transfers.map((m) => (
        <Card key={m.outgoing.id + m.incoming.id} className="p-4 mb-3 border-amber-300/70 dark:border-amber-500/30">
          <p className="text-[14px] font-semibold text-slate-900 dark:text-white mb-1">↔️ Same money moved between your accounts?</p>
          <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-snug">
            Is this the same {peso(m.outgoing.amount)} transfer from {m.outgoing.account.toUpperCase()} to{' '}
            {m.incoming.account.toUpperCase()} ({m.minutesApart} min apart)? If so, we’ll keep it out of income & spending
            totals (any fee still counts).
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => {
                confirmTransfer(m.outgoing.id, m.incoming.id)
                notify({ title: 'Marked as internal transfer', body: 'Excluded from income & spending.', tone: 'good' })
              }}
            >
              Yes, it’s a transfer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(m.outgoing)}>
              Review
            </Button>
          </div>
        </Card>
      ))}

      {list.length === 0 ? (
        <EmptyState
          emoji="🧾"
          title="Nothing here yet"
          body="Import a message from the Test SMS Lab, or change your filters."
        />
      ) : (
        <Card className="p-1.5">
          {list.map((t) => (
            <TxRow key={t.id} t={t} onClick={() => setEditing(t)} hide={state.settings.notificationPrivacy === 'hideBalances'} />
          ))}
        </Card>
      )}

      {editing && <EditSheet tx={editing} onClose={() => setEditing(null)} />}
    </ScreenShell>
  )
}

function TxRow({ t, onClick, hide }: { t: Transaction; onClick: () => void; hide: boolean }) {
  const isIn = t.direction === 'in'
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-2 py-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition text-left">
      <CategoryIcon category={t.category} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 truncate">
            {t.counterparty ?? CATEGORY_META[t.category].label}
          </p>
          <AccountBadge id={t.account} />
          {t.isTransfer && <span className="text-[10px] font-bold text-slate-400">TRANSFER</span>}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[12px] text-slate-400 truncate">{fmtDateTime(t.timestamp)}</p>
          {t.needsReview && <span className="text-[11px] font-semibold text-amber-600">Needs review</span>}
          {t.excluded && <span className="text-[11px] font-semibold text-slate-400">Excluded</span>}
        </div>
      </div>
      <div className="text-right">
        <p className={`text-[15px] font-bold tabular-nums ${t.excluded ? 'text-slate-400 line-through' : isIn ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
          {isIn ? '+' : '−'}
          {peso(t.amount, { hide })}
        </p>
        <ConfidenceBadge value={t.confidence} />
      </div>
    </button>
  )
}

function EditSheet({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const { updateTransaction, deleteTransaction, upsertRule, state, notify } = useApp()
  const [draft, setDraft] = useState<Transaction>(tx)
  const [offerRule, setOfferRule] = useState(false)

  function setField<K extends keyof Transaction>(k: K, v: Transaction[K]) {
    setDraft((d) => ({ ...d, [k]: v }))
  }

  function save() {
    const patch: Partial<Transaction> = { ...draft, needsReview: false }
    updateTransaction(tx.id, patch)
    // Simulated learning: if category changed and we can key off a merchant, offer a rule.
    if (draft.category !== tx.category && (draft.counterparty || tx.counterparty)) {
      setOfferRule(true)
      return
    }
    onClose()
  }

  function createRule() {
    const key = (draft.counterparty ?? '').split(' ')[0].toLowerCase()
    if (key) {
      upsertRule({
        id: uid('pr'),
        label: `${draft.counterparty} → ${CATEGORY_META[draft.category].label}`,
        account: 'any',
        match: key,
        category: draft.category,
        enabled: true,
        learned: true,
      })
      notify({ title: 'Learned a new rule', body: `Future “${draft.counterparty}” messages → ${CATEGORY_META[draft.category].label}.`, tone: 'good' })
    }
    onClose()
  }

  const catOptions = (Object.keys(CATEGORY_META) as Category[]).map((c) => ({ value: c, label: `${CATEGORY_META[c].emoji} ${CATEGORY_META[c].label}` }))

  if (offerRule) {
    return (
      <Sheet title="Remember this?" onClose={onClose}>
        <p className="text-[15px] text-slate-700 dark:text-slate-200 leading-snug mb-4">
          You changed this to <b>{CATEGORY_META[draft.category].label}</b>. Want SpendSense to categorise future messages from{' '}
          <b>{draft.counterparty}</b> the same way automatically? You can edit or delete the rule anytime in Budget &amp; Rules.
        </p>
        <div className="flex gap-2">
          <Button onClick={createRule}>Yes, create rule</Button>
          <Button variant="ghost" onClick={onClose}>
            No thanks
          </Button>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet title="Edit transaction" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount">
            <PesoInput value={draft.amount} onChange={(n) => setField('amount', n)} />
          </Field>
          <Field label="Direction">
            <Select
              value={draft.direction}
              onChange={(v) => setField('direction', v)}
              options={[
                { value: 'in', label: 'Money in' },
                { value: 'out', label: 'Money out' },
                { value: 'fee', label: 'Fee' },
              ]}
            />
          </Field>
        </div>

        <Field label="Category">
          <Select value={draft.category} onChange={(v) => setField('category', v)} options={catOptions} />
        </Field>

        <Field label="Merchant / sender / recipient">
          <TextInput value={draft.counterparty ?? ''} onChange={(e) => setField('counterparty', e.target.value)} placeholder="e.g. Jollibee" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Account">
            <Select
              value={draft.account}
              onChange={(v) => setField('account', v)}
              options={[
                { value: 'bpi', label: 'BPI' },
                { value: 'gcash', label: 'GCash' },
              ]}
            />
          </Field>
          <Field label="Reference">
            <TextInput value={draft.reference ?? ''} onChange={(e) => setField('reference', e.target.value)} placeholder="None" />
          </Field>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-slate-100 dark:bg-slate-900 px-4 py-3">
          <div>
            <p className="text-[14px] font-medium text-slate-800 dark:text-slate-100">Exclude from totals</p>
            <p className="text-[12px] text-slate-500">Hide from balance, income & spending.</p>
          </div>
          <Toggle on={!!draft.excluded} onChange={(v) => setField('excluded', v)} />
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-slate-100 dark:bg-slate-900 px-4 py-3">
          <div>
            <p className="text-[14px] font-medium text-slate-800 dark:text-slate-100">Internal transfer</p>
            <p className="text-[12px] text-slate-500">Own-account move, not income/spending.</p>
          </div>
          <Toggle on={!!draft.isTransfer} onChange={(v) => setField('isTransfer', v)} />
        </div>

        {/* Original message with masking */}
        <div>
          <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300 mb-1">Original message (sensitive numbers masked)</p>
          <div className="rounded-2xl bg-slate-100 dark:bg-slate-900 p-3.5 text-[13px] text-slate-600 dark:text-slate-300 leading-snug">
            {maskMessage(draft.rawMessage)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Parsed {Math.round(draft.confidence * 100)}% confident · kept on-device only.</p>
        </div>

        <div className="flex gap-2 pt-1">
          <Button onClick={save} className="flex-1">
            Save changes
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              deleteTransaction(tx.id)
              onClose()
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
