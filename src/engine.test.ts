import { describe, expect, it } from 'vitest'
import { checkMove, hintFor, sanList, solverColor, type Puzzle } from './engine'

// Real Lichess puzzle 8g4h0 (mate in 2); moves[0] is the opponent's setup move.
const p: Puzzle = {
  id: '8g4h0',
  fen: '8/1pp2pk1/p7/P2Q1Pq1/1P2r3/2P1r2P/5R1K/5R2 w - - 0 33',
  moves: ['f1g1', 'e3h3', 'h2h3', 'e4h4'],
  rating: 1388,
  themes: ['mateIn2'],
}

describe('engine', () => {
  it('solver is the side that moves after the setup move', () => {
    expect(solverColor(p)).toBe('black')
  })
  it('accepts the book move and finishes on the last one', () => {
    const played = [p.moves[0]]
    const r1 = checkMove(p, played, 'e3', 'h3')
    expect(r1).toEqual({ kind: 'correct', uci: 'e3h3', done: false })
    const r2 = checkMove(p, [...played, 'e3h3', 'h2h3'], 'e4', 'h4')
    expect(r2).toMatchObject({ kind: 'correct', done: true })
  })
  it('rejects a legal but wrong move and an illegal one', () => {
    expect(checkMove(p, [p.moves[0]], 'g5', 'g1')).toEqual({ kind: 'wrong' })
    expect(checkMove(p, [p.moves[0]], 'a6', 'a1')).toEqual({ kind: 'illegal' })
  })
  it('hints are progressive', () => {
    expect(hintFor(p, [p.moves[0]], 1)).toEqual({ from: 'e3', to: null, arrow: false })
    expect(hintFor(p, [p.moves[0]], 2)).toMatchObject({ to: 'h3', arrow: false })
    expect(hintFor(p, [p.moves[0]], 3)).toMatchObject({ arrow: true })
  })
  it('lists SAN', () => {
    expect(sanList(p, p.moves)).toHaveLength(4)
  })
})
