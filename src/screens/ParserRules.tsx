import { useMemo, useState } from 'react'
import { useApp } from '../state/store'
import { ScreenShell, PageHeader } from '../components/Screen'
import { Card, SectionTitle, Button, Field, Select, TextInput, Toggle, Sheet, CATEGORY_META, AccountBadge } from '../components/ui'
import { uid } from '../lib/storage'
import type { Category, ParseRule } from '../types'

type Scope = ParseRule['account']

const blankDraft = (): ParseRule => ({
  id: uid('pr'),
  label: '',
  account: 'any',
  match: '',
  category: 'food',
  enabled: true,
})

export function ParserRules() {
  const { state, upsertRule, deleteRule, notify } = useApp()
  const rules = state.parseRules
  const [editing, setEditing] = useState<ParseRule | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [test, setTest] = useState('')

  // Live preview: first enabled rule whose match text appears wins (mirrors the parser).
  const testMatch = useMemo(() => {
    const l = test.toLowerCase()
    if (!l.trim()) return null
    return rules.find((r) => r.enabled && r.match && l.includes(r.match.toLowerCase())) ?? null
  }, [test, rules])

  function openNew() {
    setEditing(blankDraft())
    setIsNew(true)
  }
  function openEdit(r: ParseRule) {
    setEditing({ ...r })
    setIsNew(false)
  }
  function save() {
    if (!editing) return
    const match = editing.match.trim()
    if (!match) return
    const label = editing.label.trim() || `${match} → ${CATEGORY_META[editing.category].label}`
    upsertRule({ ...editing, match, label })
    notify({ title: isNew ? 'Rule added' : 'Rule updated', body: `“${match}” files under ${CATEGORY_META[editing.category].label}.`, tone: 'good' })
    setEditing(null)
  }

  return (
    <ScreenShell>
      <PageHeader title="Parser rules" subtitle="Teach it how to file your messages" />

      <div className="rounded-2xl bg-slate-100 dark:bg-slate-900 px-4 py-3 text-[13px] text-slate-500 mb-4 space-y-1">
        <p>When a message contains your <b>match text</b>, it's filed under the category you pick. Your rules beat the built-in guesses.</p>
        <p>Matching is checked top to bottom, so the first match wins. All of this runs on-device.</p>
      </div>

      {/* Live tester */}
      <SectionTitle>Try it</SectionTitle>
      <Card className="p-4 mb-4">
        <TextInput value={test} onChange={(e) => setTest(e.target.value)} placeholder="e.g. You paid P250 to Jollibee" />
        {test.trim() && (
          <div className="mt-3 text-[13px]">
            {testMatch ? (
              <p className="text-slate-700 dark:text-slate-200">
                Matches <b>{testMatch.label}</b> → files as {CATEGORY_META[testMatch.category].emoji} {CATEGORY_META[testMatch.category].label}.
              </p>
            ) : (
              <p className="text-slate-500">No rule matches. The built-in keyword guesses would decide the category.</p>
            )}
          </div>
        )}
      </Card>

      <SectionTitle right={<button onClick={openNew} className="text-[13px] font-semibold text-blue-600">+ Add rule</button>}>
        Your rules
      </SectionTitle>
      <Card className="p-2 mb-4">
        {rules.length === 0 ? (
          <p className="px-3 py-4 text-[14px] text-slate-500">No rules yet. Add one to teach the parser a merchant or biller.</p>
        ) : (
          rules.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-base shrink-0">
                {CATEGORY_META[r.category].emoji}
              </span>
              <button onClick={() => openEdit(r)} className="min-w-0 flex-1 text-left">
                <p className={`text-[14px] font-medium truncate ${r.enabled ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 line-through'}`}>
                  {r.label || `${r.match} → ${CATEGORY_META[r.category].label}`}
                </p>
                <p className="text-[12px] text-slate-400 flex items-center gap-1.5">
                  contains “{r.match}”
                  {r.account !== 'any' && <AccountBadge id={r.account} />}
                  {r.learned && <span className="text-emerald-500">learned</span>}
                </p>
              </button>
              <Toggle on={r.enabled} onChange={(v) => upsertRule({ ...r, enabled: v })} />
            </div>
          ))
        )}
      </Card>

      {editing && (
        <Sheet title={isNew ? 'Add rule' : 'Edit rule'} onClose={() => setEditing(null)}>
          <div className="space-y-3">
            <Field label="Match text" hint="Any part of the message, e.g. a merchant or biller name.">
              <TextInput
                value={editing.match}
                onChange={(e) => setEditing({ ...editing, match: e.target.value })}
                placeholder="e.g. jollibee"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <Select<Category>
                  value={editing.category}
                  onChange={(v) => setEditing({ ...editing, category: v })}
                  options={(Object.keys(CATEGORY_META) as Category[]).map((c) => ({ value: c, label: `${CATEGORY_META[c].emoji} ${CATEGORY_META[c].label}` }))}
                />
              </Field>
              <Field label="Applies to">
                <Select<Scope>
                  value={editing.account}
                  onChange={(v) => setEditing({ ...editing, account: v })}
                  options={[
                    { value: 'any', label: 'Any account' },
                    { value: 'bpi', label: 'BPI only' },
                    { value: 'gcash', label: 'GCash only' },
                  ]}
                />
              </Field>
            </div>
            <Field label="Label" hint="Optional. Left blank, we name it for you.">
              <TextInput
                value={editing.label}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                placeholder={editing.match ? `${editing.match.trim()} → ${CATEGORY_META[editing.category].label}` : 'Auto'}
              />
            </Field>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium text-slate-800 dark:text-slate-100">Enabled</span>
              <Toggle on={editing.enabled} onChange={(v) => setEditing({ ...editing, enabled: v })} />
            </div>

            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={save} disabled={!editing.match.trim()}>
                {isNew ? 'Add rule' : 'Save changes'}
              </Button>
              {!isNew && (
                <Button
                  variant="danger"
                  onClick={() => {
                    deleteRule(editing.id)
                    notify({ title: 'Rule deleted', tone: 'default' })
                    setEditing(null)
                  }}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </Sheet>
      )}
    </ScreenShell>
  )
}
