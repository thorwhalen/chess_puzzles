import { useEffect, useMemo, useState } from 'react'
import { Board } from './Board'
import { fetchMeta } from './api'
import { sanList, solverColor } from './engine'
import { BANDS, ADAPTIVE } from './rating'
import { useStore } from './store'
import { PICKER_THEMES, themeLabel } from './themes'

function MoveList() {
  const { puzzle, played } = useStore()
  const sans = useMemo(() => (puzzle ? sanList(puzzle, played) : []), [puzzle, played])
  if (!puzzle) return null
  // The first ply is the opponent's setup move; number plies from the puzzle's own start.
  const startsBlack = puzzle.fen.split(' ')[1] === 'b'
  const items = sans.map((san, i) => {
    const black = startsBlack ? i % 2 === 0 : i % 2 === 1
    const num = Math.floor((i + (startsBlack ? 1 : 0)) / 2) + Number(puzzle.fen.split(' ')[5] ?? 1)
    return (
      <span key={i} className="mv">
        {(!black || i === 0) && <b>{num}{black ? '…' : '.'}</b>}
        {san}
      </span>
    )
  })
  return (
    <ol className="moves" aria-label="Move list" data-testid="moves">
      {items.length ? items : <span className="muted">Moves appear here.</span>}
    </ol>
  )
}

function Settings({ onClose }: { onClose: () => void }) {
  const s = useStore()
  const [counts, setCounts] = useState<Record<string, number>>({})
  useEffect(() => {
    fetchMeta().then((m) => setCounts(m.themes)).catch(() => {})
  }, [])
  const themes = PICKER_THEMES.filter((t) => !Object.keys(counts).length || counts[t])
  return (
    <div className="sheet" role="dialog" aria-label="Settings">
      <div className="sheet-head">
        <h2>Choose puzzles</h2>
        <button className="btn" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="field">
        <span className="label">Difficulty</span>
        <div className="chips">
          {[{ key: ADAPTIVE, label: 'Adaptive' }, ...BANDS].map((b) => (
            <button key={b.key} className={`chip${s.band === b.key ? ' on' : ''}`} onClick={() => s.setBand(b.key)}>
              {b.label}
            </button>
          ))}
        </div>
        <span className="muted small">
          {s.band === ADAPTIVE ? `Puzzles near your rating (${s.rating}).` : BANDS.find((b) => b.key === s.band)?.min + '–' + BANDS.find((b) => b.key === s.band)?.max + ' rated.'}
        </span>
      </div>
      <label className="field">
        <span className="label">Theme</span>
        <select value={s.theme ?? ''} onChange={(e) => s.setTheme(e.target.value || null)}>
          <option value="">Any theme</option>
          {themes.map((t) => (
            <option key={t} value={t}>{themeLabel(t)}{counts[t] ? ` (${counts[t]})` : ''}</option>
          ))}
        </select>
      </label>
      <p className="muted small">
        Solved {s.solvedCount} of {s.attemptedCount} · best streak {s.bestStreak}. Progress is saved on this device.
      </p>
      <button className="btn primary" onClick={onClose}>Done</button>
    </div>
  )
}

export default function App() {
  const s = useStore()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!useStore.getState().puzzle) void useStore.getState().loadNext()
  }, [])
  const puzzle = s.puzzle
  const turn = puzzle ? solverColor(puzzle) : null
  const playing = s.status === 'playing'
  const done = s.status === 'solved'

  return (
    <main className="app">
      <header className="top">
        <h1>Chess Puzzles</h1>
        <div className="stats" aria-label="Your progress">
          <span className="stat" title="Your rating">♟ {s.rating}
            {s.ratingDelta ? <em className={s.ratingDelta > 0 ? 'up' : 'down'}> {s.ratingDelta > 0 ? '+' : ''}{s.ratingDelta}</em> : null}
          </span>
          <span className="stat" title="Current streak">Streak {s.streak}</span>
          <button className="btn icon" onClick={() => setOpen(true)} aria-label="Difficulty and themes">⚙</button>
        </div>
      </header>

      <div className="turn" aria-live="polite">
        {turn && <span className={`dot ${turn}`} />}
        {turn ? `${turn === 'white' ? 'White' : 'Black'} to move` : 'Loading…'}
        {s.theme && <span className="tag">{themeLabel(s.theme)}</span>}
        {done && puzzle && <span className="muted"> · puzzle {puzzle.rating}</span>}
      </div>

      <Board />

      <p className={`msg${s.status === 'error' ? ' err' : ''}`} role="status" aria-live="polite" data-testid="msg">
        {s.status === 'loading' ? 'Loading puzzle…' : s.message}
      </p>
      {done && puzzle && (
        <div className="chips" data-testid="themes">
          {puzzle.themes.map((t) => <span key={t} className="tag">{themeLabel(t)}</span>)}
        </div>
      )}

      <div className="actions">
        <button className="btn" disabled={!playing || s.hintLevel >= 3} onClick={s.hint}>
          <i>?</i><span>Hint{s.hintLevel ? ` ${s.hintLevel}/3` : ''}</span>
        </button>
        <button className="btn" disabled={!playing || s.played.length < 3} onClick={s.takeBack}>↩<span>Take back</span></button>
        <button className="btn" disabled={!puzzle || s.status === 'loading'} onClick={s.retry}>⟲<span>Retry</span></button>
        <button className="btn" disabled={!playing} onClick={s.reveal}><i>▶</i><span>Solution</span></button>
        <button className="btn" disabled={!puzzle} onClick={s.flip}>⇅<span>Flip</span></button>
      </div>
      <button className={`btn primary next${done ? ' pulse' : ''}`} onClick={() => void s.loadNext()} disabled={s.status === 'loading'}>
        {done ? 'Next puzzle ▸' : s.status === 'error' ? 'Try again' : 'Skip ▸'}
      </button>

      <MoveList />
      {open && <Settings onClose={() => setOpen(false)} />}
      <footer className="foot">Puzzles: Lichess puzzle database (CC0)</footer>
    </main>
  )
}
