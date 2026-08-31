import { describe, it, expect } from 'vitest'
import { peso, pesoCompact, daysBetween, pct } from './format'

describe('peso', () => {
  it('formats with the peso sign and two decimals', () => {
    expect(peso(1384.5)).toBe('₱1,384.50')
  })
  it('uses a minus glyph for negatives', () => {
    expect(peso(-200)).toBe('−₱200.00')
  })
  it('adds an explicit plus when sign is requested', () => {
    expect(peso(200, { sign: true })).toBe('+₱200.00')
  })
  it('hides the value when asked', () => {
    expect(peso(999, { hide: true })).toBe('₱••••••')
  })
})

describe('pesoCompact', () => {
  it('abbreviates thousands', () => expect(pesoCompact(12300)).toBe('₱12.3k'))
  it('abbreviates millions', () => expect(pesoCompact(2_000_000)).toBe('₱2.0M'))
})

describe('daysBetween', () => {
  it('counts whole days forward', () => {
    expect(daysBetween(new Date(2026, 8, 1), new Date(2026, 8, 15))).toBe(14)
  })
  it('is negative when the second date is earlier', () => {
    expect(daysBetween(new Date(2026, 8, 15), new Date(2026, 8, 1))).toBe(-14)
  })
})

describe('pct', () => {
  it('clamps to the 0..100 range', () => {
    expect(pct(5, 10)).toBe(50)
    expect(pct(20, 10)).toBe(100)
    expect(pct(-5, 10)).toBe(0)
    expect(pct(5, 0)).toBe(0)
  })
})
