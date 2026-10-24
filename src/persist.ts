// Storage seam for the player's progress: the only module that touches localStorage.
// Swap `storage` for a server-backed one (a zodal provider) to sync across devices.
import { createJSONStorage, type StateStorage } from 'zustand/middleware'

const safe: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      /* private mode / quota: progress is simply not kept */
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  },
}

export const storage = createJSONStorage(() => safe)
