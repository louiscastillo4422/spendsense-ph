# SpendSense PH 💚

A privacy-first personal-finance **prototype** that helps an iPhone user in the Philippines make sense of **BPI** and **GCash** transaction messages, so you always know what’s *safe to spend before payday*.

> ⚠️ **Prototype / demo.** All data is fictional and lives only on your device (`localStorage`). **Not affiliated with, endorsed by, or connected to BPI or GCash.** It never asks for bank logins, passwords, OTPs, or card numbers, and never sends messages to a server or AI.

---

## What it does

Whenever a supported message arrives (simulated here via the **Test SMS Lab**), SpendSense figures out:

1. How much money came in or went out
2. Which account was affected (BPI or GCash)
3. What the transaction probably was (category)
4. Whether you’re still on track with savings goals
5. How much you can safely spend before your next income
6. Whether to set aside some incoming money for savings
7. Whether it’s actually an **internal transfer** between your own accounts (not real income/spending)

---

## Prerequisites

You need **Node.js 18+** (includes `npm`). This machine doesn’t have it yet.

- Download the **LTS** installer from <https://nodejs.org> and run it, **or**
- Windows (winget): `winget install OpenJS.NodeJS.LTS`

Verify in a fresh terminal:

```bash
node -v
npm -v
```

## Install & run

From this project folder (`spending tracker`):

```bash
npm install
```

```bash
npm run dev
```

Then open the printed URL (usually <http://localhost:5173>). For the best experience use your browser’s device toolbar and pick **iPhone 12/13/14 (390×844)**, since the app is designed as a phone canvas.

Other scripts:

```bash
npm run build     # type-check + production build to /dist
npm run preview   # serve the production build
```

---

## How to explore

- **Onboarding** runs on first launch (skippable, and each skip explains its accuracy cost).
- **Test SMS Lab** (More → Test SMS Lab): paste a message or tap a sample → parse → review → import, and watch a notification + Safe-to-Spend update.
- **Activity**: filter, search, edit/exclude, and correct a transaction. It offers to *learn a rule*.
- **Automation**: a simulated Apple Shortcuts setup + “Test import”.
- **Goals**: create/edit/pause/reorder goals and preview the impact on Safe-to-Spend.
- **Email reports** (More → Email reports): friendly daily & weekly “check-in” previews.
- **Reset / delete** sample data anytime from **More** and **Security & Privacy**.

Data persists across refreshes in `localStorage` (key `spendsense-ph-v1`). “Reset to sample data” restores the demo; “Delete all data” wipes it.

---

## Architecture

```
src/
  types.ts                 # domain model (Account, Transaction, Goal, Bill, Settings, …)
  lib/
    parser.ts              # deterministic, LOCAL, rules-based message parser + masking
    calc.ts                # Safe-to-Spend, Save-Now, balances, goal projections
    transfers.ts           # duplicate + internal-transfer detection
    format.ts              # ₱ + Asia/Manila date formatting
    seed.ts                # fictional sample data + synthetic sample messages
    storage.ts             # localStorage load/save/export/wipe
  state/store.tsx          # React context store (single source of truth) + persistence + toasts
  components/              # PhoneFrame, TabBar, ToastHost, Breakdown, UI kit (ui.tsx), Screen shell
  screens/                 # Onboarding, Home, Accounts, Transactions, Goals, Budget,
                           # Automation, TestSMS, Security, Reports, More
```

**Design choices**

- **Domain logic is UI-free** (`src/lib`) and unit-testable in isolation.
- **All money maths is transparent.** Every recommendation exposes a “How was this calculated?” breakdown; nothing is a black box.
- **The parser is data-driven** (keyword banks + regex templates + user-learned rules) so message formats can change without a rewrite.
- **Privacy by construction**: raw messages are stored locally for audit and masked in the UI; no network calls.

### Safe-to-Spend

```
available (BPI + GCash)
  − bills due before next income
  − required savings set-aside before next income
  − protected floor  = max(emergency buffer, minimum protected balance)
  − your safety buffer
= Safe to Spend Until Payday        (never shown below ₱0; a shortfall is shown instead)

Safe to Spend ÷ days until next income = Suggested Daily Spending Limit
```

- Internal transfers never increase total available funds.
- Missing income/date ⇒ shows **“Not enough information”** instead of false precision.
- Stale reconciliation (>14 days) ⇒ a confidence warning.

### Save-Now

30% of salary deposits, 10% of other money-in above ₱2,000 (configurable), **capped** so bills and the protected buffer stay covered, then routed to the highest-priority behind-schedule goal.

### Transfer / duplicate detection

- **Duplicate**: same account + reference, or same amount+direction within 5 minutes.
- **Transfer**: opposite-direction legs in different accounts, near-equal amount, within a configurable window, with InstaPay/PESONet/own-account hints → asks to confirm → excluded from income/spend (any fee still counts).

---

## The real iPhone workflow (how the live version would work)

An ordinary iOS app **cannot** silently read your whole Messages inbox. The privacy-conscious path is:

1. **Apple Shortcuts → Personal Automation** triggers on a message from the BPI / GCash sender.
2. The automation passes **that message’s** text + sender + timestamp to SpendSense via an **App Intent**.
3. SpendSense **parses locally**, updates the right account/budget, and posts a **local notification**.

No OTPs, no online-banking credentials, ever. The prototype simulates step 1–2 with the Test SMS Lab and the Automation screen.

---

## Future implementation plan: native SwiftUI app

| Concern | Approach |
|---|---|
| **Message intake** | Shortcuts *Personal Automation* → **App Intent** (`AppIntents`) receiving `text`, `sender`, `date`. Optional share-sheet fallback. |
| **Parsing** | Port `lib/parser.ts` to a Swift `TransactionParser` with the same data-driven rule templates (stored in SwiftData so they’re editable in-app). 100% on-device. |
| **Persistence** | **SwiftData** (`@Model` for `Account`, `Transaction`, `Goal`, `Bill`, `ParseRule`) replaces `localStorage`. |
| **Calculations** | Reuse the exact Safe-to-Spend / Save-Now formulas as pure Swift functions (mirrors `lib/calc.ts`). |
| **Notifications** | `UNUserNotificationCenter` local notifications with the three privacy levels; no push server needed. |
| **App lock** | `LocalAuthentication` (Face ID / Touch ID). |
| **Daily/weekly reports** | `BGTaskScheduler` builds the friendly summary on-device; deliver as a local notification **or** hand the summary text to an email API. Raw messages never leave the device. |
| **Automation status** | Deep-link + App Intent “Test import” to verify the Shortcut end-to-end. |
| **Export/delete** | `FileDocument` export; full local wipe. |

### Email reports: is it feasible?

**Yes.** The friendly daily/weekly text is generated entirely on-device (see the **Email reports** screen). To actually *email* it:

- Add a small **scheduled job** (serverless cron or a tiny backend) that runs each morning / Monday and sends via a transactional email API. Only the **friendly summary text** is transmitted, never raw bank messages.
- Or stay fully serverless: schedule a **local notification** (“Your weekly report is ready”) and render it in-app, with no email account required.

---

## Notes & limitations

- Balances are **estimates** anchored to a reconciled starting point; reconcile whenever you check your real balance.
- Sample messages and numbers are **entirely fictional**, with no real account numbers used anywhere.
- This is a front-end prototype: no real backend, no paid services.
