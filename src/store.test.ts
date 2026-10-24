import { beforeEach, describe, expect, it, vi } from 'vitest'

const puzzle = {
  id: 'aBRlI',
  fen: '2r3k1/1p3ppp/3p3q/3P1b2/5N2/Pp2Q1P1/1PR4P/K6R b - - 0 27',
  moves: ['c8c2', 'e3e8'], // mate in 1 for the solver (white)
  rating: 554,
  themes: ['mateIn1'],
}
vi.mock('./api', () => ({ fetchNext: vi.fn(async () => puzzle), fetchPuzzle: vi.fn(async () => puzzle), fetchMeta: vi.fn() }))
vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} })

const { useStore } = await import('./store')

async function loaded() {
  vi.useFakeTimers()
  await useStore.getState().loadNext()
  vi.advanceTimersByTime(600)
}

describe('store', () => {
  beforeEach(() => useStore.setState({ rating: 800, streak: 0, scored: false, puzzle: null, recent: [] }))

  it('a clean solve scores and extends the streak', async () => {
    await loaded()
    expect(useStore.getState().playerMove('e3', 'e8')).toBe(true)
    const s = useStore.getState()
    expect(s.status).toBe('solved')
    expect(s.streak).toBe(1)
    expect(s.rating).toBeGreaterThan(800)
  })

  it('retry does not erase mistakes: a mistaken puzzle never earns a clean solve', async () => {
    await loaded()
    for (let i = 0; i < 3; i++) useStore.getState().playerMove('e3', 'e7') // wrong, legal
    expect(useStore.getState().mistakes).toBe(3)
    useStore.getState().retry()
    vi.advanceTimersByTime(600)
    expect(useStore.getState().mistakes).toBe(3)
    useStore.getState().playerMove('e3', 'e8')
    expect(useStore.getState().streak).toBe(0)
  })

  it('a stale loadNext response cannot overwrite a newer one', async () => {
    const api = await import('./api')
    const slow = { ...puzzle, id: 'slow' }
    let release!: () => void
    vi.mocked(api.fetchNext).mockImplementationOnce(() => new Promise((r) => (release = () => r(slow))))
    const first = useStore.getState().loadNext()
    await useStore.getState().loadNext() // newer: resolves with `puzzle`
    release()
    await first
    expect(useStore.getState().puzzle?.id).toBe('aBRlI')
  })
})

describe('history in the store', () => {
  beforeEach(() => useStore.setState({ rating: 800, streak: 0, scored: false, puzzle: null, recent: [], history: [], solveSeq: 0 }))

  it('records a clean solve and signals a celebration', async () => {
    await loaded()
    useStore.getState().playerMove('e3', 'e8')
    const s = useStore.getState()
    expect(s.history).toHaveLength(1)
    expect(s.history[0]).toMatchObject({ id: 'aBRlI', outcome: 'clean', mistakes: 0, hints: 0 })
    expect(s.solveSeq).toBe(1)
  })

  it('records mistakes and hints on a helped solve', async () => {
    await loaded()
    useStore.getState().playerMove('e3', 'e1') // wrong
    useStore.getState().hint()
    useStore.getState().playerMove('e3', 'e8')
    expect(useStore.getState().history[0]).toMatchObject({ outcome: 'helped', mistakes: 1, hints: 1 })
  })

  it('a shown solution is a failed attempt and no celebration', async () => {
    await loaded()
    useStore.getState().reveal()
    const s = useStore.getState()
    expect(s.history[0].outcome).toBe('failed')
    expect(s.solveSeq).toBe(0)
  })
})

describe('retry after a failure', () => {
  beforeEach(() => useStore.setState({ rating: 800, streak: 0, scored: false, puzzle: null, recent: [], history: [], solveSeq: 0 }))

  it('a re-solve is logged as helped, without a second celebration', async () => {
    await loaded()
    useStore.getState().reveal()
    vi.advanceTimersByTime(5000)
    useStore.getState().retry()
    vi.advanceTimersByTime(600)
    useStore.getState().playerMove('e3', 'e8')
    const s = useStore.getState()
    expect(s.history.map((a) => a.outcome)).toEqual(['helped', 'failed'])
    expect(s.solveSeq).toBe(0)
  })

  it('changing the filter does not score the open puzzle', async () => {
    await loaded()
    useStore.getState().playerMove('e3', 'e1') // a mistake
    await useStore.getState().setBand('easy')
    expect(useStore.getState().history).toHaveLength(0)
  })
})
