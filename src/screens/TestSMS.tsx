import { useState } from 'react'
import { useApp } from '../state/store'
import { ScreenShell, PageHeader } from '../components/Screen'
import { Card, SectionTitle, Button, Field, Select, TextArea, PesoInput, TextInput, ConfidenceBadge, AccountBadge, CATEGORY_META } from '../components/ui'
import { parseMessage, maskMessage } from '../lib/parser'
import { findDuplicate } from '../lib/transfers'
import { computeSafeToSpend, saveNowRecommendation } from '../lib/calc'
import { SAMPLE_MESSAGES } from '../lib/seed'
import { peso, fmtDateTime } from '../lib/format'
import { uid } from '../lib/storage'
import type { AccountId, Category, Direction, ParsedMessage, Transaction } from '../types'

export function TestSMS() {
  const { state, addTransaction, notify } = useApp()
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParsedMessage | null>(null)
  const [draft, setDraft] = useState<Partial<Transaction> | null>(null)
  const [dupWarning, setDupWarning] = useState<Transaction | null>(null)

  function run(sample?: string) {
    const input = sample ?? text
    if (!input.trim()) return
    if (sample) setText(sample)
    const p = parseMessage(input, new Date().toISOString(), state.parseRules)
    setParsed(p)
    setDraft({
      account: p.institution === 'unknown' ? 'bpi' : p.institution,
      direction: p.direction === 'in' ? 'in' : p.direction === 'fee' ? 'fee' : 'out',
      amount: p.amount ?? 0,
      category: p.category,
      counterparty: p.counterparty ?? undefined,
      reference: p.reference ?? undefined,
      timestamp: p.timestamp ?? new Date().toISOString(),
      isTransfer: p.direction === 'transfer',
    })
    setDupWarning(null)
  }

  function importTx(force = false) {
    if (!draft || !parsed) return
    const tx: Transaction = {
      id: uid('tx'),
      account: (draft.account as AccountId) ?? 'bpi',
      direction: (draft.direction as Direction) ?? 'out',
      amount: draft.amount ?? 0,
      category: (draft.category as Category) ?? 'other',
      timestamp: draft.timestamp ?? new Date().toISOString(),
      counterparty: draft.counterparty,
      reference: draft.reference,
      confidence: parsed.confidence,
      rawMessage: parsed.raw,
      balanceReported: parsed.balance ?? undefined,
      isTransfer: draft.isTransfer,
      needsReview: parsed.confidence < 0.5,
      source: 'sms',
    }

    if (!force) {
      const dup = findDuplicate(state, tx)
      if (dup) {
        setDupWarning(dup)
        return
      }
    }

    addTransaction(tx)

    // Friendly notification with updated Safe-to-Spend.
    const after = computeSafeToSpend({ ...state, transactions: [tx, ...state.transactions] })
    if (tx.direction === 'in' && !tx.isTransfer) {
      const rec = saveNowRecommendation({ ...state, transactions: [tx, ...state.transactions] }, tx)
      notify({
        title: `${peso(tx.amount)} came into ${tx.account.toUpperCase()}`,
        body: rec.amount > 0 && rec.goal ? `Suggested: save ${peso(rec.amount)} toward ${rec.goal.name}.` : rec.reason,
        tone: 'good',
      })
    } else if (tx.isTransfer) {
      notify({ title: `Transfer detected • ${tx.account.toUpperCase()}`, body: 'Marked as an internal move, not counted as income or spending.', tone: 'default' })
    } else {
      notify({
        title: `${peso(tx.amount)} went out from ${tx.account.toUpperCase()} • ${CATEGORY_META[tx.category].label}`,
        body: `About ${peso(after.safe)} remains safe to spend until payday.`,
        tone: 'warn',
      })
    }

    setParsed(null)
    setDraft(null)
    setText('')
    setDupWarning(null)
  }

  return (
    <ScreenShell>
      <PageHeader title="Test SMS Lab" subtitle="Paste or pick a message → parse → import" />

      <div className="rounded-2xl bg-slate-100 dark:bg-slate-900 px-4 py-3 text-[13px] text-slate-500 mb-4">
        All parsing happens <b>locally</b>. Nothing is sent to a server or AI. Sample messages are fictional, with no real account numbers.
      </div>

      <SectionTitle>Try a sample</SectionTitle>
      <div className="flex flex-wrap gap-2 mb-4">
        {SAMPLE_MESSAGES.map((m) => (
          <button
            key={m.label}
            onClick={() => run(m.text)}
            className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300"
          >
            {m.label}
          </button>
        ))}
      </div>

      <SectionTitle>Or paste a message</SectionTitle>
      <TextArea placeholder="Paste a BPI or GCash notification here…" value={text} onChange={(e) => setText(e.target.value)} />
      <Button className="w-full mt-2 mb-4" onClick={() => run()} disabled={!text.trim()}>
        Parse message
      </Button>

      {parsed && draft && (
        <>
          <SectionTitle>Parsed result. Check it before importing</SectionTitle>
          <Card className="p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {parsed.institution !== 'unknown' ? <AccountBadge id={parsed.institution} /> : <span className="text-[12px] font-semibold text-amber-600">Unknown bank</span>}
                <span className="text-[13px] text-slate-500">Parsed</span>
              </div>
              <ConfidenceBadge value={parsed.confidence} />
            </div>

            {parsed.notes.length > 0 && (
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 p-3 mb-3 text-[13px] text-amber-700 dark:text-amber-300">
                {parsed.notes.map((n, i) => (
                  <p key={i}>• {n}</p>
                ))}
                <p className="mt-1 font-medium">We won’t invent missing details, so please check the fields below.</p>
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount">
                  <PesoInput value={draft.amount ?? 0} onChange={(n) => setDraft({ ...draft, amount: n })} />
                </Field>
                <Field label="Direction">
                  <Select
                    value={(draft.direction as Direction) ?? 'out'}
                    onChange={(v) => setDraft({ ...draft, direction: v })}
                    options={[
                      { value: 'in', label: 'Money in' },
                      { value: 'out', label: 'Money out' },
                      { value: 'fee', label: 'Fee' },
                    ]}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Account">
                  <Select
                    value={(draft.account as AccountId) ?? 'bpi'}
                    onChange={(v) => setDraft({ ...draft, account: v })}
                    options={[
                      { value: 'bpi', label: 'BPI' },
                      { value: 'gcash', label: 'GCash' },
                    ]}
                  />
                </Field>
                <Field label="Category">
                  <Select
                    value={(draft.category as Category) ?? 'other'}
                    onChange={(v) => setDraft({ ...draft, category: v })}
                    options={(Object.keys(CATEGORY_META) as Category[]).map((c) => ({ value: c, label: `${CATEGORY_META[c].emoji} ${CATEGORY_META[c].label}` }))}
                  />
                </Field>
              </div>
              <Field label="Merchant / sender / recipient">
                <TextInput value={draft.counterparty ?? ''} onChange={(e) => setDraft({ ...draft, counterparty: e.target.value })} placeholder="Not detected" />
              </Field>

              <div className="grid grid-cols-3 gap-2 text-[12px]">
                <Extract label="Ref no." value={parsed.reference ?? 'None'} />
                <Extract label="Acct ••••" value={parsed.last4 ?? 'None'} />
                <Extract label="Balance" value={parsed.balance !== null ? peso(parsed.balance) : 'None'} />
              </div>

              <div>
                <p className="text-[12px] text-slate-400 mb-1">Original (masked)</p>
                <div className="rounded-2xl bg-slate-100 dark:bg-slate-900 p-3 text-[12px] text-slate-500 leading-snug">{maskMessage(parsed.raw)}</div>
              </div>
            </div>

            {dupWarning && (
              <div className="rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-3 mt-3 text-[13px] text-red-700 dark:text-red-300">
                Looks like a duplicate of a {peso(dupWarning.amount)} transaction on {fmtDateTime(dupWarning.timestamp)}. Import anyway?
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="danger" onClick={() => importTx(true)}>
                    Import anyway
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDupWarning(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!dupWarning && (
              <Button className="w-full mt-4" onClick={() => importTx()}>
                Import transaction
              </Button>
            )}
          </Card>
        </>
      )}
    </ScreenShell>
  )
}

function Extract({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-900 px-3 py-2">
      <p className="text-slate-400">{label}</p>
      <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{value}</p>
    </div>
  )
}
