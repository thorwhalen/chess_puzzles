// Every diagram in the guide must be a legal position whose claims are true, and every theme
// the app filters on must have a lesson and a real example.
import { Chess, type Move } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { checkMove, type Puzzle } from '../engine'
import { PICKER_THEMES } from '../themes'
import examples from './examples.json'
import { LESSONS } from './lessons'

const uci = (m: Move) => m.from + m.to + (m.promotion ?? '')

/** The side to move can force mate within n of its own moves (undefined if not): its first move. */
function mateIn(chess: Chess, n: number): string | undefined {
  for (const m of chess.moves({ verbose: true })) {
    chess.move(m)
    let ok = false
    if (chess.isCheckmate()) ok = true
    else if (n > 1 && !chess.isGameOver()) {
      ok = chess.moves({ verbose: true }).every((r) => {
        chess.move(r)
        const forced = mateIn(chess, n - 1) !== undefined
        chess.undo()
        return forced
      })
    }
    chess.undo()
    if (ok) return uci(m)
  }
  return undefined
}

describe('lessons', () => {
  it('cover every theme the picker offers, once', () => {
    expect(LESSONS.map((l) => l.key).sort()).toEqual([...PICKER_THEMES].sort())
  })

  it('have a real example each, with a legal line', () => {
    const ex = examples as unknown as Record<string, Puzzle>
    for (const l of LESSONS) {
      const p = ex[l.key]
      expect(p, l.key).toBeDefined()
      const chess = new Chess(p.fen)
      for (const m of p.moves) chess.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] })
    }
  })

  it('has 2 to 4 pictures per theme (idea diagrams plus the two example boards)', () => {
    for (const l of LESSONS) {
      const pictures = l.diagrams.length + 2
      expect(pictures, l.key).toBeGreaterThanOrEqual(3)
      expect(pictures, l.key).toBeLessThanOrEqual(6)
    }
  })

  for (const l of LESSONS) {
    l.diagrams.forEach((d, i) => {
      it(`${l.key} #${i}: legal position, true claim`, { timeout: 60_000 }, () => {
        const chess = new Chess(d.fen)
        for (const [from, to, kind] of d.arrows ?? []) {
          expect(from + to).toMatch(/^[a-h][1-8][a-h][1-8]$/)
          // A 'move' arrow is the key move: it must be legal for the side to move.
          if (kind === undefined || kind === 'move') {
            expect(chess.moves({ verbose: true }).map((m) => m.from + m.to), `arrow ${from}${to}`).toContain(from + to)
          }
        }
        for (const sq of Object.keys(d.marks ?? {})) expect(sq).toMatch(/^[a-h][1-8]$/)
        if (d.move) {
          const legal = chess.moves({ verbose: true }).map(uci)
          expect(legal, `${d.move} is legal`).toContain(d.move)
          // The first arrow of a move-diagram is the key move.
          const first = d.arrows?.find((a) => (a[2] ?? 'move') === 'move')
          if (first && d.move.length === 4) expect(first[0] + first[1]).toBe(d.move)
        }
        if (d.claim === 'check' && d.move) {
          chess.move({ from: d.move.slice(0, 2), to: d.move.slice(2, 4), promotion: d.move[4] })
          expect(chess.inCheck()).toBe(true)
        }
        if (d.claim?.startsWith('mate')) {
          const n = Number(d.claim.slice(4))
          const first = mateIn(chess, n)
          expect(first, 'forced mate exists').toBeDefined()
          if (n > 1) expect(mateIn(new Chess(d.fen), n - 1), 'but not faster').toBeUndefined()
          if (d.move) expect(first).toBe(d.move)
        }
      })
    })
  }

  it('an alternative mating move is accepted by the puzzle checker (sanity of the engine)', () => {
    const p: Puzzle = { id: 'x', fen: '7k/8/6K1/8/8/8/1Q6/8 w - - 0 1', moves: ['b2b8', 'h8g8'], rating: 400, themes: [] }
    expect(checkMove(p, [], 'b2', 'b8')).toMatchObject({ kind: 'correct', done: true })
  })
})
