// The player's log: how they are doing overall, by theme, and puzzle by puzzle. The recent list
// narrows by outcome (chips) and by theme (tap one under "By theme").
import { useState } from 'react'
import { effortText, summarize, themeStats, type Attempt } from './history'
import { leaveTo, navigate } from './route'
import { useStore } from './store'
import { themeLabel } from './themes'

const ICON = { clean: '✓', helped: '½', failed: '✗' } as const
const WORDS = { clean: 'Solved right away', helped: 'Solved with help', failed: 'Not solved' } as const
const SHOWN = 40
const THEMES_SHOWN = 8

const ago = (at: number) => {
  const m = Math.max(0, Math.round((Date.now() - at) / 60000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  if (m < 1440) return `${Math.round(m / 60)} h ago`
  return `${Math.round(m / 1440)} d ago`
}

function Row({ a }: { a: Attempt }) {
  const effort = effortText(a)
  return (
    <li className={`logrow ${a.outcome}`}>
      <span className="logicon" role="img" aria-label={WORDS[a.outcome]}>{ICON[a.outcome]}</span>
      <span className="logmain">
        <span>{a.themes.slice(0, 2).map(themeLabel).join(' · ') || 'Puzzle'} <span className="muted">· {a.rating}</span></span>
        <span className="muted small">{WORDS[a.outcome]}{effort ? ` — ${effort}` : ''} · {ago(a.at)}</span>
      </span>
    </li>
  )
}

type Outcome = Attempt['outcome']
const OUTCOME_VIEWS: { id: Outcome | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'failed', label: 'Not solved' },
  { id: 'helped', label: 'With help' },
  { id: 'clean', label: 'Right away' },
]

export function Log() {
  const history = useStore((s) => s.history)
  const [outcome, setOutcome] = useState<Outcome | 'all'>('all')
  const [theme, setTheme] = useState<string | null>(null)
  const shown = history.filter((a) => (outcome === 'all' || a.outcome === outcome) && (!theme || a.themes.includes(theme)))
  const sum = summarize(history)
  const themes = themeStats(history)
    .filter((t) => t.attempts >= 2)
    .sort((a, b) => a.clean / a.attempts - b.clean / b.attempts)
    .slice(0, THEMES_SHOWN)
  const pct = (n: number) => (sum.total ? Math.round((100 * n) / sum.total) : 0)
  return (
    <main className="app learn">
      <header className="top">
        <button className="btn back" onClick={() => leaveTo({ name: 'play' })}>‹ Back</button>
        <h1>Your log</h1>
      </header>
      {!sum.total ? (
        <p className="muted">Nothing here yet. Solve a puzzle and it shows up.</p>
      ) : (
        <>
          <section aria-label="Summary">
            <div className="bar" role="img" aria-label={`${pct(sum.clean)}% right away, ${pct(sum.helped)}% with help, ${pct(sum.failed)}% not solved`}>
              <i className="clean" style={{ flexGrow: sum.clean }} /><i className="helped" style={{ flexGrow: sum.helped }} /><i className="failed" style={{ flexGrow: sum.failed }} />
            </div>
            <p className="small">
              {sum.total} puzzle{sum.total > 1 ? 's' : ''}: <b>{sum.clean}</b> right away, <b>{sum.helped}</b> with help, <b>{sum.failed}</b> not solved.
            </p>
          </section>
          {themes.length > 0 && (
            <section aria-label="By theme">
              <h2>By theme</h2>
              <ul className="themelist">
                {themes.map((t) => (
                  <li key={t.theme}>
                    <button type="button" className="linklike" aria-pressed={theme === t.theme} onClick={() => setTheme(theme === t.theme ? null : t.theme)}>
                      {themeLabel(t.theme)}
                    </button>
                    <span className="muted">{t.clean} of {t.attempts} right away</span>
                  </li>
                ))}
              </ul>
              <p className="muted small">The weakest ones show up more often in “Any theme” mode.</p>
            </section>
          )}
          <section aria-label="Recent puzzles">
            <h2>Recent{theme ? ` · ${themeLabel(theme)}` : ''}</h2>
            <div className="chips" role="group" aria-label="Show">
              {OUTCOME_VIEWS.map((v) => (
                <button key={v.id} type="button" className={`chip${outcome === v.id ? ' on' : ''}`} aria-pressed={outcome === v.id} onClick={() => setOutcome(v.id)}>
                  {v.label}
                </button>
              ))}
              {theme && (
                <button type="button" className="chip on" onClick={() => setTheme(null)} aria-label={`Show every theme, not only ${themeLabel(theme)}`}>
                  {themeLabel(theme)} ×
                </button>
              )}
            </div>
            {shown.length ? (
              <ul className="loglist">{shown.slice(0, SHOWN).map((a, i) => <Row key={`${a.id}-${a.at}-${i}`} a={a} />)}</ul>
            ) : (
              <p className="muted small">No puzzle here.</p>
            )}
          </section>
        </>
      )}
      <button className="btn primary next" onClick={() => navigate({ name: 'play' }, { replace: true })}>Back to puzzles</button>
    </main>
  )
}
