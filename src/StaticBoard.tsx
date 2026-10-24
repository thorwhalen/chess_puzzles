// A read-only board for diagrams: a FEN, arrows and marked squares. No dragging, no clicks.
import type { CSSProperties } from 'react'
import { Chessboard } from 'react-chessboard'

export type Mark = 'hot' | 'target' | 'safe' | 'last'
export type ArrowKind = 'move' | 'threat' | 'next'
export type DiagramArrow = [from: string, to: string, kind?: ArrowKind]

const ARROW_COLOR: Record<ArrowKind, string> = { move: '#2e9d57', threat: '#d64545', next: '#2f6fd6' }
const MARK_STYLE: Record<Mark, CSSProperties> = {
  hot: { background: 'rgba(214, 69, 69, 0.55)' },
  target: { background: 'rgba(255, 190, 40, 0.6)' },
  safe: { background: 'rgba(46, 157, 87, 0.5)' },
  last: { background: 'rgba(255, 214, 10, 0.4)' },
}

export interface StaticBoardProps {
  id: string
  fen: string
  orientation?: 'white' | 'black'
  arrows?: DiagramArrow[]
  marks?: Record<string, Mark>
  label: string
}

export function StaticBoard({ id, fen, orientation = 'white', arrows = [], marks = {}, label }: StaticBoardProps) {
  const squareStyles = Object.fromEntries(Object.entries(marks).map(([sq, m]) => [sq, MARK_STYLE[m]]))
  return (
    <div className="diagram-board" role="img" aria-label={label}>
      <Chessboard
        options={{
          id,
          position: fen,
          boardOrientation: orientation,
          squareStyles,
          arrows: arrows.map(([startSquare, endSquare, kind = 'move']) => ({ startSquare, endSquare, color: ARROW_COLOR[kind] })),
          allowDragging: false,
          allowDrawingArrows: false,
          clearArrowsOnClick: false,
          showAnimations: false,
          lightSquareStyle: { backgroundColor: 'var(--sq-light)' },
          darkSquareStyle: { backgroundColor: 'var(--sq-dark)' },
          boardStyle: { borderRadius: 6 },
        }}
      />
    </div>
  )
}
