import { useState } from 'react'
import { useApp } from '../state/store'
import { ScreenShell, PageHeader } from '../components/Screen'
import { Card, SectionTitle, Button, Toggle, AccountBadge } from '../components/ui'
import { parseMessage } from '../lib/parser'
import { SAMPLE_MESSAGES } from '../lib/seed'
import { peso, fmtDateTime } from '../lib/format'
import { uid } from '../lib/storage'
import type { AccountId, Transaction } from '../types'

const STEPS = [
  { icon: '📲', title: 'Open the Shortcuts app', body: 'It comes built-in on iPhone. Go to the Automation tab.' },
  { icon: '➕', title: 'Create a Personal Automation', body: 'Tap + then “Create Personal Automation”.' },
  { icon: '✉️', title: 'Choose the “Message” trigger', body: 'Select “Message Contains” and set the sender to BPI or GCash.' },
  { icon: '🔗', title: 'Add the “Get Message” + SpendSense action', body: 'Pass the message text, sender and timestamp into the SpendSense PH App Intent.' },
  { icon: '⚡', title: 'Turn on “Run Immediately”', body: 'Where supported, allow it to run without asking so imports are hands-free.' },
  { icon: '🧪', title: 'Send a test transaction', body: 'Trigger it once to confirm parsing works end-to-end.' },
  { icon: '🔒', title: 'Confirm: no OTP or login', body: 'SpendSense never reads OTPs or asks for your online-banking credentials.' },
]

export function Automation() {
  const { state, mutate, addTransaction, notify } = useApp()
  const a = state.automation

  function connect(id: AccountId, on: boolean) {
    mutate((s) => ({ ...s, automation: { ...s.automation, [id === 'bpi' ? 'bpiConnected' : 'gcashConnected']: on } }))
  }

  function runTest(id: AccountId) {
    const sample = SAMPLE_MESSAGES.find((m) => m.text.toLowerCase().includes(id))!
    const parsed = parseMessage(sample.text, new Date().toISOString(), state.parseRules)
    const tx: Transaction = {
      id: uid('tx'),
      account: id,
      direction: parsed.direction === 'in' ? 'in' : parsed.direction === 'fee' ? 'fee' : 'out',
      amount: parsed.amount ?? 0,
      category: parsed.category,
      timestamp: parsed.timestamp ?? new Date().toISOString(),
      counterparty: parsed.counterparty ?? undefined,
      reference: parsed.reference ?? undefined,
      confidence: parsed.confidence,
      rawMessage: parsed.raw,
      needsReview: parsed.confidence < 0.5,
      source: 'shortcut',
    }
    addTransaction(tx)
    mutate((s) => ({ ...s, automation: { ...s.automation, lastImport: new Date().toISOString() } }))
    notify({
      title: `${peso(tx.amount)} ${tx.direction === 'in' ? 'came in' : 'went out'} • ${id.toUpperCase()}`,
      body: 'Imported automatically via your Shortcut (simulated).',
      tone: 'good',
    })
  }

  return (
    <ScreenShell>
      <PageHeader title="Automation" subtitle="Apple Shortcuts import" />

      <div className="rounded-2xl bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-200 px-4 py-3 text-[13px] font-medium mb-4">
        🧪 Simulation. This prototype mimics the Shortcuts flow. iOS apps cannot silently read your whole Messages inbox; a
        real build would receive each message only when your Shortcut hands it over.
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {(['bpi', 'gcash'] as AccountId[]).map((id) => {
          const connected = id === 'bpi' ? a.bpiConnected : a.gcashConnected
          return (
            <Card key={id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <AccountBadge id={id} />
                <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
              </div>
              <p className={`text-[15px] font-bold ${connected ? 'text-emerald-600' : 'text-slate-500'}`}>
                {connected ? 'Connected' : 'Not connected'}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[12px] text-slate-500">Automation</span>
                <Toggle on={connected} onChange={(v) => connect(id, v)} />
              </div>
              <Button size="sm" variant="soft" className="w-full mt-3" onClick={() => runTest(id)}>
                Test import
              </Button>
            </Card>
          )
        })}
      </div>

      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-slate-500">Last successful import</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100">{a.lastImport ? fmtDateTime(a.lastImport) : 'Never'}</span>
        </div>
      </Card>

      {/* Setup guide */}
      <SectionTitle>Set it up (mock guide)</SectionTitle>
      <Card className="p-2 mb-4">
        {STEPS.map((step, i) => (
          <div key={i} className="flex gap-3 px-3 py-3 border-b last:border-0 border-slate-100 dark:border-slate-800">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 text-lg">{step.icon}</span>
            <div>
              <p className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">
                {i + 1}. {step.title}
              </p>
              <p className="text-[13px] text-slate-500 leading-snug">{step.body}</p>
            </div>
          </div>
        ))}
      </Card>

      {/* Troubleshooting */}
      <SectionTitle>Troubleshooting</SectionTitle>
      <Card className="p-4 mb-6 space-y-2 text-[13px] text-slate-600 dark:text-slate-300">
        <Trouble q="Nothing imported after a message" a="Open Shortcuts → Automation and confirm the automation is enabled and set to run immediately." />
        <Trouble q="It asks before running" a="Some iOS versions require a tap. Turn off “Ask Before Running” if your version allows it." />
        <Trouble q="Wrong account detected" a="Edit the transaction in Activity. SpendSense can learn a rule from your correction." />
        <Trouble q="It wants my OTP or password" a="It never will. SpendSense only reads the notification text you pass it. Never forward OTPs to any app." />
      </Card>
    </ScreenShell>
  )
}

function Trouble({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button onClick={() => setOpen((o) => !o)} className="w-full text-left">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-800 dark:text-slate-100">{q}</span>
        <span className="text-slate-400">{open ? '−' : '+'}</span>
      </div>
      {open && <p className="mt-1 text-slate-500">{a}</p>}
    </button>
  )
}
