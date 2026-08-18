# CLAUDE.md — SpendSense PH

Context for Claude Code working on this project. Read this first.

## What this is

**SpendSense PH** is a privacy-first personal-finance **prototype** for an iPhone user in the
Philippines. It reads **BPI** and **GCash** transaction SMS text and tells the user what is safe
to spend before payday. It is an interactive web prototype (not the final native app).

- **Not affiliated with BPI or GCash.** Keep that disclaimer visible in the UI.
- **Privacy is the whole point:** all parsing is local, no network/AI calls, no OTPs, no bank
  logins, no card numbers. Never add anything that sends financial message text off-device.
- All sample data is fictional. Never use real account numbers.

## Tech stack

Vite + React 18 + TypeScript + Tailwind CSS v3. Persistence is `localStorage` (key
`spendsense-ph-v1`). No backend.

## Run it

Requires Node.js 18+ installed normally (PATH set). From the project folder:

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # tsc --noEmit + vite build (use this to verify changes compile)
npm run lint     # tsc --noEmit type-check only
```

If `npm` is blocked in PowerShell ("running scripts is disabled"), either run
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use Command Prompt (cmd) instead.

## Architecture

Domain logic is kept UI-free in `src/lib/` so it is easy to reason about and port to Swift later.

```
src/
  types.ts              Domain model: Account, Transaction, Goal, Bill, Settings, ParseRule, ParsedMessage
  lib/
    parser.ts           Deterministic, local, rules-based SMS parser (+ maskMessage). Keyword banks + regex.
    calc.ts             Safe-to-Spend, Save-Now, balances, goal projections. All maths lives here.
    transfers.ts        Duplicate detection + internal own-account transfer detection.
    format.ts           Peso (₱12,345.67) + Asia/Manila date formatting.
    seed.ts             Fictional sample data + SAMPLE_MESSAGES (incl. real BPI/GCash formats).
    storage.ts          localStorage load/save/export/wipe + uid().
  state/store.tsx       Single React context store; all mutations + persistence + toast notifications.
  components/           PhoneFrame, TabBar, ToastHost, Breakdown, Screen shell, ui.tsx (whole UI kit).
  screens/              Onboarding, Home, Accounts, Transactions, Goals, Budget, Automation,
                        TestSMS, Security, Reports, More.
  App.tsx               Routing: onboarding gate + screen switch + tab bar.
```

State flows through `useApp()` (from `state/store.tsx`). Screens read `state` and call helper
methods (`addTransaction`, `upsertGoal`, `patchSettings`, `reconcileAccount`, etc.). Never mutate
state directly; always go through the store.

## Key calculations (keep them transparent)

Every recommendation must expose a "How was this calculated?" style breakdown. No black boxes.

**Safe to Spend** (`computeSafeToSpend` in `calc.ts`):
```
available (BPI + GCash balances)
  - bills due before next income
  - required savings set-aside before next income (fixed-contribution active goals)
  - protected floor = max(emergency buffer, minimum protected balance)
  - user safety buffer
= Safe to Spend        (never displayed below 0; show a shortfall instead)
Safe to Spend / days until next income = suggested daily limit
```
- Account balance = reconciled starting balance + net of non-excluded transactions after reconcile.
- Internal transfers move money between accounts but never change total available funds, and are
  excluded from income/spending totals (transfer fees still count as spending).
- Missing income amount/date -> show "Not enough information", never a fake number.
- Status: red = shortfall or below protected floor; amber = safe < 20% of available; green otherwise.

**Save-Now** (`saveNowRecommendation`): 30% of salary deposits, 10% of other money-in above
a threshold (configurable in Settings `moneyInRules`), capped so bills + protected floor stay
covered, routed to the highest-priority behind-schedule goal.

## Real BPI / GCash message formats (from the user's actual SMS)

The parser is tuned to these. Do not assume one fixed format; keep parsing data-driven.

- GCash uses a **`P` prefix** (not `PHP`): `P1,384.50`. BPI uses both `PHP` and `P`.
- GCash dates are **MM-DD-YY**: `08-15-26 02:11:11 AM`. BPI uses named months: `August 04, 2026`.
- GCash reference: `Ref. No. 9000012345678` or `Ref no. ...`. BPI: `Ref PR26073001`.
- BPI top-up to GCash sends **two SMS** for one action (a "transferred to GCash/G-Xchange"
  notice, then a "deducted ... for DRAGONPAY CORP" notice ~1-2 min later, same amount). Duplicate
  detection and transfer pairing must handle this so it is not double-counted.
- GCash message bodies often never say "GCash"; in the real app the institution comes from the
  SMS **sender ID**. In this prototype the user picks the account when unsure.
- BPI deduction SMS bundles the fee (`plus a P12.00 fee`); parser flags it as a separate fee.

## Conventions (important)

- **No em dashes anywhere** (not in UI text, code comments, or docs). The user asked for this and
  wants copy that does not read as AI-written. Use periods, commas, semicolons, or rephrase.
- **Friendly, plain, human tone.** The app talks like a helpful friend, not a bank or a robot.
  Avoid jargon. The Reports screen is deliberately warm ("I've got your back").
- Money is always `₱12,345.67` via `peso()` in `format.ts`. Timezone is **Asia/Manila**.
- Account accents: BPI = subtle red (`bpi`), GCash = subtle blue (`gcash`). Do not copy the real
  BPI/GCash brand UIs.
- Designed for a **390x844 iPhone** viewport (the PhoneFrame). Keep new UI inside that width.
- Light and dark mode both matter; use the existing Tailwind tokens and `dark:` variants.
- After changing code, run `npm run build` to confirm it type-checks and builds before committing.

## Save work back to GitHub

```bash
git pull            # before starting
git add -A
git commit -m "what changed"
git push            # after finishing
```

Repo: https://github.com/louiscastillo4422/spendsense-ph (private).

## Possible next steps (not yet built)

- Import-data button (re-import the JSON that Security > Export produces) so demo data can move
  between machines. localStorage does not sync through git.
- Spending-by-category chart on Home or a dedicated Insights screen.
- Editable parser templates UI (the rule engine exists; expose more of it).
- The native SwiftUI plan (App Intents + SwiftData + local notifications + Shortcuts) is in README.md.
