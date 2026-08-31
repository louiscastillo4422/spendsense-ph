import { describe, it, expect } from 'vitest'
import { findDuplicate, detectTransfers } from './transfers'
import { makeState, tx } from './testFixtures'

describe('findDuplicate', () => {
  it('flags a same-account transaction sharing a reference number', () => {
    const existing = tx({ id: 'a', account: 'gcash', reference: 'REF123', amount: 500, direction: 'out' })
    const state = makeState({ transactions: [existing] })
    const candidate = tx({ id: 'b', account: 'gcash', reference: 'REF123', amount: 999, direction: 'in' })
    expect(findDuplicate(state, candidate)?.id).toBe('a')
  })

  it('flags a same amount + direction within five minutes', () => {
    const existing = tx({ id: 'a', account: 'gcash', amount: 500, direction: 'out', timestamp: '2026-08-15T10:00:00.000Z' })
    const state = makeState({ transactions: [existing] })
    const candidate = tx({ id: 'b', account: 'gcash', amount: 500, direction: 'out', timestamp: '2026-08-15T10:03:00.000Z' })
    expect(findDuplicate(state, candidate)?.id).toBe('a')
  })

  it('does not flag the same amount in a different account', () => {
    const existing = tx({ id: 'a', account: 'bpi', amount: 500, direction: 'out', timestamp: '2026-08-15T10:00:00.000Z' })
    const state = makeState({ transactions: [existing] })
    const candidate = tx({ id: 'b', account: 'gcash', amount: 500, direction: 'out', timestamp: '2026-08-15T10:03:00.000Z' })
    expect(findDuplicate(state, candidate)).toBeUndefined()
  })

  it('does not flag when the two are more than five minutes apart', () => {
    const existing = tx({ id: 'a', account: 'gcash', amount: 500, direction: 'out', timestamp: '2026-08-15T10:00:00.000Z' })
    const state = makeState({ transactions: [existing] })
    const candidate = tx({ id: 'b', account: 'gcash', amount: 500, direction: 'out', timestamp: '2026-08-15T10:30:00.000Z' })
    expect(findDuplicate(state, candidate)).toBeUndefined()
  })
})

describe('detectTransfers', () => {
  it('pairs an outgoing and incoming leg across accounts within the window', () => {
    const state = makeState({
      transactions: [
        tx({ id: 'out', account: 'bpi', direction: 'out', amount: 10000, category: 'transfer', timestamp: '2026-08-15T10:00:00.000Z' }),
        tx({ id: 'in', account: 'gcash', direction: 'in', amount: 10000, category: 'transfer', timestamp: '2026-08-15T10:03:00.000Z' }),
      ],
    })
    const matches = detectTransfers(state)
    expect(matches).toHaveLength(1)
    expect(matches[0].outgoing.id).toBe('out')
    expect(matches[0].incoming.id).toBe('in')
    expect(matches[0].minutesApart).toBe(3)
  })

  it('does not pair unrelated spending and income', () => {
    const state = makeState({
      transactions: [
        tx({ id: 'out', account: 'bpi', direction: 'out', amount: 500, category: 'food', rawMessage: 'paid to Jollibee', timestamp: '2026-08-15T10:00:00.000Z' }),
        tx({ id: 'in', account: 'gcash', direction: 'in', amount: 4000, category: 'other', rawMessage: 'received from Juan', timestamp: '2026-08-15T10:03:00.000Z' }),
      ],
    })
    expect(detectTransfers(state)).toHaveLength(0)
  })

  it('respects the amount tolerance', () => {
    const state = makeState({
      transactions: [
        tx({ id: 'out', account: 'bpi', direction: 'out', amount: 10000, category: 'transfer', timestamp: '2026-08-15T10:00:00.000Z' }),
        tx({ id: 'in', account: 'gcash', direction: 'in', amount: 10500, category: 'transfer', timestamp: '2026-08-15T10:03:00.000Z' }),
      ],
    })
    // 500 diff exceeds the 50 default tolerance
    expect(detectTransfers(state)).toHaveLength(0)
  })
})
