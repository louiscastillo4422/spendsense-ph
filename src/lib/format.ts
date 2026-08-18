// Peso + date formatting helpers. All money uses ₱12,345.67 and Asia/Manila.

export const PESO = '₱'

export function peso(value: number, opts?: { sign?: boolean; hide?: boolean }): string {
  if (opts?.hide) return `${PESO}••••••`
  const abs = Math.abs(value)
  const formatted = abs.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const prefix = opts?.sign ? (value < 0 ? '−' : '+') : value < 0 ? '−' : ''
  return `${prefix}${PESO}${formatted}`
}

/** Compact peso for tight spaces: ₱12.3k */
export function pesoCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${PESO}${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${PESO}${(value / 1_000).toFixed(1)}k`
  return peso(value)
}

const MANILA = 'Asia/Manila'

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    timeZone: MANILA,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    timeZone: MANILA,
    month: 'short',
    day: 'numeric',
  })
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-PH', {
    timeZone: MANILA,
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function fmtDateTime(iso: string): string {
  return `${fmtDateShort(iso)} • ${fmtTime(iso)}`
}

/** "in 12 days", "today", "3 days ago". */
export function relativeDays(iso: string, from = new Date()): string {
  const days = daysBetween(from, new Date(iso))
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  if (days > 1) return `in ${days} days`
  return `${Math.abs(days)} days ago`
}

/** Whole-day difference (b - a), truncated toward zero at day granularity. */
export function daysBetween(a: Date, b: Date): number {
  const MS = 24 * 60 * 60 * 1000
  const da = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const db = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((db - da) / MS)
}

export function pct(value: number, total: number): number {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, (value / total) * 100))
}
