import { useState } from 'react'
import { useApp } from '../state/store'
import { ScreenShell, PageHeader } from '../components/Screen'
import { Card, SectionTitle, Button, Sheet, Field, Select, Toggle, TextInput, PesoInput, CATEGORY_META } from '../components/ui'
import { peso } from '../lib/format'
import type { Bill, IncomeFrequency, Category } from '../types'
import { uid } from '../lib/storage'

export function Budget() {
  const { state, patchSettings, upsertBill, deleteBill } = useApp()
  const s = state.settings
  const [editingBill, setEditingBill] = useState<Bill | null>(null)

  return (
    <ScreenShell>
      <PageHeader title="Budget & Rules" subtitle="The numbers behind Safe-to-Spend" />

      {/* Income */}
      <SectionTitle>Income & payday</SectionTitle>
      <Card className="p-4 mb-4 space-y-3">
        <Field label="Regular income amount">
          <PesoInput value={s.income.amount} onChange={(n) => patchSettings({ income: { ...s.income, amount: n } })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Next income date">
            <TextInput
              type="date"
              value={s.income.nextDate ? s.income.nextDate.slice(0, 10) : ''}
              onChange={(e) => patchSettings({ income: { ...s.income, nextDate: e.target.value ? new Date(e.target.value + 'T09:00:00+08:00').toISOString() : '' } })}
            />
          </Field>
          <Field label="Frequency">
            <Select<IncomeFrequency>
              value={s.income.frequency}
              onChange={(v) => patchSettings({ income: { ...s.income, frequency: v } })}
              options={[
                { value: 'weekly', label: 'Weekly' },
                { value: 'biweekly', label: 'Every 2 weeks' },
                { value: 'semimonthly', label: 'Twice a month' },
                { value: 'monthly', label: 'Monthly' },
              ]}
            />
          </Field>
        </div>
      </Card>

      {/* Buffers */}
      <SectionTitle>Protected money</SectionTitle>
      <Card className="p-4 mb-4 space-y-3">
        <Field label="Emergency buffer" hint="Never dipped into by Safe-to-Spend.">
          <PesoInput value={s.emergencyBuffer} onChange={(n) => patchSettings({ emergencyBuffer: n })} />
        </Field>
        <Field label="Minimum protected balance" hint="A hard floor to always keep.">
          <PesoInput value={s.minProtectedBalance} onChange={(n) => patchSettings({ minProtectedBalance: n })} />
        </Field>
        <Field label="Your safety buffer" hint="Extra cushion for peace of mind.">
          <PesoInput value={s.safetyBuffer} onChange={(n) => patchSettings({ safetyBuffer: n })} />
        </Field>
        <div className="rounded-2xl bg-slate-100 dark:bg-slate-900 p-3 text-[13px] text-slate-500">
          Safe-to-Spend protects the <b>higher</b> of emergency ({peso(s.emergencyBuffer)}) and minimum ({peso(s.minProtectedBalance)}), plus
          your {peso(s.safetyBuffer)} safety buffer.
        </div>
      </Card>

      {/* Bills */}
      <SectionTitle right={<button onClick={() => setEditingBill({ id: uid('bill'), name: '', amount: 0, dueDay: 1, category: 'bills' })} className="text-[13px] font-semibold text-blue-600">+ Add</button>}>
        Recurring bills
      </SectionTitle>
      <Card className="p-2 mb-4">
        {state.bills.length === 0 ? (
          <p className="px-3 py-4 text-[14px] text-slate-500">No bills yet.</p>
        ) : (
          state.bills.map((b) => (
            <button key={b.id} onClick={() => setEditingBill(b)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left">
              <div>
                <p className="text-[14px] font-medium text-slate-800 dark:text-slate-100">{b.name || 'Untitled'}</p>
                <p className="text-[12px] text-slate-400">Due day {b.dueDay} of the month</p>
              </div>
              <span className="text-[14px] font-semibold text-slate-900 dark:text-white">{peso(b.amount)}</span>
            </button>
          ))
        )}
      </Card>

      {/* Money-in rules */}
      <SectionTitle>Money-in savings rules</SectionTitle>
      <Card className="p-2 mb-4">
        {s.moneyInRules.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-3 py-2.5">
            <div className="min-w-0 pr-3">
              <p className="text-[14px] font-medium text-slate-800 dark:text-slate-100">{r.label}</p>
              <p className="text-[12px] text-slate-400">
                {r.percent}% of {r.appliesTo === 'salary' ? 'salary' : 'other money-in'}
                {r.minAmount ? ` above ${peso(r.minAmount)}` : ''}
              </p>
            </div>
            <Toggle on={r.enabled} onChange={(v) => patchSettings({ moneyInRules: s.moneyInRules.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)) })} />
          </div>
        ))}
        <div className="px-3 py-2 text-[12px] text-slate-400">Do-not-treat-transfers-as-income is always on. Adjust percentages below.</div>
        <div className="grid grid-cols-2 gap-3 px-3 pb-3">
          <Field label="Salary save %">
            <TextInput
              inputMode="numeric"
              value={String(s.moneyInRules.find((r) => r.appliesTo === 'salary')?.percent ?? 0)}
              onChange={(e) =>
                patchSettings({
                  moneyInRules: s.moneyInRules.map((x) => (x.appliesTo === 'salary' ? { ...x, percent: parseFloat(e.target.value) || 0 } : x)),
                })
              }
            />
          </Field>
          <Field label="Other save %">
            <TextInput
              inputMode="numeric"
              value={String(s.moneyInRules.find((r) => r.appliesTo === 'other')?.percent ?? 0)}
              onChange={(e) =>
                patchSettings({
                  moneyInRules: s.moneyInRules.map((x) => (x.appliesTo === 'other' ? { ...x, percent: parseFloat(e.target.value) || 0 } : x)),
                })
              }
            />
          </Field>
        </div>
      </Card>

      {/* Category limits */}
      <SectionTitle>Category limits (monthly)</SectionTitle>
      <Card className="p-2 mb-4">
        {s.categoryLimits.map((cl) => (
          <div key={cl.category} className="flex items-center justify-between px-3 py-2">
            <span className="text-[14px] text-slate-800 dark:text-slate-100">
              {CATEGORY_META[cl.category].emoji} {CATEGORY_META[cl.category].label}
            </span>
            <div className="w-32">
              <PesoInput
                value={cl.limit}
                onChange={(n) => patchSettings({ categoryLimits: s.categoryLimits.map((x) => (x.category === cl.category ? { ...x, limit: n } : x)) })}
              />
            </div>
          </div>
        ))}
        <p className="px-3 py-2 text-[12px] text-slate-400">We warn you at 80% of a limit.</p>
      </Card>

      {/* Rollover */}
      <SectionTitle>Rollover</SectionTitle>
      <Card className="p-4 mb-6">
        <Field label="Unspent budget behaviour">
          <Select
            value={s.rollover}
            onChange={(v) => patchSettings({ rollover: v })}
            options={[
              { value: 'carry', label: 'Carry leftover to next period' },
              { value: 'reset', label: 'Reset each period' },
            ]}
          />
        </Field>
      </Card>

      {editingBill && <BillSheet bill={editingBill} onClose={() => setEditingBill(null)} />}
    </ScreenShell>
  )
}

function BillSheet({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const { state, upsertBill, deleteBill } = useApp()
  const [draft, setDraft] = useState<Bill>(bill)
  const isNew = !state.bills.some((b) => b.id === bill.id)

  return (
    <Sheet title={isNew ? 'Add bill' : 'Edit bill'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Bill name">
          <TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Meralco" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount">
            <PesoInput value={draft.amount} onChange={(n) => setDraft({ ...draft, amount: n })} />
          </Field>
          <Field label="Due day of month">
            <TextInput
              inputMode="numeric"
              value={String(draft.dueDay)}
              onChange={(e) => setDraft({ ...draft, dueDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) })}
            />
          </Field>
        </div>
        <Field label="Category">
          <Select<Category>
            value={draft.category}
            onChange={(v) => setDraft({ ...draft, category: v })}
            options={(Object.keys(CATEGORY_META) as Category[]).map((c) => ({ value: c, label: `${CATEGORY_META[c].emoji} ${CATEGORY_META[c].label}` }))}
          />
        </Field>
        <div className="flex gap-2 pt-1">
          <Button className="flex-1" onClick={() => { upsertBill(draft); onClose() }}>
            {isNew ? 'Add bill' : 'Save'}
          </Button>
          {!isNew && (
            <Button variant="danger" onClick={() => { deleteBill(draft.id); onClose() }}>
              Delete
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
