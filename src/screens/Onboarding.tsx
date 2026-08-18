import { useState } from 'react'
import { useApp } from '../state/store'
import { Button, Field, PesoInput, TextInput, Select, Card } from '../components/ui'
import { peso } from '../lib/format'
import type { IncomeFrequency } from '../types'

export function Onboarding() {
  const { state, mutate, patchSettings, reconcileAccount } = useApp()
  const [step, setStep] = useState(0)

  // Local draft mirrors current state so we can pre-fill and let people skip.
  const [bpi, setBpi] = useState(state.accounts.bpi.startingBalance)
  const [gcash, setGcash] = useState(state.accounts.gcash.startingBalance)
  const [income, setIncome] = useState(state.settings.income.amount)
  const [nextDate, setNextDate] = useState(state.settings.income.nextDate ? state.settings.income.nextDate.slice(0, 10) : '')
  const [freq, setFreq] = useState<IncomeFrequency>(state.settings.income.frequency)
  const [emergency, setEmergency] = useState(state.settings.emergencyBuffer)
  const [safety, setSafety] = useState(state.settings.safetyBuffer)

  const steps = [
    'welcome',
    'balances',
    'income',
    'buffers',
    'done',
  ] as const
  const current = steps[step]
  const progress = ((step + 1) / steps.length) * 100

  function finish() {
    reconcileAccount('bpi', bpi)
    reconcileAccount('gcash', gcash)
    patchSettings({
      income: { amount: income, nextDate: nextDate ? new Date(nextDate + 'T09:00:00+08:00').toISOString() : '', frequency: freq },
      emergencyBuffer: emergency,
      safetyBuffer: safety,
      onboarded: true,
    })
  }

  return (
    <div className="absolute inset-0 top-8 bottom-0 flex flex-col">
      {/* progress */}
      <div className="px-5 pt-3">
        <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-slate-900 dark:bg-white transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-6 pb-4">
        {current === 'welcome' && (
          <div className="animate-pop">
            <div className="text-5xl mb-4">💚</div>
            <h1 className="text-[26px] font-extrabold text-slate-900 dark:text-white leading-tight">Welcome to SpendSense PH</h1>
            <p className="text-[15px] text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
              I help you make sense of your BPI and GCash messages, so you always know what’s safe to spend before payday.
            </p>
            <Card className="p-4 mt-5 space-y-2 text-[13px] text-slate-600 dark:text-slate-300">
              <Point text="Everything stays on your phone. No servers, no AI reading your messages." />
              <Point text="I never ask for passwords, OTPs, or card numbers." />
              <Point text="Not affiliated with BPI or GCash." />
            </Card>
            <p className="text-[13px] text-slate-400 mt-4">Takes about a minute. You can skip anything and change it later.</p>
          </div>
        )}

        {current === 'balances' && (
          <div className="animate-pop">
            <h2 className="text-[22px] font-extrabold text-slate-900 dark:text-white">Your starting balances</h2>
            <p className="text-[14px] text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              Transaction messages don’t always include a running balance, so I need a one-time starting point. Open each app,
              check the balance, and pop it in.
            </p>
            <div className="space-y-4 mt-5">
              <Field label="BPI balance right now">
                <PesoInput value={bpi} onChange={setBpi} />
              </Field>
              <Field label="GCash balance right now">
                <PesoInput value={gcash} onChange={setGcash} />
              </Field>
            </div>
            <SkipNote text="Skip this and Safe-to-Spend will be guesswork until you reconcile. I’ll keep reminding you gently." />
          </div>
        )}

        {current === 'income' && (
          <div className="animate-pop">
            <h2 className="text-[22px] font-extrabold text-slate-900 dark:text-white">When does money come in?</h2>
            <p className="text-[14px] text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              This is how I work out how many days your money needs to last.
            </p>
            <div className="space-y-4 mt-5">
              <Field label="Regular income amount">
                <PesoInput value={income} onChange={setIncome} />
              </Field>
              <Field label="Next expected income date">
                <TextInput type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
              </Field>
              <Field label="How often?">
                <Select<IncomeFrequency>
                  value={freq}
                  onChange={setFreq}
                  options={[
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'biweekly', label: 'Every 2 weeks' },
                    { value: 'semimonthly', label: 'Twice a month' },
                    { value: 'monthly', label: 'Monthly' },
                  ]}
                />
              </Field>
            </div>
            <SkipNote text="Without a next income date I can’t show a reliable Safe-to-Spend. I’ll say “not enough info” instead of guessing." />
          </div>
        )}

        {current === 'buffers' && (
          <div className="animate-pop">
            <h2 className="text-[22px] font-extrabold text-slate-900 dark:text-white">Protect a little</h2>
            <p className="text-[14px] text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              I’ll always keep this money out of “safe to spend”, so an emergency never catches you off guard.
            </p>
            <div className="space-y-4 mt-5">
              <Field label="Emergency buffer" hint="A cushion I’ll never suggest spending.">
                <PesoInput value={emergency} onChange={setEmergency} />
              </Field>
              <Field label="Extra safety buffer" hint="Optional peace-of-mind margin.">
                <PesoInput value={safety} onChange={setSafety} />
              </Field>
            </div>
            <Card className="p-4 mt-4 text-[13px] text-slate-500">
              You already have a few sample goals and bills loaded so you can explore. Adjust everything anytime in Budget & Rules.
            </Card>
          </div>
        )}

        {current === 'done' && (
          <div className="animate-pop text-center pt-6">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-[24px] font-extrabold text-slate-900 dark:text-white">You’re all set!</h2>
            <p className="text-[15px] text-slate-600 dark:text-slate-300 mt-2">Here’s your starting picture:</p>
            <Card className="p-4 mt-4 text-left space-y-2 text-[14px]">
              <SummaryRow label="Total to work with" value={peso(bpi + gcash)} />
              <SummaryRow label="Income" value={income ? peso(income) : 'Not set'} />
              <SummaryRow label="Next payday" value={nextDate || 'Not set'} />
              <SummaryRow label="Protected buffer" value={peso(Math.max(emergency, state.settings.minProtectedBalance))} />
            </Card>
            <p className="text-[13px] text-slate-400 mt-4">Tip: try the Test SMS Lab to watch a message get parsed.</p>
          </div>
        )}
      </div>

      {/* footer nav */}
      <div className="px-5 pb-8 pt-2 flex items-center gap-3">
        {step > 0 && current !== 'done' && (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        )}
        <div className="flex-1" />
        {current !== 'done' ? (
          <>
            {(current === 'balances' || current === 'income' || current === 'buffers') && (
              <Button variant="ghost" onClick={() => setStep((s) => s + 1)}>
                Skip
              </Button>
            )}
            <Button onClick={() => setStep((s) => s + 1)}>{current === 'welcome' ? 'Get started' : 'Continue'}</Button>
          </>
        ) : (
          <Button className="flex-1" onClick={finish}>
            Go to my dashboard
          </Button>
        )}
      </div>
    </div>
  )
}

function Point({ text }: { text: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-emerald-500">✓</span>
      <span>{text}</span>
    </div>
  )
}

function SkipNote({ text }: { text: string }) {
  return (
    <div className="mt-5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 p-3.5 text-[13px] text-amber-700 dark:text-amber-300">
      ⚠️ {text}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  )
}
