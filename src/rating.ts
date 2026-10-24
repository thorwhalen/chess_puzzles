// Player rating (Elo-style) and difficulty bands. Constants live here, nowhere else.
export const RATING_MIN = 400
export const RATING_MAX = 1500 // the data stops here
export const START_RATING = 800
export const K_FACTOR = 24
export const ADAPTIVE_WINDOW = 200

export interface Band {
  key: string
  label: string
  min: number
  max: number
}

export const BANDS: Band[] = [
  { key: 'beginner', label: 'Beginner', min: 400, max: 900 },
  { key: 'easy', label: 'Easy', min: 900, max: 1200 },
  { key: 'intermediate', label: 'Intermediate', min: 1200, max: 1500 },
]
export const ADAPTIVE = 'adaptive'

/** Score of one puzzle: 1 clean solve, 0.5 solved with a little help, 0 otherwise. */
export function scoreOf(o: { solved: boolean; mistakes: number; hints: number; revealed: boolean }) {
  if (!o.solved || o.revealed) return 0
  const help = o.mistakes + o.hints
  return help === 0 ? 1 : help <= 2 ? 0.5 : 0
}

export function updateRating(player: number, puzzle: number, score: number): number {
  const expected = 1 / (1 + 10 ** ((puzzle - player) / 400))
  const next = Math.round(player + K_FACTOR * (score - expected))
  return Math.min(RATING_MAX, Math.max(RATING_MIN, next))
}

/** The rating window to draw puzzles from for a band key (or adaptive around the player). */
export function windowFor(bandKey: string, playerRating: number): { min: number; max: number } {
  const band = BANDS.find((b) => b.key === bandKey)
  if (band) return { min: band.min, max: band.max }
  return {
    min: Math.max(RATING_MIN, playerRating - ADAPTIVE_WINDOW),
    max: Math.min(RATING_MAX, playerRating + ADAPTIVE_WINDOW),
  }
}
