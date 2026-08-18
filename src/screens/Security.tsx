import { useState, type ReactNode } from 'react'
import { useApp } from '../state/store'
import { ScreenShell, PageHeader } from '../components/Screen'
import { Card, SectionTitle, Button, Toggle, Segmented, Sheet } from '../components/ui'
import { exportState } from '../lib/storage'
import type { NotificationPrivacy } from '../types'

export function Security() {
  const { state, patchSettings, wipeAll, notify } = useApp()
  const s = state.settings
  const [confirmWipe, setConfirmWipe] = useState(false)

  const previews: Record<NotificationPrivacy, string> = {
    full: '₱1,250 went out from BPI • Food. About ₱3,400 safe to spend until Aug 15.',
    hideBalances: '₱1,250 went out from BPI • Food.',
    generic: 'New transaction imported. Open SpendSense to view.',
  }

  return (
    <ScreenShell>
      <PageHeader title="Security & Privacy" subtitle="Everything stays on your device" />

      <SectionTitle>App lock</SectionTitle>
      <Card className="p-4 mb-4">
        <Row
          title="Require Face ID to open"
          sub="Locks the app behind biometrics (simulated in the prototype)."
          control={<Toggle on={s.faceIdLock} onChange={(v) => patchSettings({ faceIdLock: v })} />}
        />
      </Card>

      <SectionTitle>Notifications</SectionTitle>
      <Card className="p-4 mb-4">
        <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300 mb-2">Lock-screen detail</p>
        <Segmented<NotificationPrivacy>
          value={s.notificationPrivacy}
          onChange={(v) => patchSettings({ notificationPrivacy: v })}
          options={[
            { value: 'full', label: 'Full' },
            { value: 'hideBalances', label: 'Hide ₱' },
            { value: 'generic', label: 'Generic' },
          ]}
        />
        <div className="mt-3 rounded-2xl bg-slate-100 dark:bg-slate-900 p-3.5">
          <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Preview</p>
          <p className="text-[13px] text-slate-700 dark:text-slate-200">{previews[s.notificationPrivacy]}</p>
        </div>
      </Card>

      <SectionTitle>Privacy</SectionTitle>
      <Card className="p-4 mb-4 space-y-3">
        <Row
          title="Mask account numbers"
          sub="Only the last 4 digits are ever shown."
          control={<Toggle on={s.maskAccountNumbers} onChange={(v) => patchSettings({ maskAccountNumbers: v })} />}
        />
        <Bullet text="Raw messages are stored locally for your audit trail and masked everywhere in the interface." />
        <Bullet text="No message is ever sent to a server or AI API. Parsing is 100% on-device." />
        <Bullet text="SpendSense never asks for bank usernames, passwords, OTPs, or card details. Never forward an OTP to any app." />
      </Card>

      <SectionTitle>Your data</SectionTitle>
      <Card className="p-4 mb-4 space-y-3">
        <Button variant="soft" className="w-full" onClick={() => { exportState(state); notify({ title: 'Data exported', body: 'A JSON backup was downloaded.', tone: 'good' }) }}>
          ⬇ Export my data (JSON)
        </Button>
        <Button variant="danger" className="w-full" onClick={() => setConfirmWipe(true)}>
          Delete all data
        </Button>
      </Card>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-6 text-[12px] text-slate-500">
        <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">Not affiliated with BPI or GCash</p>
        SpendSense PH is an independent tool. It is not endorsed by, connected to, or operated by Bank of the Philippine Islands
        or GCash. Trademarks belong to their respective owners.
      </div>

      {confirmWipe && (
        <Sheet title="Delete all data?" onClose={() => setConfirmWipe(false)}>
          <p className="text-[15px] text-slate-700 dark:text-slate-200 leading-snug mb-4">
            This permanently clears all accounts, transactions, goals and settings from this device. This can’t be undone.
            Consider exporting a backup first.
          </p>
          <div className="flex gap-2">
            <Button variant="danger" className="flex-1" onClick={() => { wipeAll(); setConfirmWipe(false) }}>
              Yes, delete everything
            </Button>
            <Button variant="ghost" onClick={() => setConfirmWipe(false)}>
              Cancel
            </Button>
          </div>
        </Sheet>
      )}
    </ScreenShell>
  )
}

function Row({ title, sub, control }: { title: string; sub: string; control: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[14px] font-medium text-slate-800 dark:text-slate-100">{title}</p>
        <p className="text-[12px] text-slate-500">{sub}</p>
      </div>
      {control}
    </div>
  )
}

function Bullet({ text }: { text: string }) {
  return (
    <div className="flex gap-2 text-[13px] text-slate-600 dark:text-slate-300">
      <span className="text-emerald-500">✓</span>
      <span>{text}</span>
    </div>
  )
}
