import { useEffect, useMemo, useState } from 'react'
import { Board } from './Board'
import { fetchMeta } from './api'
import { sanList, solverColor } from './engine'
import { BANDS, ADAPTIVE } from './rating'
import { useStore } from './store'
import { Confetti } from './Confetti'
import { primeAudio } from './celebrate'
import { Log } from './Log'
import { Learn } from './learn/Learn'
import { LESSONS } from './learn/lessons'
import { navigate, useRoute } from './route'
import { PICKER_THEMES, themeLabel } from './themes'

const LESSON_KEYS = new Set(LESSONS.map((l) => l.key))

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
      <li key={i} className="mv">
        {(!black || i === 0) && <b>{num}{black ? '…' : '.'}</b>}
        {san}
      </li>
    )
  })
  return (
    <ol className="moves" aria-label="Move list" data-testid="moves">
      {items.length ? items : <li className="muted">Moves appear here.</li>}
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
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Settings" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="sheet-head">
        <h2>Choose puzzles</h2>
        <button className="btn" autoFocus onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="field">
        <span className="label">Difficulty</span>
        <div className="chips">
          {[{ key: ADAPTIVE, label: 'Adaptive' }, ...BANDS].map((b) => (
            <button key={b.key} aria-pressed={s.band === b.key} className={`chip${s.band === b.key ? ' on' : ''}`} onClick={() => s.setBand(b.key)}>
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
      <div className="field">
        <span className="label">Celebration</span>
        <label className="check"><input type="checkbox" checked={s.celebrate} onChange={(e) => s.setCelebrate(e.target.checked)} /> Confetti when you solve a puzzle</label>
        {s.celebrate && <label className="check"><input type="checkbox" checked={s.sound} onChange={(e) => { if (e.target.checked) primeAudio(); s.setSound(e.target.checked) }} /> Play a sound too</label>}
      </div>
      <p className="muted small">
        Solved {s.solvedCount} of {s.attemptedCount} · best streak {s.bestStreak}. Progress is saved on this device.
      </p>
      <p className="small">
        <button className="linklike" onClick={() => { onClose(); navigate({ name: 'log' }) }}>Your log: how you did on each puzzle ▸</button>
      </p>
      <p className="small">
        <button className="linklike" onClick={() => { onClose(); navigate({ name: 'learn', theme: s.theme && LESSON_KEYS.has(s.theme) ? s.theme : undefined }) }}>
          {s.theme ? `What is ${themeLabel(s.theme)}? Open the guide ▸` : 'Theme guide: what each exercise type means ▸'}
        </button>
      </p>
      <button className="btn primary" onClick={onClose}>Done</button>
    </div>
  )
}

export default function App() {
  const route = useRoute()
  if (route.name === 'learn') return <Learn theme={route.theme} />
  if (route.name === 'log') return <Log />
  return <Play />
}

function Play() {
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
          <button className="stat statlink" title="Your log" aria-label={`Your rating is ${s.rating}. Open your log`} onClick={() => navigate({ name: 'log' })}>♟ {s.rating}
            {s.ratingDelta ? <em className={s.ratingDelta > 0 ? 'up' : 'down'}> {s.ratingDelta > 0 ? '+' : ''}{s.ratingDelta}</em> : null}
          </button>
          <span className="stat" title="Current streak" role="img" aria-label={`Streak ${s.streak}`}>★ {s.streak}</span>
          <button className="btn icon learn-link" onClick={() => navigate({ name: 'learn' })} aria-label="Theme guide">?</button>
          <button className="btn icon" onClick={() => setOpen(true)} aria-label="Difficulty and themes">⚙</button>
        </div>
      </header>

      <div className="turn">
        {turn && <span className={`dot ${turn}`} />}
        {turn ? `${turn === 'white' ? 'White' : 'Black'} to move` : 'Loading…'}
        {s.theme && <span className="tag">{themeLabel(s.theme)}</span>}
        {done && puzzle && <span className="muted"> · puzzle {puzzle.rating}</span>}
      </div>

      {s.note && <p className="note small">{s.note}</p>}
      <section aria-label="Chessboard"><Board /></section>
      <Confetti seq={s.solveSeq} enabled={s.celebrate} sound={s.sound} />

      <p className={`msg${s.status === 'error' ? ' err' : ''}`} role="status" aria-live="polite" data-testid="msg">
        {s.status === 'loading' ? 'Loading puzzle…' : s.message}
      </p>
      {done && puzzle && (
        <div className="chips" data-testid="themes">
          {puzzle.themes.map((t) =>
            LESSON_KEYS.has(t)
              ? <button key={t} className="tag taglink" onClick={() => navigate({ name: 'learn', theme: t })}>{themeLabel(t)} ▸</button>
              : <span key={t} className="tag">{themeLabel(t)}</span>)}
        </div>
      )}

      {s.status === 'error' && (s.theme || s.band !== ADAPTIVE) && (
        <button className="btn" onClick={() => { s.setTheme(null); if (s.band !== ADAPTIVE) s.setBand(ADAPTIVE) }}>
          Clear filters
        </button>
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
