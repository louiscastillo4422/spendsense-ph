import { describe, it, expect } from 'vitest'
import { parseMessage, maskMessage } from './parser'

const FALLBACK = '2026-08-31T00:00:00.000Z'

describe('parseMessage — GCash payment (money out)', () => {
  const msg =
    'You have paid P1,384.50 GCash to DIN TAI FUN on 08-14-26 08:24:38 PM. Your new balance is P13,977.90. Ref. No. 9000012345678'
  const p = parseMessage(msg, FALLBACK)

  it('detects the GCash institution', () => expect(p.institution).toBe('gcash'))
  it('detects an outgoing direction', () => expect(p.direction).toBe('out'))
  it('extracts the amount, stripping the thousands separator', () => expect(p.amount).toBe(1384.5))
  it('extracts the reported balance', () => expect(p.balance).toBe(13977.9))
  it('extracts and upper-cases the reference', () => expect(p.reference).toBe('9000012345678'))
  it('leaves an unknown merchant uncategorised rather than guessing', () =>
    expect(p.category).toBe('other'))
})

describe('parseMessage — category hints', () => {
  it('categorises a known food merchant as food', () => {
    const p = parseMessage('You have paid P250.00 GCash to Jollibee on 08-14-26 08:24:38 PM.', FALLBACK)
    expect(p.category).toBe('food')
  })
  it('categorises a known biller as bills', () => {
    const p = parseMessage('BPI: Your account was deducted P1,500.00 for MERALCO on August 04, 2026 09:36:46 AM.', FALLBACK)
    expect(p.category).toBe('bills')
  })
})

describe('parseMessage — GCash received (money in)', () => {
  const msg =
    'You received P4289.00 from JUAN D. w/ MSG - . New balance is P8666.90 08-15-26 12:41 AM. Ref no. 9043900011122'
  const p = parseMessage(msg, FALLBACK)

  it('detects an incoming direction', () => expect(p.direction).toBe('in'))
  it('extracts the amount without a decimal-comma', () => expect(p.amount).toBe(4289))
  it('does not misclassify plain money-in as salary', () => expect(p.category).toBe('other'))
})

describe('parseMessage — BPI deduction with an attached fee', () => {
  const msg =
    'BPI: Your BPI account was deducted P15,000.00 plus a P12.00 fee on August 04, 2026 09:36:46 AM for DRAGONPAY CORP.'
  const p = parseMessage(msg, FALLBACK)

  it('detects BPI', () => expect(p.institution).toBe('bpi'))
  it('detects an outgoing direction', () => expect(p.direction).toBe('out'))
  it('picks the principal amount, not the fee', () => expect(p.amount).toBe(15000))
  it('surfaces the attached fee in the notes', () =>
    expect(p.notes.some((n) => n.includes('12.00'))).toBe(true))
})

describe('parseMessage — BPI transfer to GCash', () => {
  const msg =
    'BPI: You have transferred PHP 10000 to GCash/G-Xchange on Jul 29 2026; 04:56:59 PM (GMT +8).'
  const p = parseMessage(msg, FALLBACK)

  it('classifies the leg as a transfer', () => expect(p.direction).toBe('transfer'))
  it('sets the transfer category', () => expect(p.category).toBe('transfer'))
  it('attributes it to the FIRST-named institution (BPI, the sender)', () =>
    expect(p.institution).toBe('bpi'))
  it('extracts the transferred amount', () => expect(p.amount).toBe(10000))
})

describe('parseMessage — salary deposit', () => {
  const msg = 'BPI: Your payroll salary of PHP 42,000.00 has been credited on August 15, 2026.'
  const p = parseMessage(msg, FALLBACK)

  it('detects income', () => expect(p.direction).toBe('in'))
  it('categorises salary', () => expect(p.category).toBe('salary'))
})

describe('parseMessage — confidence & degradation', () => {
  it('gives low confidence and review notes to an unparseable message', () => {
    const p = parseMessage('hello there, lunch tomorrow?', FALLBACK)
    expect(p.amount).toBeNull()
    expect(p.institution).toBe('unknown')
    expect(p.confidence).toBeLessThan(0.5)
    expect(p.notes.length).toBeGreaterThan(0)
  })

  it('never reports confidence above the 0.99 ceiling', () => {
    const msg =
      'BPI: Your BPI account ending in 1234 was deducted PHP 500.00 for SHOPEE on August 04, 2026 09:36:46 AM. Ref. No. 9000012345678. Available balance is PHP 5000.00.'
    const p = parseMessage(msg, FALLBACK)
    expect(p.confidence).toBeLessThanOrEqual(0.99)
    expect(p.confidence).toBeGreaterThan(0.7)
  })

  it('falls back to the provided ISO date when none is present', () => {
    const p = parseMessage('Received PHP 100.00', FALLBACK)
    expect(p.timestamp).toBe(FALLBACK)
  })
})

describe('maskMessage', () => {
  it('masks long digit runs but keeps the last 4', () => {
    expect(maskMessage('Ref number 9000012345678')).toContain('••••5678')
  })

  it('does not expose the full reference tail', () => {
    const masked = maskMessage('Ref. No. 9000012345678')
    expect(masked).not.toContain('9000012345678')
  })
})
