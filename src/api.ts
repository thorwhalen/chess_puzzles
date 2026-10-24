// Network layer. The Zod schema is the one definition of a puzzle on the wire.
import { z } from 'zod'
import type { Puzzle } from './engine'

// enlace mounts the backend at /api/{app}; in dev, vite proxies it (vite.config.ts).
const API_BASE = '/api/chess_puzzles'

const PuzzleSchema = z.object({
  id: z.string(),
  fen: z.string(),
  moves: z.array(z.string()).min(2),
  rating: z.number(),
  themes: z.array(z.string()),
})
const MetaSchema = z.object({ themes: z.record(z.string(), z.number()), count: z.number() })

async function getJson(path: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${API_BASE}${path}${qs ? `?${qs}` : ''}`)
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail.detail ?? `Request failed (${res.status})`)
  }
  return res.json()
}

export interface Filters {
  min: number
  max: number
  theme: string | null
  exclude: string[]
}

export async function fetchNext(f: Filters): Promise<Puzzle> {
  const params: Record<string, string> = {
    min_rating: String(f.min),
    max_rating: String(f.max),
    exclude: f.exclude.join(','),
  }
  if (f.theme) params.theme = f.theme
  return PuzzleSchema.parse(await getJson('/next', params))
}

export async function fetchMeta() {
  return MetaSchema.parse(await getJson('/meta'))
}

export async function fetchPuzzle(id: string): Promise<Puzzle> {
  return PuzzleSchema.parse(await getJson(`/puzzle/${encodeURIComponent(id)}`))
}
