import { useApp } from '../state/store'
import { ScreenShell, PageHeader } from '../components/Screen'
import { Card, SectionTitle, Segmented, Button } from '../components/ui'
import type { Screen } from '../components/TabBar'
import type { ThemePref } from '../types'

const ITEMS: { key: Screen; icon: string; label: string; sub: string }[] = [
  { key: 'budget', icon: '🧮', label: 'Budget & Rules', sub: 'Income, bills, buffers, limits' },
  { key: 'automation', icon: '⚡', label: 'Automation', sub: 'Apple Shortcuts import (simulated)' },
  { key: 'testsms', icon: '🧪', label: 'Test SMS Lab', sub: 'Parse a message → import' },
  { key: 'reports', icon: '✉️', label: 'Email reports', sub: 'Daily & weekly friend check-ins' },
  { key: 'security', icon: '🔒', label: 'Security & Privacy', sub: 'Lock, masking, export, delete' },
]

export function More({ navigate }: { navigate: (s: Screen) => void }) {
  const { state, patchSettings, resetToSample, notify } = useApp()

  return (
    <ScreenShell>
      <PageHeader title="More" />

      <Card className="p-2 mb-4">
        {ITEMS.map((it) => (
          <button
            key={it.key}
            onClick={() => navigate(it.key)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left"
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-lg">{it.icon}</span>
            <div className="flex-1">
              <p className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{it.label}</p>
              <p className="text-[12px] text-slate-500">{it.sub}</p>
            </div>
            <span className="text-slate-300">›</span>
          </button>
        ))}
      </Card>

      <SectionTitle>Appearance</SectionTitle>
      <Card className="p-4 mb-4">
        <Segmented<ThemePref>
          value={state.settings.theme}
          onChange={(v) => patchSettings({ theme: v })}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
        />
      </Card>

      <SectionTitle>Prototype data</SectionTitle>
      <Card className="p-4 mb-6 space-y-3">
        <Button
          variant="soft"
          className="w-full"
          onClick={() => {
            resetToSample()
            notify({ title: 'Sample data restored', body: 'Back to the demo dataset.', tone: 'good' })
          }}
        >
          ♻️ Reset to sample data
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => navigate('security')}>
          Manage / delete my data →
        </Button>
      </Card>

      <p className="text-center text-[11px] text-slate-400 mb-6">
        SpendSense PH · Prototype v0.1 · Not affiliated with BPI or GCash
      </p>
    </ScreenShell>
  )
}
