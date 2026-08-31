// localStorage persistence for the prototype. Everything stays on-device.

import type { AppState } from '../types'
import { makeSeedState } from './seed'

const KEY = 'spendsense-ph-v1'

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return makeSeedState()
    const parsed = JSON.parse(raw) as AppState
    if (!parsed || parsed.version !== 1) return makeSeedState()
    return parsed
  } catch {
    return makeSeedState()
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage might be full or blocked (private mode). The prototype still works in-memory.
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function exportState(state: AppState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `spendsense-ph-export-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Parse and validate a JSON backup produced by exportState. Throws an Error
 * with a friendly message if the file is not a valid SpendSense export, so the
 * caller can surface it without ever loading a broken state.
 */
export function parseImportedState(text: string): AppState {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("That file isn't valid JSON. Pick a file exported from SpendSense.")
  }

  const s = data as Partial<AppState>
  const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

  if (!isObject(s) || s.version !== 1) {
    throw new Error("This doesn't look like a SpendSense backup (version mismatch).")
  }
  if (!isObject(s.accounts) || !isObject(s.accounts.bpi) || !isObject(s.accounts.gcash)) {
    throw new Error('The backup is missing account data.')
  }
  if (!Array.isArray(s.transactions) || !Array.isArray(s.bills) || !Array.isArray(s.goals) || !Array.isArray(s.parseRules)) {
    throw new Error('The backup is missing transactions, bills, goals or parse rules.')
  }
  if (!isObject(s.settings) || !isObject(s.settings.income) || !isObject(s.automation)) {
    throw new Error('The backup is missing settings.')
  }

  return data as AppState
}

/** Read a File chosen from an <input type="file"> and validate it as a backup. */
export function importStateFromFile(file: File): Promise<AppState> {
  return file.text().then(parseImportedState)
}

export function uid(prefix = 'tx'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
