// The board: react-chessboard (MIT) wired to the store. Tap-to-move and drag both work.
import type { CSSProperties } from 'react'
import { Chessboard, type PieceDropHandlerArgs, type SquareHandlerArgs } from 'react-chessboard'
import { hintFor, legalTargets, solverColor, splitUci } from './engine'
import { currentChess, useStore } from './store'

const HINT_FROM = 'rgba(80, 140, 255, 0.55)'
const HINT_TO = 'rgba(80, 200, 120, 0.6)'
const LAST = 'rgba(255, 214, 10, 0.4)'
const WRONG = 'rgba(235, 64, 52, 0.65)'
const SELECTED = 'rgba(20, 120, 255, 0.45)'
const DOT = 'radial-gradient(circle, rgba(0,0,0,0.28) 22%, transparent 24%)'

export function Board() {
  const s = useStore()
  const { puzzle, played } = s
  const chess = currentChess(s)
  if (!puzzle || !chess) return <div className="board-skeleton" aria-busy="true" />

  const mine = solverColor(puzzle)
  const orientation = s.flipped ? (mine === 'white' ? 'black' : 'white') : mine
  const canMove = s.status === 'playing'

  const styles: Record<string, CSSProperties> = {}
  const last = played.at(-1)
  if (last) {
    const { from, to } = splitUci(last)
    styles[from] = { background: LAST }
    styles[to] = { background: LAST }
  }
  const hint = canMove ? hintFor(puzzle, played, s.hintLevel) : null
  if (hint) {
    styles[hint.from] = { background: HINT_FROM }
    if (hint.to) styles[hint.to] = { background: HINT_TO }
  }
  if (s.selected) {
    styles[s.selected] = { background: SELECTED }
    for (const t of legalTargets(puzzle, played, s.selected)) {
      styles[t] = { ...styles[t], backgroundImage: DOT }
    }
  }
  if (s.wrongSquare) styles[s.wrongSquare] = { background: WRONG }

  const onDrop = ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) =>
    !!targetSquare && canMove && s.playerMove(sourceSquare, targetSquare)

  const onSquareClick = ({ square }: SquareHandlerArgs) => {
    if (!canMove) return
    if (s.selected && s.selected !== square) {
      if (legalTargets(puzzle, played, s.selected).includes(square)) {
        s.playerMove(s.selected, square)
        return
      }
    }
    const piece = chess.get(square as Parameters<typeof chess.get>[0])
    const isMine = piece && (piece.color === 'w') === (mine === 'white')
    s.select(isMine && s.selected !== square ? square : null)
  }

  return (
    <div className="board" data-testid="board">
      <Chessboard
        options={{
          position: chess.fen(),
          boardOrientation: orientation,
          squareStyles: styles,
          arrows: hint?.arrow && hint.to ? [{ startSquare: hint.from, endSquare: hint.to, color: '#2e9d57' }] : [],
          allowDragging: canMove,
          onPieceDrop: onDrop,
          onSquareClick,
          animationDurationInMs: 200,
          allowDrawingArrows: false,
          lightSquareStyle: { backgroundColor: 'var(--sq-light)' },
          darkSquareStyle: { backgroundColor: 'var(--sq-dark)' },
          boardStyle: { borderRadius: 6, touchAction: 'none' },
        }}
      />
    </div>
  )
}
