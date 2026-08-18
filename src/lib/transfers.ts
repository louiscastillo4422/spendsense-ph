// ---------------------------------------------------------------------------
// Duplicate detection + internal own-account transfer detection.
// ---------------------------------------------------------------------------

import type { AppState, Transaction } from '../types'

/** Return an existing transaction that looks like a duplicate of `candidate`. */
export function findDuplicate(state: AppState, candidate: Transaction): Transaction | undefined {
  return state.transactions.find((t) => {
    if (t.id === candidate.id) return false
    if (t.account !== candidate.account) return false
    // Strong signal: same reference number.
    if (t.reference && candidate.reference && t.reference === candidate.reference) return true
    // Otherwise: same amount + direction within 5 minutes.
    const sameAmount = Math.abs(t.amount - candidate.amount) < 0.01
    const sameDir = t.direction === candidate.direction
    const closeInTime = Math.abs(+new Date(t.timestamp) - +new Date(candidate.timestamp)) < 5 * 60 * 1000
    return sameAmount && sameDir && closeInTime
  })
}

export interface TransferMatch {
  outgoing: Transaction
  incoming: Transaction
  amountDiff: number
  minutesApart: number
}

const TRANSFER_WORDS = ['transfer', 'instapay', 'pesonet', 'gcash', 'bpi', 'own', 'g-xchange', 'dragonpay']

function looksLikeTransfer(t: Transaction): boolean {
  const hay = `${t.rawMessage} ${t.counterparty ?? ''} ${t.category}`.toLowerCase()
  return t.category === 'transfer' || TRANSFER_WORDS.some((w) => hay.includes(w))
}

/**
 * Look for an unmatched outgoing leg in one account paired with an incoming
 * leg in the other account: near-equal amount, within the configured window,
 * with transfer-ish descriptions.
 */
export function detectTransfers(state: AppState): TransferMatch[] {
  const { transferWindowMinutes, transferAmountTolerance } = state.settings
  const matches: TransferMatch[] = []
  const used = new Set<string>()

  const outs = state.transactions.filter((t) => t.direction === 'out' && !t.isTransfer && !t.excluded)
  const ins = state.transactions.filter((t) => t.direction === 'in' && !t.isTransfer && !t.excluded)

  for (const out of outs) {
    if (used.has(out.id)) continue
    for (const inc of ins) {
      if (used.has(inc.id)) continue
      if (out.account === inc.account) continue
      const amountDiff = Math.abs(out.amount - inc.amount)
      if (amountDiff > transferAmountTolerance) continue
      const minutesApart = Math.abs(+new Date(out.timestamp) - +new Date(inc.timestamp)) / 60000
      if (minutesApart > transferWindowMinutes) continue
      if (!looksLikeTransfer(out) && !looksLikeTransfer(inc)) continue
      matches.push({ outgoing: out, incoming: inc, amountDiff, minutesApart: Math.round(minutesApart) })
      used.add(out.id)
      used.add(inc.id)
      break
    }
  }
  return matches
}
