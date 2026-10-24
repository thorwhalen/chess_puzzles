// The player's attempt log, and what it says about which puzzle to serve next.
// Pure functions only: the store owns the state and the storage seam owns persistence.
import { themeLabel } from './themes'

export type Outcome = 'clean' | 'helped' | 'failed'

export interface Attempt {
  id: string
  rating: number
  themes: string[]
  outcome: Outcome
  mistakes: number
  hints: number
  at: number
}

export const HISTORY_KEEP = 400
export const EXCLUDE_MAX = 300 // the server's cap on skipped ids
const WEAK_MIN_ATTEMPTS = 3
const WEAK_CLEAN_RATE = 0.5
const REVIEW_AFTER = 8 // attempts that must pass before a missed puzzle comes back
const P_REVIEW = 0.2
const P_WEAK_THEME = 0.33

export const outcomeOf = (score: number): Outcome => (score >= 1 ? 'clean' : score > 0 ? 'helped' : 'failed')

/** Newest first, capped. */
export const recordAttempt = (history: Attempt[], a: Attempt): Attempt[] => [a, ...history].slice(0, HISTORY_KEEP)

/** Each puzzle's most recent attempt, newest first. */
export function latestPerPuzzle(history: Attempt[]): Attempt[] {
  const seen = new Set<string>()
  return history.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
}

export interface ThemeStat {
  theme: string
  attempts: number
  clean: number
}

/** Per-theme tallies over each puzzle's latest attempt, so a puzzle repeated until solved counts once. */
export function themeStats(history: Attempt[]): ThemeStat[] {
  const m = new Map<string, ThemeStat>()
  for (const a of latestPerPuzzle(history))
    for (const t of a.themes) {
      const e = m.get(t) ?? { theme: t, attempts: 0, clean: 0 }
      e.attempts += 1
      if (a.outcome === 'clean') e.clean += 1
      m.set(t, e)
    }
  return [...m.values()]
}

export function weakThemes(history: Attempt[], allowed?: (theme: string) => boolean): ThemeStat[] {
  return themeStats(history)
    .filter((t) => t.attempts >= WEAK_MIN_ATTEMPTS && t.clean / t.attempts < WEAK_CLEAN_RATE && (!allowed || allowed(t.theme)))
    .sort((a, b) => a.clean / a.attempts - b.clean / b.attempts || b.attempts - a.attempts)
}

/** Ids not to serve again: recent ones plus everything already solved cleanly. */
export function excludeIds(history: Attempt[], recent: string[]): string[] {
  const clean = latestPerPuzzle(history).filter((a) => a.outcome === 'clean').map((a) => a.id)
  return [...new Set([...recent, ...clean])].slice(0, EXCLUDE_MAX)
}

export type Choice = { kind: 'fresh' } | { kind: 'theme'; theme: string } | { kind: 'review'; id: string }

/**
 * What to serve next. Mostly something new; sometimes a puzzle missed a while ago
 * (inside the rating window), sometimes the theme the player is weakest at.
 */
export function chooseNext(
  history: Attempt[],
  opts: { min: number; max: number; rand?: () => number; allowedTheme?: (theme: string) => boolean },
): Choice {
  const rand = opts.rand ?? Math.random
  const due = latestPerPuzzle(history).filter(
    (a) => a.outcome !== 'clean' && history.indexOf(a) >= REVIEW_AFTER && a.rating >= opts.min && a.rating <= opts.max,
  )
  if (due.length && rand() < P_REVIEW) return { kind: 'review', id: due[Math.floor(rand() * due.length)].id }
  const weak = weakThemes(history, opts.allowedTheme)
  if (weak.length && rand() < P_WEAK_THEME) return { kind: 'theme', theme: weak[0].theme }
  return { kind: 'fresh' }
}

export interface Summary {
  total: number
  clean: number
  helped: number
  failed: number
}

export function summarize(history: Attempt[]): Summary {
  const s = { total: history.length, clean: 0, helped: 0, failed: 0 }
  for (const a of history) s[a.outcome] += 1
  return s
}

/** "2 mistakes, 1 hint" — empty for a clean solve. */
export function effortText(a: Pick<Attempt, 'mistakes' | 'hints' | 'outcome'>): string {
  const bits = []
  if (a.mistakes) bits.push(`${a.mistakes} mistake${a.mistakes > 1 ? 's' : ''}`)
  if (a.hints) bits.push(`${a.hints} hint${a.hints > 1 ? 's' : ''}`)
  return bits.join(', ') || (a.outcome === 'failed' ? 'solution shown' : '')
}

export const noteFor = (p: Choice): string =>
  p.kind === 'review' ? 'Review: you had trouble with this one before.' : p.kind === 'theme' ? `Practice: ${themeLabel(p.theme)} is your trickiest theme.` : ''
