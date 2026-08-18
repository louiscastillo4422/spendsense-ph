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

export function uid(prefix = 'tx'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
