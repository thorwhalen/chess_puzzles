// One zustand store (immer for updates): persisted progress + the live puzzle session.
// All game rules are in engine.ts; this file sequences them over time (opponent replies,
// solution playback) and keeps score.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { fetchNext } from './api'
import { checkMove, replay, solverColor, type Puzzle } from './engine'
import { storage } from './persist'
import { ADAPTIVE, RATING_MAX, RATING_MIN, scoreOf, START_RATING, updateRating, windowFor } from './rating'

const OPPONENT_DELAY_MS = 450
const REVEAL_STEP_MS = 800
const RECENT_KEEP = 150
const STORE_KEY = 'chess_puzzles.progress.v1'

export type Status = 'loading' | 'playing' | 'busy' | 'solved' | 'error'

interface State {
  // persisted progress
  rating: number
  streak: number
  bestStreak: number
  solvedCount: number
  attemptedCount: number
  recent: string[]
  band: string
  theme: string | null
  // session
  puzzle: Puzzle | null
  played: string[]
  status: Status
  message: string
  mistakes: number
  hints: number
  hintLevel: number
  revealed: boolean
  scored: boolean
  ratingDelta: number | null
  flipped: boolean
  selected: string | null
  wrongSquare: string | null
  // actions
  loadNext: () => Promise<void>
  playerMove: (from: string, to: string) => boolean
  select: (sq: string | null) => void
  hint: () => void
  takeBack: () => void
  retry: () => void
  reveal: () => void
  flip: () => void
  setBand: (band: string) => void
  setTheme: (theme: string | null) => void
}

let timer: ReturnType<typeof setTimeout> | undefined
let loadSeq = 0 // only the newest loadNext may touch the session
const later = (fn: () => void, ms: number) => {
  clearTimeout(timer)
  timer = setTimeout(fn, ms)
}

export const useStore = create<State>()(
  persist(
    immer((set, get) => {
      const startSession = (puzzle: Puzzle) => {
        clearTimeout(timer)
        set((s) => {
          s.puzzle = puzzle
          s.played = []
          s.status = 'busy'
          s.message = ''
          s.mistakes = 0
          s.hints = 0
          s.hintLevel = 0
          s.revealed = false
          s.scored = false
          s.ratingDelta = null
          s.flipped = false
          s.selected = null
          s.wrongSquare = null
        })
        later(() => {
          set((s) => {
            s.played = [puzzle.moves[0]]
            s.status = 'playing'
            s.message = `Your move — find the best move for ${solverColor(puzzle)}.`
          })
        }, OPPONENT_DELAY_MS)
      }

      const score = (outcome: { solved: boolean }) =>
        set((s) => {
          if (s.scored || !s.puzzle) return
          s.scored = true
          const sc = scoreOf({ ...outcome, mistakes: s.mistakes, hints: s.hints, revealed: s.revealed })
          const next = updateRating(s.rating, s.puzzle.rating, sc)
          s.ratingDelta = next - s.rating
          s.rating = next
          s.attemptedCount += 1
          if (sc > 0) s.solvedCount += 1
          s.streak = sc === 1 ? s.streak + 1 : 0
          s.bestStreak = Math.max(s.bestStreak, s.streak)
        })

      return {
        rating: START_RATING,
        streak: 0,
        bestStreak: 0,
        solvedCount: 0,
        attemptedCount: 0,
        recent: [],
        band: ADAPTIVE,
        theme: null,
        puzzle: null,
        played: [],
        status: 'loading',
        message: '',
        mistakes: 0,
        hints: 0,
        hintLevel: 0,
        revealed: false,
        scored: false,
        ratingDelta: null,
        flipped: false,
        selected: null,
        wrongSquare: null,

        loadNext: async () => {
          clearTimeout(timer)
          const s0 = get()
          // Skipping after a mistake or hint counts as a failed attempt; a clean skip is free.
          if (s0.puzzle && !s0.scored && s0.status !== 'loading' && (s0.mistakes > 0 || s0.hints > 0))
            score({ solved: false })
          const mine = ++loadSeq
          set((s) => {
            s.status = 'loading'
            s.message = ''
          })
          const { rating, band, theme, recent } = get()
          const w = windowFor(band, rating)
          try {
            const puzzle = await fetchNext({ ...w, theme, exclude: recent })
            if (mine !== loadSeq) return
            set((s) => {
              s.recent = [puzzle.id, ...s.recent].slice(0, RECENT_KEEP)
            })
            startSession(puzzle)
          } catch (e) {
            if (mine !== loadSeq) return
            set((s) => {
              s.status = 'error'
              s.message = e instanceof Error ? e.message : 'Could not load a puzzle.'
            })
          }
        },

        playerMove: (from, to) => {
          const { puzzle, played, status } = get()
          if (!puzzle || status !== 'playing') return false
          const res = checkMove(puzzle, played, from, to)
          if (res.kind === 'illegal') {
            set((s) => {
              s.selected = null
            })
            return false
          }
          if (res.kind === 'wrong') {
            set((s) => {
              s.mistakes += 1
              s.selected = null
              s.wrongSquare = to
              s.message = 'Not the best move — try again.'
            })
            later(() => set((s) => void (s.wrongSquare = null)), 700)
            return false
          }
          const next = [...played, res.uci]
          set((s) => {
            s.played = next
            s.selected = null
            s.hintLevel = 0
            s.wrongSquare = null
          })
          if (res.done) {
            score({ solved: true })
            set((s) => {
              s.status = 'solved'
              s.message = 'Solved!'
            })
            return true
          }
          set((s) => {
            s.status = 'busy'
            s.message = 'Good move…'
          })
          later(() => {
            set((s) => {
              s.played.push(puzzle.moves[next.length])
              s.status = 'playing'
              s.message = 'Keep going — what is next?'
            })
          }, OPPONENT_DELAY_MS)
          return true
        },

        select: (sq) => set((s) => void (s.selected = sq)),

        hint: () => {
          const { status, hintLevel } = get()
          if (status !== 'playing' || hintLevel >= 3) return
          set((s) => {
            s.hintLevel += 1
            s.hints += 1
            s.message = ['Look at the highlighted piece.', 'Move it to the marked square.', 'Here is the move.'][s.hintLevel - 1]
          })
        },

        takeBack: () => {
          const { status, played } = get()
          if (status !== 'playing' || played.length < 3) return
          set((s) => {
            s.played = s.played.slice(0, -2)
            s.hintLevel = 0
            s.selected = null
            s.wrongSquare = null
            s.message = 'Took back your last move.'
          })
        },

        retry: () => {
          const { puzzle } = get()
          if (!puzzle) return
          const { scored, ratingDelta, mistakes, hints, revealed } = get()
          startSession(puzzle)
          set((s) => {
            // A retry never scores twice and never erases the help already used.
            s.scored = scored
            s.ratingDelta = ratingDelta
            s.mistakes = mistakes
            s.hints = hints
            s.revealed = revealed
          })
        },

        reveal: () => {
          const { puzzle, status } = get()
          if (!puzzle || status !== 'playing') return
          set((s) => {
            s.revealed = true
            s.wrongSquare = null
            s.status = 'busy'
            s.message = 'Solution:'
          })
          score({ solved: false })
          const step = () => {
            const n = get().played.length
            if (n >= puzzle.moves.length) {
              set((s) => {
                s.status = 'solved'
                s.message = 'That was the solution. Try a retry or the next puzzle.'
              })
              return
            }
            set((s) => void s.played.push(puzzle.moves[n]))
            later(step, REVEAL_STEP_MS)
          }
          later(step, 300)
        },

        flip: () => set((s) => void (s.flipped = !s.flipped)),
        setBand: (band) => {
          set((s) => void (s.band = band))
          void get().loadNext()
        },
        setTheme: (theme) => {
          set((s) => void (s.theme = theme))
          void get().loadNext()
        },
      }
    }),
    {
      name: STORE_KEY,
      storage,
      merge: (persisted, current) => ({ ...current, ...sanitize(persisted) }),
      partialize: (s) => ({
        rating: s.rating,
        streak: s.streak,
        bestStreak: s.bestStreak,
        solvedCount: s.solvedCount,
        attemptedCount: s.attemptedCount,
        recent: s.recent,
        band: s.band,
        theme: s.theme,
      }),
    },
  ),
)

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)

/** Keep only well-typed fields from persisted state; a corrupt value falls back to its default. */
function sanitize(p: unknown): Partial<State> {
  const o = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>
  return {
    rating: Math.min(RATING_MAX, Math.max(RATING_MIN, num(o.rating, START_RATING))),
    streak: num(o.streak, 0),
    bestStreak: num(o.bestStreak, 0),
    solvedCount: num(o.solvedCount, 0),
    attemptedCount: num(o.attemptedCount, 0),
    recent: Array.isArray(o.recent) ? o.recent.filter((x): x is string => typeof x === 'string').slice(0, RECENT_KEEP) : [],
    band: typeof o.band === 'string' ? o.band : ADAPTIVE,
    theme: typeof o.theme === 'string' ? o.theme : null,
  }
}

/** Position on the board for the current session. */
export function currentChess(s: Pick<State, 'puzzle' | 'played'>) {
  return s.puzzle ? replay(s.puzzle, s.played) : null
}
