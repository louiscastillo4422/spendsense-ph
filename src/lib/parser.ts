// ---------------------------------------------------------------------------
// Deterministic, rules-based, LOCAL parser for BPI / GCash message text.
// No message is ever sent to a network or AI API.
// The design keeps templates as data so they can be edited without a rebuild.
//
// Formats handled (modeled on real-world BPI/GCash SMS):
//   BPI:   "BPI: You have transferred PHP 10000 to GCash/G-Xchange on
//           Jul 29 2026; 04:56:59 PM (GMT +8)."
//   BPI:   "BPI: Your BPI account was deducted P15,000.00 plus a P12.00 fee
//           on August 04, 2026 09:36:46 AM for DRAGONPAY CORP. ..."
//   GCash: "You have paid P1,384.50 GCash to DIN TAI FUN on 08-14-26
//           08:24:38 PM. Your new balance is P13,977.90. Ref. No. 9000012345678"
//   GCash: "You received P4289.00 from JUAN D. w/ MSG - . New balance is
//           P8666.90 08-15-26 12:41 AM. Ref no. 9043900011122"
//   GCash: "Your payment of P358.00 to Lazada PH has been successfully
//           processed on 08-15-26 11:37:43 AM. Ref. No. 990440000"
// ---------------------------------------------------------------------------

import type { AccountId, Category, ParsedDirection, ParsedMessage, ParseRule } from '../types'

// Keyword banks. Extend these freely; they are intentionally data, not code.
const KEYWORDS: Record<Exclude<ParsedDirection, 'unknown' | 'transfer'>, string[]> = {
  in: ['received', 'credited', 'deposited', 'refund', 'salary', 'payroll', 'credit', 'cash in', 'you got'],
  out: [
    'sent',
    'paid',
    'debited',
    'deducted',
    'transferred',
    'purchase',
    'withdrawn',
    'withdrawal',
    'debit',
    'payment',
    'bought',
    'spent',
    'successfully processed',
  ],
  fee: ['fee', 'charge', 'service charge'],
}

const TRANSFER_HINTS = [
  'transfer',
  'transferred',
  'instapay',
  'pesonet',
  'g-xchange',
  'gcash/g-xchange',
  'to your gcash',
  'to your bpi',
  'own account',
  'to gcash',
  'to bpi',
]

const CATEGORY_HINTS: { category: Category; words: string[] }[] = [
  { category: 'salary', words: ['salary', 'payroll', 'sweldo'] },
  { category: 'food', words: ['jollibee', 'mcdo', 'grab food', 'grabfood', 'foodpanda', 'restaurant', 'cafe', 'coffee', 'starbucks'] },
  { category: 'transport', words: ['grab', 'angkas', 'beep', 'toll', 'shell', 'petron', 'fare'] },
  { category: 'shopping', words: ['shopee', 'lazada', 'sm ', 'mall', 'uniqlo', 'store', 'mart'] },
  { category: 'bills', words: ['meralco', 'maynilad', 'manila water', 'pldt', 'globe', 'converge', 'sky', 'bill', 'electric', 'water'] },
  { category: 'subscriptions', words: ['netflix', 'spotify', 'youtube', 'icloud', 'canva', 'subscription'] },
  { category: 'cash', words: ['atm', 'withdrawal', 'withdrawn', 'cash out'] },
]

function normalise(raw: string): string {
  return raw
    .replace(/₱/g, 'PHP ') // ₱ -> PHP
    .replace(/\bPHP\b/gi, 'PHP')
    .replace(/\bP(?=\d)/g, 'PHP ') // GCash/BPI style: P4,289.00 -> PHP 4,289.00
    .replace(/[,](?=\d{3}\b)/g, '') // strip thousands separators inside numbers
    .replace(/\s+/g, ' ')
    .trim()
}

function detectInstitution(raw: string): AccountId | 'unknown' {
  const l = raw.toLowerCase()
  // Both names can appear in one message ("BPI: ... to GCash/G-Xchange").
  // Whichever appears FIRST is almost always the sending institution.
  const gi = l.search(/g-?cash/)
  const bi = l.search(/\bbpi\b|bank of the philippine islands/)
  if (gi >= 0 && (bi < 0 || gi < bi)) return 'gcash'
  if (bi >= 0) return 'bpi'
  return 'unknown'
}

function extractAmount(text: string): number | null {
  // Prefer the FIRST amount adjacent to a currency token (fees come later).
  const currency = text.match(/PHP\s*([\d]+(?:\.\d{1,2})?)/i)
  if (currency) return parseFloat(currency[1])
  // Fallback: a decimal number that looks monetary.
  const loose = text.match(/\b(\d{2,}(?:\.\d{2}))\b/)
  if (loose) return parseFloat(loose[1])
  return null
}

/** "plus a PHP 12.00 fee". BPI appends the transfer fee to the same message. */
function extractAttachedFee(text: string): number | null {
  const m = text.match(/plus\s+a?\s*PHP\s*([\d]+(?:\.\d{1,2})?)\s*fee/i)
  return m ? parseFloat(m[1]) : null
}

function extractBalance(text: string): number | null {
  const m = text.match(/(?:available balance|balance is|remaining balance|new balance)[^\d]*PHP?\s*([\d]+(?:\.\d{1,2})?)/i)
  return m ? parseFloat(m[1]) : null
}

function extractLast4(text: string): string | null {
  const masked = text.match(/(?:\*{2,}|x{2,}|ending in|ending|account)\s*[*x•\s]*?(\d{4})\b/i)
  if (masked) return masked[1]
  return null
}

function extractReference(text: string): string | null {
  // "Ref PR123", "Ref. No. 9000012345678", "Ref no. 9043...", "Reference #ABC"
  const m = text.match(/\bref(?!und)(?:erence)?\.?\s*(?:no\.?|number|#)?\s*[:#]?\s*([a-z0-9]{4,})\b/i)
  return m ? m[1].toUpperCase() : null
}

function extractCounterparty(text: string): string | null {
  // "to <NAME>" / "from <NAME>" / "at <MERCHANT>" / "for <BILLER>"
  const m = text.match(
    /\b(?:to|from|at|for)\s+([A-Z0-9][A-Za-z0-9&.\-'/ ]{2,40}?)(?=\s+(?:on|ref|with|w\/|via|PHP|for|has\b|was\b|\.)|[.,]|$)/,
  )
  if (m) return m[1].trim()
  return null
}

/** Apply "08:24:38 PM"-style time to a date. */
function applyTime(d: Date, timePart?: string): void {
  if (!timePart) return
  const m = timePart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?/i)
  if (!m) return
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  const sec = m[3] ? parseInt(m[3], 10) : 0
  const ap = m[4]?.toUpperCase()
  if (ap === 'PM' && h < 12) h += 12
  if (ap === 'AM' && h === 12) h = 0
  d.setHours(h, min, sec, 0)
}

function extractTimestamp(text: string, fallbackIso: string): string {
  // Named month: "on August 04, 2026 09:36:46 AM" / "on Jul 29 2026; 04:56:59 PM"
  const named = text.match(
    /(?:on\s+)?([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})[;,]?\s*(\d{1,2}:\d{2}(?::\d{2})?\s*[AP]M)?/,
  )
  if (named) {
    const d = new Date(named[1])
    if (!isNaN(d.getTime())) {
      applyTime(d, named[2])
      return d.toISOString()
    }
  }
  // Numeric: "08-15-26 02:11:11 AM", "08/15/2026 14:15" (PH messages are MM-DD-YY)
  const numeric = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b[;,]?\s*(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M)?)?/)
  if (numeric) {
    const mo = parseInt(numeric[1], 10)
    const da = parseInt(numeric[2], 10)
    let yr = parseInt(numeric[3], 10)
    if (yr < 100) yr += 2000
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
      const d = new Date(yr, mo - 1, da)
      applyTime(d, numeric[4])
      if (!isNaN(d.getTime())) return d.toISOString()
    }
  }
  return fallbackIso
}

function detectDirection(text: string): ParsedDirection {
  const l = text.toLowerCase()
  const isTransfer = TRANSFER_HINTS.some((w) => l.includes(w))
  const hasFee = KEYWORDS.fee.some((w) => l.includes(w))
  const hasIn = KEYWORDS.in.some((w) => l.includes(w))
  const hasOut = KEYWORDS.out.some((w) => l.includes(w))

  if (isTransfer && (hasIn || hasOut)) return 'transfer'
  // A standalone fee line with no clear direction.
  if (hasFee && !hasIn && !hasOut) return 'fee'
  if (hasIn && !hasOut) return 'in'
  if (hasOut && !hasIn) return 'out'
  if (hasIn && hasOut) {
    // Ambiguous, so lean on which keyword appears first.
    const firstIn = firstIndex(l, KEYWORDS.in)
    const firstOut = firstIndex(l, KEYWORDS.out)
    return firstOut < firstIn ? 'out' : 'in'
  }
  return 'unknown'
}

function firstIndex(text: string, words: string[]): number {
  let min = Infinity
  for (const w of words) {
    const i = text.indexOf(w)
    if (i >= 0 && i < min) min = i
  }
  return min
}

function detectCategory(text: string, direction: ParsedDirection, learned: ParseRule[]): Category {
  const l = text.toLowerCase()
  // User-learned rules win first.
  for (const r of learned) {
    if (r.enabled && r.match && l.includes(r.match.toLowerCase())) return r.category
  }
  if (direction === 'transfer') return 'transfer'
  if (direction === 'fee') return 'fee'
  for (const hint of CATEGORY_HINTS) {
    if (hint.words.some((w) => l.includes(w))) {
      if (direction === 'in' && hint.category !== 'salary') continue
      return hint.category
    }
  }
  return 'other'
}

/** Parse a raw message into a structured, low-trust preview. */
export function parseMessage(
  raw: string,
  fallbackIso: string,
  learnedRules: ParseRule[] = [],
): ParsedMessage {
  const notes: string[] = []
  const text = normalise(raw)

  const institution = detectInstitution(text)
  const direction = detectDirection(text)
  const amount = extractAmount(text)
  const attachedFee = extractAttachedFee(text)
  const balance = extractBalance(text)
  const last4 = extractLast4(text)
  const reference = extractReference(text)
  const counterparty = extractCounterparty(text)
  const timestamp = extractTimestamp(text, fallbackIso)
  const category = detectCategory(text, direction, learnedRules)

  if (attachedFee !== null) {
    notes.push(
      `This message also mentions a ₱${attachedFee.toFixed(2)} fee. You can import that as a separate fee transaction if you want it tracked.`,
    )
  }

  // Confidence is additive and transparent.
  let confidence = 0.3
  if (institution !== 'unknown') confidence += 0.2
  else notes.push('Could not confirm the bank or wallet from the text. Pick the account below.')
  if (amount !== null) confidence += 0.25
  else notes.push('No amount detected, so this needs review.')
  if (direction !== 'unknown') confidence += 0.1
  else notes.push('Unclear whether money came in or went out.')
  if (reference) confidence += 0.08
  if (last4) confidence += 0.04
  if (balance !== null) confidence += 0.03
  confidence = Math.min(0.99, Math.round(confidence * 100) / 100)

  return {
    institution,
    direction,
    amount,
    timestamp,
    last4,
    counterparty,
    reference,
    balance,
    category,
    confidence,
    notes,
    raw,
  }
}

/** Mask any long digit run and preserve only the last 4 for display. */
export function maskMessage(raw: string): string {
  return raw
    .replace(/\b(\d{2,})(\d{4})\b/g, (_m, _p1, last4) => `••••${last4}`)
    .replace(/(ref(?:erence)?\.?\s*(?:no\.?|#)?)\s*[:#]?\s*([a-z0-9]{4,})/gi, (_m, label, ref) => `${label} ${'•'.repeat(Math.max(0, ref.length - 3))}${ref.slice(-3)}`)
}
