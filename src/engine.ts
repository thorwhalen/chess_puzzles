// Pure puzzle logic (no React, no network): replay moves, check a user move, hints.
// The Lichess convention: `fen` is the position BEFORE the opponent's first move;
// moves[0] is that opponent move, then the solver and the opponent alternate.
import { Chess, type Square } from 'chess.js'

export interface Puzzle {
  id: string
  fen: string
  moves: string[] // UCI
  rating: number
  themes: string[]
}

export type MoveCheck =
  | { kind: 'illegal' }
  | { kind: 'wrong' }
  | { kind: 'correct'; uci: string; done: boolean }

export const splitUci = (uci: string) => ({
  from: uci.slice(0, 2) as Square,
  to: uci.slice(2, 4) as Square,
  promotion: uci.length > 4 ? uci[4] : undefined,
})

/** Replay `played` (UCI list) from the puzzle's start. */
export function replay(puzzle: Puzzle, played: readonly string[]): Chess {
  const chess = new Chess(puzzle.fen)
  for (const uci of played) chess.move(splitUci(uci))
  return chess
}

/** The solver's colour: the side to move after the opponent's first move. */
export function solverColor(puzzle: Puzzle): 'white' | 'black' {
  return new Chess(puzzle.fen).turn() === 'w' ? 'black' : 'white'
}

export function sanList(puzzle: Puzzle, played: readonly string[]): string[] {
  const chess = new Chess(puzzle.fen)
  return played.map((uci) => chess.move(splitUci(uci)).san)
}

/**
 * Judge a user move. `played` has the setup move already. A move is right if it is the
 * book move, or if it gives checkmate (Lichess accepts any mate for a mating puzzle).
 * A pawn reaching the last rank promotes to the book piece when the squares match, else a queen.
 */
export function checkMove(
  puzzle: Puzzle,
  played: readonly string[],
  from: string,
  to: string,
): MoveCheck {
  const expected = puzzle.moves[played.length]
  const chess = replay(puzzle, played)
  const piece = chess.get(from as Square)
  const isPromotion = piece?.type === 'p' && (to[1] === '8' || to[1] === '1')
  const bookPromo = expected && expected.slice(0, 4) === from + to ? expected[4] : undefined
  const promotion = isPromotion ? (bookPromo ?? 'q') : undefined
  let made
  try {
    made = chess.move({ from: from as Square, to: to as Square, promotion })
  } catch {
    return { kind: 'illegal' }
  }
  const uci = made.from + made.to + (made.promotion ?? '')
  const mates = chess.isCheckmate()
  if (uci === expected || mates) {
    return { kind: 'correct', uci, done: mates || played.length + 1 >= puzzle.moves.length }
  }
  return { kind: 'wrong' }
}

export function legalTargets(puzzle: Puzzle, played: readonly string[], from: string): string[] {
  return replay(puzzle, played)
    .moves({ square: from as Square, verbose: true })
    .map((m) => m.to)
}

/** Progressive hint for the next book move: 1 = the piece, 2 = + target square, 3 = the move. */
export function hintFor(puzzle: Puzzle, played: readonly string[], level: number) {
  const expected = puzzle.moves[played.length]
  if (!expected || level < 1) return null
  const { from, to } = splitUci(expected)
  return { from, to: level >= 2 ? to : null, arrow: level >= 3 }
}
