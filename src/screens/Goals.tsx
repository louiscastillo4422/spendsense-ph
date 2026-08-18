import { useState } from 'react'
import { useApp } from '../state/store'
import { ScreenShell, PageHeader, EmptyState } from '../components/Screen'
import { Card, Button, Sheet, Field, Select, Segmented, Toggle, TextInput, PesoInput, Progress } from '../components/ui'
import { computeSafeToSpend, goalRequiredPerPeriod, goalIsBehind, goalProjectedDate } from '../lib/calc'
import { peso, fmtDate } from '../lib/format'
import type { Goal, Priority } from '../types'
import { uid } from '../lib/storage'

const PRIORITY_META: Record<Priority, { label: string; cls: string }> = {
  high: { label: 'High', cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
  medium: { label: 'Medium', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  low: { label: 'Low', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
}

const EMOJIS = ['🛟', '🗾', '📱', '🃏', '🏠', '🚗', '🎓', '💍', '🎁', '💻', '🏝️', '💊']

function blankGoal(): Goal {
  return {
    id: uid('goal'),
    name: '',
    emoji: '🎯',
    target: 10000,
    saved: 0,
    priority: 'medium',
    frequency: 'monthly',
    contributionType: 'fixed',
    contributionValue: 1000,
  }
}

export function Goals() {
  const { state, upsertGoal, deleteGoal, reorderGoals } = useApp()
  const [editing, setEditing] = useState<Goal | null>(null)

  function move(id: string, dir: -1 | 1) {
    const ids = state.goals.map((g) => g.id)
    const i = ids.indexOf(id)
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    reorderGoals(ids)
  }

  return (
    <ScreenShell>
      <PageHeader
        title="Goals"
        subtitle="Drag priority with the arrows"
        right={
          <Button size="sm" onClick={() => setEditing(blankGoal())}>
            + New
          </Button>
        }
      />

      {state.goals.length === 0 ? (
        <EmptyState
          emoji="🎯"
          title="No goals yet"
          body="Add an emergency fund, a trip, a new phone, or anything else you’re saving toward."
          action={<Button onClick={() => setEditing(blankGoal())}>Create your first goal</Button>}
        />
      ) : (
        state.goals.map((g, i) => (
          <GoalCard
            key={g.id}
            goal={g}
            onEdit={() => setEditing(g)}
            onUp={() => move(g.id, -1)}
            onDown={() => move(g.id, 1)}
            isFirst={i === 0}
            isLast={i === state.goals.length - 1}
          />
        ))
      )}

      {editing && <GoalSheet goal={editing} onClose={() => setEditing(null)} onSave={upsertGoal} onDelete={deleteGoal} />}
    </ScreenShell>
  )
}

function GoalCard({
  goal,
  onEdit,
  onUp,
  onDown,
  isFirst,
  isLast,
}: {
  goal: Goal
  onEdit: () => void
  onUp: () => void
  onDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  const { state } = useApp()
  const pctDone = (goal.saved / goal.target) * 100
  const remaining = Math.max(0, goal.target - goal.saved)
  const req = goalRequiredPerPeriod(goal)
  const behind = goalIsBehind(goal)
  const projected = goalProjectedDate(goal)
  const hide = state.settings.notificationPrivacy === 'hideBalances'

  return (
    <Card className={`p-4 mb-3 ${goal.paused ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1 pt-1">
          <button onClick={onUp} disabled={isFirst} className="text-slate-400 disabled:opacity-30 text-xs leading-none">
            ▲
          </button>
          <span className="text-2xl">{goal.emoji}</span>
          <button onClick={onDown} disabled={isLast} className="text-slate-400 disabled:opacity-30 text-xs leading-none">
            ▼
          </button>
        </div>

        <div className="flex-1 min-w-0" onClick={onEdit}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-bold text-slate-900 dark:text-white truncate">{goal.name || 'Untitled goal'}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_META[goal.priority].cls}`}>
              {PRIORITY_META[goal.priority].label}
            </span>
            {goal.isEmergency && <span className="text-[11px] font-semibold text-emerald-600">Emergency</span>}
            {goal.paused && <span className="text-[11px] font-semibold text-slate-400">Paused</span>}
          </div>

          <div className="flex items-center justify-between mt-2 mb-1">
            <span className="text-[13px] text-slate-600 dark:text-slate-300">
              {peso(goal.saved, { hide })} <span className="text-slate-400">/ {peso(goal.target, { hide })}</span>
            </span>
            <span className={`text-[12px] font-semibold ${behind ? 'text-amber-600' : 'text-emerald-600'}`}>
              {goal.saved >= goal.target ? 'Complete 🎉' : behind ? 'Behind schedule' : 'On track'}
            </span>
          </div>
          <Progress value={pctDone} tone={goal.isEmergency ? 'emerald' : 'blue'} />

          <div className="grid grid-cols-2 gap-2 mt-3 text-[12px]">
            <Info label="Remaining" value={peso(remaining, { hide })} />
            <Info
              label={`Need / ${goal.frequency === 'weekly' ? 'wk' : 'mo'}`}
              value={
                goal.contributionType === 'fixed'
                  ? peso(goal.contributionValue)
                  : goal.targetDate
                    ? peso(goal.frequency === 'weekly' ? req.weekly : req.monthly)
                    : `${goal.contributionValue}% of income`
              }
            />
            {goal.targetDate && <Info label="Target date" value={fmtDate(goal.targetDate)} />}
            {projected && <Info label="Projected done" value={fmtDate(projected.toISOString())} />}
          </div>
        </div>
      </div>
    </Card>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-900 px-3 py-2">
      <p className="text-slate-400">{label}</p>
      <p className="font-semibold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  )
}

function GoalSheet({
  goal,
  onClose,
  onSave,
  onDelete,
}: {
  goal: Goal
  onClose: () => void
  onSave: (g: Goal) => void
  onDelete: (id: string) => void
}) {
  const { state } = useApp()
  const [draft, setDraft] = useState<Goal>(goal)
  const isNew = !state.goals.some((g) => g.id === goal.id)

  function set<K extends keyof Goal>(k: K, v: Goal[K]) {
    setDraft((d) => ({ ...d, [k]: v }))
  }

  // Scenario preview: how does this goal's set-aside change Safe-to-Spend?
  const currentSafe = computeSafeToSpend(state).safe
  const hypotheticalState = {
    ...state,
    goals: state.goals.some((g) => g.id === draft.id)
      ? state.goals.map((g) => (g.id === draft.id ? draft : g))
      : [...state.goals, draft],
  }
  const newSafe = computeSafeToSpend(hypotheticalState).safe
  const delta = newSafe - currentSafe

  return (
    <Sheet title={isNew ? 'New goal' : 'Edit goal'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Name">
          <TextInput value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Japan trip" />
        </Field>

        <div>
          <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300 mb-1">Icon</p>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => set('emoji', e)}
                className={`h-10 w-10 rounded-xl text-lg ${draft.emoji === e ? 'bg-slate-900 dark:bg-white' : 'bg-slate-100 dark:bg-slate-800'}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Target amount">
            <PesoInput value={draft.target} onChange={(n) => set('target', n)} />
          </Field>
          <Field label="Saved so far">
            <PesoInput value={draft.saved} onChange={(n) => set('saved', n)} />
          </Field>
        </div>

        <Field label="Target date (optional)" hint="Skipping this means no projected finish date.">
          <TextInput
            type="date"
            value={draft.targetDate ? draft.targetDate.slice(0, 10) : ''}
            onChange={(e) => set('targetDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
          />
        </Field>

        <div>
          <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300 mb-1">Priority</p>
          <Segmented
            value={draft.priority}
            onChange={(v) => set('priority', v)}
            options={[
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
          />
        </div>

        <div>
          <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300 mb-1">Contribution</p>
          <Segmented
            value={draft.contributionType}
            onChange={(v) => set('contributionType', v)}
            options={[
              { value: 'fixed', label: 'Fixed amount' },
              { value: 'percent', label: '% of income' },
            ]}
          />
          <div className="grid grid-cols-2 gap-3 mt-3">
            {draft.contributionType === 'fixed' ? (
              <Field label="Amount per period">
                <PesoInput value={draft.contributionValue} onChange={(n) => set('contributionValue', n)} />
              </Field>
            ) : (
              <Field label="Percent of income">
                <TextInput
                  inputMode="numeric"
                  value={String(draft.contributionValue)}
                  onChange={(e) => set('contributionValue', parseFloat(e.target.value) || 0)}
                />
              </Field>
            )}
            <Field label="Frequency">
              <Select
                value={draft.frequency}
                onChange={(v) => set('frequency', v)}
                options={[
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-slate-100 dark:bg-slate-900 px-4 py-3">
          <span className="text-[14px] font-medium text-slate-800 dark:text-slate-100">Emergency fund</span>
          <Toggle on={!!draft.isEmergency} onChange={(v) => set('isEmergency', v)} />
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-slate-100 dark:bg-slate-900 px-4 py-3">
          <div>
            <span className="text-[14px] font-medium text-slate-800 dark:text-slate-100">Pause goal</span>
            <p className="text-[12px] text-slate-500">Stops set-asides & frees up Safe-to-Spend.</p>
          </div>
          <Toggle on={!!draft.paused} onChange={(v) => set('paused', v)} />
        </div>

        {/* Scenario preview */}
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 p-3.5">
          <p className="text-[13px] font-semibold text-blue-700 dark:text-blue-300 mb-1">Impact on Safe-to-Spend</p>
          <div className="flex items-center justify-between text-[14px]">
            <span className="text-slate-600 dark:text-slate-300">Now {peso(currentSafe)}</span>
            <span className="text-slate-400">→</span>
            <span className="font-bold text-slate-900 dark:text-white">{peso(newSafe)}</span>
          </div>
          <p className={`text-[12px] mt-1 ${delta < 0 ? 'text-amber-600' : delta > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
            {delta === 0 ? 'No change to your spendable amount.' : `${delta < 0 ? 'Reduces' : 'Frees up'} ${peso(delta)} before payday.`}
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            className="flex-1"
            onClick={() => {
              onSave(draft)
              onClose()
            }}
          >
            {isNew ? 'Create goal' : 'Save goal'}
          </Button>
          {!isNew && (
            <Button
              variant="danger"
              onClick={() => {
                onDelete(draft.id)
                onClose()
              }}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
