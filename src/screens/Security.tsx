import { useRef, useState, type ReactNode } from 'react'
import { useApp } from '../state/store'
import { ScreenShell, PageHeader } from '../components/Screen'
import { Card, SectionTitle, Button, Toggle, Segmented, Sheet } from '../components/ui'
import { exportState, importStateFromFile } from '../lib/storage'
import type { AppState, NotificationPrivacy } from '../types'

export function Security() {
  const { state, patchSettings, wipeAll, importData, notify } = useApp()
  const s = state.settings
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [pendingImport, setPendingImport] = useState<AppState | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file later
    if (!file) return
    try {
      const next = await importStateFromFile(file)
      setPendingImport(next)
    } catch (err) {
      notify({ title: "Couldn't import that file", body: err instanceof Error ? err.message : 'Unknown error', tone: 'bad' })
    }
  }

  const importCounts = pendingImport
    ? `${pendingImport.transactions.length} transactions, ${pendingImport.goals.length} goals, ${pendingImport.bills.length} bills`
    : ''

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
        <Button variant="soft" className="w-full" onClick={() => fileInputRef.current?.click()}>
          ⬆ Import data (JSON)
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onFilePicked}
        />
        <p className="text-[12px] text-slate-500">
          Import a backup exported from SpendSense to move your data to this device. It replaces everything here.
        </p>
        <Button variant="danger" className="w-full" onClick={() => setConfirmWipe(true)}>
          Delete all data
        </Button>
      </Card>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-6 text-[12px] text-slate-500">
        <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">Not affiliated with BPI or GCash</p>
        SpendSense PH is an independent tool. It is not endorsed by, connected to, or operated by Bank of the Philippine Islands
        or GCash. Trademarks belong to their respective owners.
      </div>

      {pendingImport && (
        <Sheet title="Replace your data?" onClose={() => setPendingImport(null)}>
          <p className="text-[15px] text-slate-700 dark:text-slate-200 leading-snug mb-2">
            This backup holds {importCounts}. Importing it replaces everything currently on this device.
            This can’t be undone.
          </p>
          <p className="text-[13px] text-slate-500 mb-4">Export your current data first if you want to keep it.</p>
          <div className="flex gap-2">
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => {
                importData(pendingImport)
                setPendingImport(null)
                notify({ title: 'Data imported', body: 'Your backup is now loaded on this device.', tone: 'good' })
              }}
            >
              Replace and import
            </Button>
            <Button variant="ghost" onClick={() => setPendingImport(null)}>
              Cancel
            </Button>
          </div>
        </Sheet>
      )}

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
