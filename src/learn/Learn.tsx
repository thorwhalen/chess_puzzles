// The theme guide: one collapsible section per puzzle theme, each with hand-drawn idea
// diagrams, a real example from the app's own puzzles, and a "Practice this" button.
import { useEffect, useMemo, useState } from 'react'
import { replay, sanList, solverColor, splitUci, type Puzzle } from '../engine'
import { leaveTo, navigate } from '../route'
import { StaticBoard, type Mark } from '../StaticBoard'
import { useStore } from '../store'
import { themeLabel } from '../themes'
import examples from './examples.json'
import { LESSONS, type Lesson } from './lessons'

const EXAMPLES = examples as unknown as Record<string, Puzzle & { theme: string }>

/** A numbered SAN line such as "1. Rg1 Rxh3+ 2. Kxh3 Rh4#", starting from the puzzle's own move number. */
function lineText(p: Puzzle, from: number): string {
  const sans = sanList(p, p.moves)
  const startsBlack = p.fen.split(' ')[1] === 'b'
  const first = Number(p.fen.split(' ')[5] ?? 1)
  const out: string[] = []
  sans.slice(from).forEach((san, k) => {
    const i = from + k
    const black = startsBlack ? i % 2 === 0 : i % 2 === 1
    const num = first + Math.floor((i + (startsBlack ? 1 : 0)) / 2)
    if (!black) out.push(`${num}.`)
    else if (k === 0) out.push(`${num}…`)
    out.push(san)
  })
  return out.join(' ')
}

function RealExample({ p, theme }: { p: Puzzle; theme: string }) {
  const color = solverColor(p)
  const setup = useMemo(() => replay(p, [p.moves[0]]).fen(), [p])
  const end = useMemo(() => replay(p, p.moves).fen(), [p])
  const first = splitUci(p.moves[1])
  const last = splitUci(p.moves[p.moves.length - 1])
  const endMarks: Record<string, Mark> = { [last.from]: 'last', [last.to]: 'last' }
  const [answer, setAnswer] = useState(false)
  return (
    <div className="example" data-testid={`example-${theme}`}>
      <h3>A real puzzle ({color === 'white' ? 'White' : 'Black'} to move)</h3>
      <figure>
        <StaticBoard id={`ex-${theme}-a`} fen={setup} orientation={color} arrows={answer ? [[first.from, first.to, 'move']] : []}
          label={`Puzzle ${p.id}: the position.${answer ? ' The arrow shows the first move.' : ''}`} />
        <figcaption>
          Find the move first.{' '}
          <button className="linklike inline" aria-pressed={answer} onClick={() => setAnswer((a) => !a)}>{answer ? 'Hide the answer' : 'Show the answer'}</button>
        </figcaption>
      </figure>
      <figure>
        <StaticBoard id={`ex-${theme}-b`} fen={end} orientation={color} marks={endMarks}
          label={`Puzzle ${p.id}: the position after the whole line.`} />
        <figcaption>After the line: <b>{lineText(p, 1)}</b></figcaption>
      </figure>
      <p className="muted small">Lichess puzzle {p.id}, rated {p.rating} (CC0).</p>
    </div>
  )
}

function Section({ lesson, open }: { lesson: Lesson; open: boolean }) {
  const ex = EXAMPLES[lesson.key]
  const practice = () => {
    navigate({ name: 'play' })
    void useStore.getState().setTheme(lesson.key)
  }
  return (
    <section id={`theme-${lesson.key}`} className="lesson" data-open={open}>
      <h2>
        <button className="lesson-head" aria-expanded={open} aria-controls={`panel-${lesson.key}`}
          onClick={() => navigate({ name: 'learn', theme: open ? undefined : lesson.key }, { replace: true })}>
          <span>{themeLabel(lesson.key)}</span>
          <span className="blurb">{lesson.blurb}</span>
          <span aria-hidden="true" className="chev">{open ? '▾' : '▸'}</span>
        </button>
      </h2>
      <div id={`panel-${lesson.key}`} className="lesson-body" hidden={!open}>
        {open && (<>
          <p>{lesson.summary}</p>
          <h3>How to spot it</h3>
          <ul>{lesson.spot.map((s) => <li key={s}>{s}</li>)}</ul>
          {lesson.diagrams.map((d, i) => (
            <figure key={i}>
              <StaticBoard id={`${lesson.key}-${i}`} fen={d.fen} orientation={d.orientation} arrows={d.arrows} marks={d.marks}
                label={d.caption} />
              <figcaption>{d.caption}</figcaption>
            </figure>
          ))}
          {ex && <RealExample p={ex} theme={lesson.key} />}
          <button className="btn primary practice" onClick={practice}>Practice {themeLabel(lesson.key)} ▸</button>
        </>)}
      </div>
    </section>
  )
}

export function Learn({ theme }: { theme?: string }) {
  // After the previous section collapses, bring the opened one (and its chip) into view.
  useEffect(() => {
    if (!theme) return
    const id = requestAnimationFrame(() => {
      document.getElementById(`theme-${theme}`)?.scrollIntoView({ block: 'start' })
      // Centre the chip inside its own row only: scrollIntoView would also scroll the page back up.
      const chip = document.getElementById(`chip-${theme}`)
      const row = chip?.parentElement
      if (chip && row) row.scrollTo({ left: chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2 })
    })
    return () => cancelAnimationFrame(id)
  }, [theme])
  return (
    <main className="app learn">
      <header className="top">
        <button className="btn back" onClick={() => leaveTo({ name: 'play' })}>← Puzzles</button>
        <h1>Theme guide</h1>
      </header>
      <p className="muted">Each puzzle has a theme: the tactic that makes the winning move work. Open one to see the idea drawn out, then a real puzzle.</p>
      <nav className="chips index" aria-label="Themes">
        {LESSONS.map((l) => (
          <button key={l.key} id={`chip-${l.key}`} className={`chip${theme === l.key ? ' on' : ''}`} aria-current={theme === l.key ? 'true' : undefined}
            onClick={() => navigate({ name: 'learn', theme: l.key }, { replace: true })}>
            {themeLabel(l.key)}
          </button>
        ))}
      </nav>
      <p className="legend small muted">Green arrow: the move. Blue: what follows. Red: a threat. Yellow square: target. Red square: danger.</p>
      {LESSONS.map((l) => <Section key={l.key} lesson={l} open={theme === l.key} />)}
    </main>
  )
}
