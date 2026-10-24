// Theme labels for the picker. Unknown themes fall back to a humanised key.
export const THEME_LABELS: Record<string, string> = {
  mateIn1: 'Mate in 1',
  mateIn2: 'Mate in 2',
  mateIn3: 'Mate in 3',
  fork: 'Fork',
  pin: 'Pin',
  skewer: 'Skewer',
  discoveredAttack: 'Discovered attack',
  hangingPiece: 'Hanging piece',
  backRankMate: 'Back-rank mate',
  trappedPiece: 'Trapped piece',
  sacrifice: 'Sacrifice',
  deflection: 'Deflection',
  attraction: 'Attraction',
  doubleCheck: 'Double check',
  smotheredMate: 'Smothered mate',
  capturingDefender: 'Capture the defender',
  promotion: 'Promotion',
  advancedPawn: 'Advanced pawn',
  exposedKing: 'Exposed king',
  kingsideAttack: 'Kingside attack',
  queensideAttack: 'Queenside attack',
  endgame: 'Endgame',
  opening: 'Opening',
  middlegame: 'Middlegame',
  intermezzo: 'Zwischenzug',
  quietMove: 'Quiet move',
  xRayAttack: 'X-ray attack',
  zugzwang: 'Zugzwang',
  defensiveMove: 'Defensive move',
  clearance: 'Clearance',
  interference: 'Interference',
  mate: 'Checkmate',
  short: 'Short',
  oneMove: 'One move',
  crushing: 'Crushing',
  advantage: 'Advantage',
  equality: 'Equality',
}

export const themeLabel = (key: string) =>
  THEME_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())

/** Themes worth offering as a filter, in display order. */
export const PICKER_THEMES = [
  'mateIn1', 'mateIn2', 'mateIn3', 'fork', 'pin', 'skewer', 'discoveredAttack', 'hangingPiece',
  'backRankMate', 'trappedPiece', 'sacrifice', 'deflection', 'attraction', 'doubleCheck',
  'smotheredMate', 'capturingDefender', 'promotion', 'advancedPawn', 'exposedKing', 'endgame',
  'opening', 'middlegame',
]
