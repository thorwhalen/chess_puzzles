import { describe, expect, it } from 'vitest'
import { chooseNext, excludeIds, outcomeOf, recordAttempt, summarize, weakThemes, HISTORY_KEEP, type Attempt } from './history'
import { parseRoute, formatRoute } from './route'

const att = (id: string, outcome: Attempt['outcome'], themes = ['fork'], rating = 800): Attempt =>
  ({ id, rating, themes, outcome, mistakes: 0, hints: 0, at: 0 })

describe('history', () => {
  it('maps scores to outcomes', () => {
    expect([1, 0.5, 0].map(outcomeOf)).toEqual(['clean', 'helped', 'failed'])
  })
  it('keeps newest first and caps the log', () => {
    let h: Attempt[] = []
    for (let i = 0; i < HISTORY_KEEP + 5; i++) h = recordAttempt(h, att(`p${i}`, 'clean'))
    expect(h).toHaveLength(HISTORY_KEEP)
    expect(h[0].id).toBe(`p${HISTORY_KEEP + 4}`)
  })
  it('excludes cleanly solved puzzles but not missed ones', () => {
    const h = [att('a', 'clean'), att('b', 'failed')]
    expect(excludeIds(h, ['r'])).toEqual(['r', 'a'])
  })
  it('a puzzle repeated until solved counts once, by its latest attempt', () => {
    const h = [att('a', 'clean'), att('a', 'failed'), att('b', 'failed'), att('c', 'failed')]
    expect(summarize(h)).toMatchObject({ total: 4 })
    expect(weakThemes(h)[0]).toMatchObject({ theme: 'fork', attempts: 3, clean: 1 })
  })
  it('finds weak themes only after enough attempts', () => {
    expect(weakThemes([att('a', 'failed'), att('b', 'failed')])).toEqual([])
  })
  it('serves something fresh with an empty log', () => {
    expect(chooseNext([], { min: 400, max: 1500, rand: () => 0 })).toEqual({ kind: 'fresh' })
  })
  it('brings back a missed puzzle only after a while and inside the window', () => {
    const missed = att('old', 'failed', ['pin'], 700)
    const filler = Array.from({ length: 8 }, (_, i) => att(`f${i}`, 'clean', ['mateIn1']))
    const opts = { rand: () => 0 }
    expect(chooseNext([missed, ...filler], { min: 400, max: 1500, ...opts })).toEqual({ kind: 'fresh' }) // too recent
    expect(chooseNext([...filler, missed], { min: 400, max: 1500, ...opts })).toEqual({ kind: 'review', id: 'old' })
    expect(chooseNext([...filler, missed], { min: 1000, max: 1500, ...opts })).toEqual({ kind: 'fresh' }) // outside the window
  })
  it('steers to the weakest theme', () => {
    const h = [att('a', 'failed', ['pin']), att('b', 'failed', ['pin']), att('c', 'failed', ['pin']), att('d', 'clean', ['fork'])]
    expect(chooseNext(h, { min: 400, max: 1500, rand: () => 0.3 })).toEqual({ kind: 'theme', theme: 'pin' })
  })
})

describe('route', () => {
  it('round-trips the log', () => {
    expect(parseRoute('#/log')).toEqual({ name: 'log' })
    expect(formatRoute({ name: 'log' })).toBe('#/log')
  })
})
