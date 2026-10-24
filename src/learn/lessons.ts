// The theme guide's content. Text is original; definitions were cross-checked against the
// Lichess theme list and standard chess glossaries. Every diagram is verified in
// lessons.test.ts (legal FEN, legal arrow moves, and a mate/check claim where one is made).
import type { DiagramArrow, Mark } from '../StaticBoard'

export interface Diagram {
  fen: string
  caption: string
  orientation?: 'white' | 'black'
  arrows?: DiagramArrow[]
  marks?: Record<string, Mark>
  /** UCI of the key move of this diagram (side to move); the test checks it is legal. */
  move?: string
  /** What the key move achieves; the test proves it by search. */
  claim?: 'check' | 'mate1' | 'mate2' | 'mate3'
}

export interface Lesson {
  key: string // a Lichess theme key (themes.ts has the label)
  blurb: string // one line under the title
  summary: string
  spot: string[]
  diagrams: Diagram[]
}

export const LESSONS: Lesson[] = [
  {
    key: 'mateIn1',
    blurb: 'Checkmate on the very next move.',
    summary: 'Checkmate means the king is attacked and has no legal way out. A mate in 1 puzzle has one move that does it. Beginners miss these by looking at captures; look at checks first instead.',
    spot: [
      'List every check you have. One of them is the mate.',
      'Count the king’s escape squares. If your move covers or blocks all of them, it is mate.',
      'Kings can not capture a protected piece, so a checking piece guarded by a friend is often deadly.',
    ],
    diagrams: [
      {
        fen: '7k/8/6K1/8/8/8/1Q6/8 w - - 0 1',
        caption: 'The queen goes to b8. It checks along the eighth rank, and the white king on g6 covers g7 and h7, the only squares left. Mate.',
        arrows: [['b2', 'b8', 'move']],
        marks: { h8: 'target', g7: 'hot', h7: 'hot', g8: 'hot' },
        move: 'b2b8',
        claim: 'mate1',
      },
    ],
  },
  {
    key: 'mateIn2',
    blurb: 'Force checkmate in two moves.',
    summary: 'You make a move, the opponent answers, and then you deliver mate. The first move usually leaves the opponent no useful reply: it takes away squares or gives a check that has only one answer.',
    spot: [
      'Ask: what would I play if it were my move twice in a row? That is the threat.',
      'Checks and moves that remove escape squares come first; quiet moves are rarer.',
      'Check every reply the opponent has. A mate in 2 works against all of them.',
    ],
    diagrams: [
      {
        fen: '7k/8/8/8/8/8/R7/1R4K1 w - - 0 1',
        caption: 'Ra7 takes the seventh rank away. The king’s only move is to g8, and then Rb8 is checkmate. Two rooks like this are called a "ladder".',
        arrows: [['a2', 'a7', 'move'], ['b1', 'b8', 'next']],
        marks: { h8: 'target', g8: 'hot' },
        move: 'a2a7',
        claim: 'mate2',
      },
    ],
  },
  {
    key: 'mateIn3',
    blurb: 'Force checkmate in three moves.',
    summary: 'Longer, but the same idea: every move you play is forcing, so the opponent has no time to defend. Calculate one reply at a time, and write the line down in your head before you play.',
    spot: [
      'Prefer checks and captures: they leave the opponent few answers, so there is less to calculate.',
      'Drive the king toward the edge, where fewer squares have to be covered.',
      'Often a sacrifice on move 1 opens the king; do not be afraid to give a piece when the mate is forced.',
    ],
    diagrams: [
      {
        fen: '4k3/8/8/8/8/8/Q7/R3K3 w - - 0 1',
        caption: 'Qa7 locks the king on the back rank. Next the queen steps to b7, still guarding the seventh rank, which also clears the a-file for the rook: Ra8 is mate. Every black reply loses to the same plan.',
        arrows: [['a2', 'a7', 'move'], ['a7', 'b7', 'next'], ['a1', 'a8', 'next']],
        marks: { e8: 'target', d7: 'hot', e7: 'hot', f7: 'hot' },
        move: 'a2a7',
        claim: 'mate3',
      },
    ],
  },
  {
    key: 'fork',
    blurb: 'One piece attacks two targets at once.',
    summary: 'A fork is a single move that attacks two or more enemy pieces. The opponent can save only one, so you win the other. Knights are the classic forkers because their jump can not be blocked and the forked piece can usually not hit back, but queens, pawns and bishops fork too.',
    spot: [
      'Look for two enemy pieces that are the same knight-jump from one square.',
      'A fork with check is the strongest: the king must move, and you take the other piece.',
      'Check each fork square is safe. A forking piece that can be captured is not a fork.',
    ],
    diagrams: [
      {
        fen: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1',
        caption: 'The knight jumps to c7. It checks the king and attacks the rook on a8. The king must move, and Nxa8 wins the rook.',
        arrows: [['d5', 'c7', 'move'], ['c7', 'a8', 'threat']],
        marks: { e8: 'hot', a8: 'target' },
        move: 'd5c7',
        claim: 'check',
      },
    ],
  },
  {
    key: 'pin',
    blurb: 'A piece can not move without exposing something bigger.',
    summary: 'A pin freezes a piece because moving it would expose a more valuable piece behind it. If the piece behind is the king, the pin is absolute: the move is illegal. If it is a queen or rook, the pin is relative: the move is legal but costly. A pinned piece is a target.',
    spot: [
      'Look for bishops, rooks and queens aiming along a line through one enemy piece at a more valuable one.',
      'Attack the pinned piece again: it can not run away, so you win it.',
      'Remember your own pins too, before you move a piece that stands in front of your king or queen.',
    ],
    diagrams: [
      {
        fen: '4k3/8/2n5/1B6/8/8/8/2R1K3 w - - 0 1',
        caption: 'The bishop pins the knight to the king: the knight can not move at all. The rook takes it for free: Rxc6.',
        arrows: [['b5', 'e8', 'threat'], ['c1', 'c6', 'move']],
        marks: { c6: 'target', e8: 'hot' },
        move: 'c1c6',
      },
      {
        fen: '3q2k1/8/5n2/6B1/8/8/8/4K3 b - - 0 1',
        orientation: 'black',
        caption: 'A relative pin: the bishop on g5 pins the knight to the queen. The knight may move, but then Bxd8 wins the queen. So the knight is stuck.',
        arrows: [['g5', 'd8', 'threat']],
        marks: { f6: 'target', d8: 'hot' },
      },
    ],
  },
  {
    key: 'skewer',
    blurb: 'The pin in reverse: the big piece must move, and the one behind falls.',
    summary: 'In a skewer you attack a valuable piece that has to step aside, and when it does it exposes a lesser piece behind it on the same line. Kings and queens are the usual front pieces. Rooks, bishops and queens skewer; knights and pawns can not.',
    spot: [
      'Look for a king or queen and another piece on the same rank, file or diagonal.',
      'A check on the front piece forces it to move, so the skewer is guaranteed.',
      'Compare it to a pin: in a pin the cheaper piece is in front, in a skewer the dearer one is.',
    ],
    diagrams: [
      {
        fen: 'q3k3/8/8/8/8/8/8/6KR w - - 0 1',
        caption: 'The rook checks from h8. The king has to leave the eighth rank, and the rook takes the queen that was hiding behind it.',
        arrows: [['h1', 'h8', 'move'], ['h8', 'a8', 'threat']],
        marks: { e8: 'hot', a8: 'target' },
        move: 'h1h8',
        claim: 'check',
      },
    ],
  },
  {
    key: 'discoveredAttack',
    blurb: 'Move one piece, and the piece behind it attacks.',
    summary: 'A discovered attack happens when you move a piece off a line and unmask a bishop, rook or queen behind it. The moved piece can do something on its own at the same time, and the opponent faces two threats. If the unmasked piece gives check, it is even stronger: a discovered check.',
    spot: [
      'Look for your own long-range piece with one of your own pieces in front of it, pointing at the enemy king or queen.',
      'Find a move for the front piece that captures or threatens something.',
      'A discovered check lets the front piece go anywhere, even to attack the queen, since the king must answer.',
    ],
    diagrams: [
      {
        fen: '4k3/8/2q5/4N3/8/8/8/4RK2 w - - 0 1',
        caption: 'The knight takes the queen on c6, and unmasks the rook on e1. Black must answer the check, so the queen is simply lost.',
        arrows: [['e5', 'c6', 'move'], ['e1', 'e8', 'threat']],
        marks: { c6: 'target', e8: 'hot' },
        move: 'e5c6',
        claim: 'check',
      },
    ],
  },
  {
    key: 'hangingPiece',
    blurb: 'An unprotected piece you can simply take.',
    summary: 'A hanging piece is one that is attacked and has no defender (or too few). Most games at every level are decided by hanging pieces, and most puzzles of this kind reward one habit: before every move, ask what is unprotected, yours and theirs.',
    spot: [
      'For each enemy piece, ask: is anything guarding it?',
      'A piece that is guarded can still hang if you attack it more times than it is defended.',
      'Check that the capture is safe: does taking open a bigger threat for the opponent?',
    ],
    diagrams: [
      {
        fen: '4k3/8/8/3b4/8/8/8/3RK3 w - - 0 1',
        caption: 'The bishop on d5 has no defender. The rook takes it: Rxd5.',
        arrows: [['d1', 'd5', 'move']],
        marks: { d5: 'target' },
        move: 'd1d5',
      },
    ],
  },
  {
    key: 'backRankMate',
    blurb: 'Mate on the home rank, because the king is boxed in by its own pawns.',
    summary: 'When a king still sits on its first rank behind unmoved pawns, a rook or queen that lands on that rank gives check with no escape: the pawns block the king’s flight squares. Beginners can prevent it by giving the king a "luft" (a pawn move that opens a square).',
    spot: [
      'The enemy king is on its first rank, and pawns in front of it have not moved.',
      'You have a rook or queen that can reach the back rank with check.',
      'Nothing can block or capture the checking piece, and no piece covers the rank.',
    ],
    diagrams: [
      {
        fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
        caption: 'The three pawns trap their own king. Ra8 is checkmate.',
        arrows: [['a1', 'a8', 'move']],
        marks: { g8: 'hot', f7: 'hot', g7: 'hot', h7: 'hot' },
        move: 'a1a8',
        claim: 'mate1',
      },
    ],
  },
  {
    key: 'trappedPiece',
    blurb: 'A piece that has nowhere safe to go.',
    summary: 'A trapped piece is attacked and every square it could move to is covered. It does not need to be a queen: knights in corners, bishops that took a poisoned pawn and rooks deep in your territory get trapped. Take away its last escape and it is yours.',
    spot: [
      'Count the squares the piece can go to, then count how many are covered by your pieces.',
      'Pieces near the edge and the corners have fewer squares, so they are the easy targets.',
      'Attack the trapped piece with something it cannot afford to trade with.',
    ],
    diagrams: [
      {
        fen: '7N/6k1/8/8/8/8/8/4K3 b - - 0 1',
        orientation: 'black',
        caption: 'The knight on h8 can jump to f7 or g6, but the king covers both. It can not escape, and Kxh8 wins it.',
        arrows: [['h8', 'f7', 'threat'], ['h8', 'g6', 'threat'], ['g7', 'h8', 'move']],
        marks: { f7: 'hot', g6: 'hot', h8: 'target' },
        move: 'g7h8',
      },
    ],
  },
  {
    key: 'sacrifice',
    blurb: 'Give something up on purpose, to get more back.',
    summary: 'A sacrifice gives up material for a bigger gain: a checkmate, a stronger position or more material back a few moves later. The key is that the sequence is forced. If the opponent can decline, it is a gamble, not a tactic.',
    spot: [
      'Check what the opponent must do after your sacrifice. If they have a free choice, be careful.',
      'Count what you get at the end of the forced line, not what you lose on move 1.',
      'Sacrifices that open the king or clear a line are the most common ones.',
    ],
    diagrams: [
      {
        fen: '1r4k1/5ppp/8/8/8/8/3Q1PPP/3R2K1 w - - 0 1',
        caption: 'Qd8+! gives up the queen. The rook has to take it, and then Rxd8 is checkmate on the back rank.',
        arrows: [['d2', 'd8', 'move'], ['d1', 'd8', 'next']],
        marks: { d8: 'target', g8: 'hot' },
        move: 'd2d8',
        claim: 'mate2',
      },
    ],
  },
  {
    key: 'deflection',
    blurb: 'Pull a defender away from the job it was doing.',
    summary: 'A piece often has one important duty: guarding a square, a piece, or the back rank. A deflection forces it away from that duty, by a sacrifice, a capture or a threat. This is also called overloading when the piece has two jobs at once.',
    spot: [
      'Find what is keeping the enemy position together: the guard of the mating square or the guard of a loose piece.',
      'Ask how to force that one piece to move or to capture.',
      'The deflecting move is often a check or a capture, so the opponent has no time to refuse.',
    ],
    diagrams: [
      {
        fen: '8/8/5p2/5kp1/8/1R4PK/3r3P/8 b - - 5 42',
        orientation: 'black',
        caption: 'g4+! The white king can not take the pawn (the black king guards it), so it must go to h4. That pulls it away from h2, and Rxh2 is checkmate.',
        arrows: [['g5', 'g4', 'move'], ['d2', 'h2', 'next']],
        marks: { h3: 'hot', h2: 'target' },
        move: 'g5g4',
        claim: 'mate2',
      },
    ],
  },
  {
    key: 'attraction',
    blurb: 'Lure a piece onto a square where it is hurt.',
    summary: 'An attraction (or decoy) sacrifice drags an enemy piece, often the king or queen, onto a square where a follow-up tactic wins. Where a deflection pulls a piece away, an attraction pulls it onto a particular spot.',
    spot: [
      'Pick the square your tactic needs a piece to stand on.',
      'Offer something the opponent has to take (or a check they have to answer) to put it there.',
      'Make sure the follow-up really works against every reply before you pay.',
    ],
    diagrams: [
      {
        fen: '1r4k1/5ppp/2R5/8/8/7Q/5PPP/6K1 w - - 0 1',
        caption: 'Rc8+! offers the rook. Black has to take it, which drags the black rook onto c8, where Qxc8 is checkmate.',
        arrows: [['c6', 'c8', 'move'], ['h3', 'c8', 'next']],
        marks: { c8: 'target', g8: 'hot' },
        move: 'c6c8',
        claim: 'mate2',
      },
    ],
  },
  {
    key: 'doubleCheck',
    blurb: 'Two pieces give check at once.',
    summary: 'A double check is a discovered attack where both the moved piece and the unmasked piece attack the king. You can not block or capture two attackers with one move, so the king must move. It is often the key to a forced mate.',
    spot: [
      'Look for a piece moving out of the way of your rook, bishop or queen while itself giving check.',
      'The only legal answer is a king move, so list the king’s squares and see which are covered.',
      'If no flight square is free, the double check is checkmate.',
    ],
    diagrams: [
      {
        fen: '4k3/8/8/8/4N3/8/8/4RK2 w - - 0 1',
        caption: 'Nd6 checks the king, and unmasks the rook on e1, which checks along the e-file. Two checks at once: only the king can move.',
        arrows: [['e4', 'd6', 'move'], ['d6', 'e8', 'threat'], ['e1', 'e8', 'threat']],
        marks: { e8: 'hot' },
        move: 'e4d6',
        claim: 'check',
      },
    ],
  },
  {
    key: 'smotheredMate',
    blurb: 'A knight mates a king that its own pieces have boxed in.',
    summary: 'A smothered mate is a checkmate by a knight, against a king whose neighbours are all its own pieces. Because a knight jumps, the other pieces can not block the check, and because the king is surrounded, it can not run.',
    spot: [
      'The enemy king is in a corner with its own rook and pawns beside it.',
      'You have a knight that can reach a square a knight-jump from the king.',
      'Often a queen sacrifice first drags the guard away (see Attraction).',
    ],
    diagrams: [
      {
        fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
        caption: 'The king on h8 is walled in by its own rook and pawns. Nf7 is checkmate: no square to run to, and nothing can block a knight’s jump.',
        arrows: [['g5', 'f7', 'move'], ['f7', 'h8', 'threat']],
        marks: { h8: 'hot', g8: 'hot', g7: 'hot', h7: 'hot' },
        move: 'g5f7',
        claim: 'mate1',
      },
    ],
  },
  {
    key: 'capturingDefender',
    blurb: 'Take the piece that was guarding another one.',
    summary: 'If a piece is defended, you may not be able to take it safely. But if you capture its defender first, the target loses its protection and falls next. Sometimes the defender is the only thing holding the position together.',
    spot: [
      'For a target that looks protected, ask: what protects it?',
      'Can you take that defender (even a pawn), or force it to move?',
      'After the capture, the original target should be attacked and unprotected, so the opponent can not fix both.',
    ],
    diagrams: [
      {
        fen: '3k4/8/1n6/P2b4/8/8/8/3RK3 w - - 0 1',
        caption: 'The bishop is pinned to the king by the rook, and only the knight on b6 guards it. axb6 takes the guard. The pinned bishop can not move, and Rxd5+ wins it next.',
        arrows: [['a5', 'b6', 'move'], ['d1', 'd5', 'next']],
        marks: { b6: 'target', d5: 'target', d8: 'hot' },
        move: 'a5b6',
      },
    ],
  },
  {
    key: 'promotion',
    blurb: 'A pawn reaches the last rank and becomes a queen (or another piece).',
    summary: 'When a pawn reaches the far rank it must become a queen, rook, bishop or knight. Almost always you pick the queen. A promotion can win the game on the spot, and even the threat of one ties the opponent’s pieces down. Underpromotion (to a knight, say) is rare but wins when a queen would give stalemate or the knight gives check.',
    spot: [
      'Count: can the pawn reach the last rank before any enemy piece can stop it?',
      'A pawn can capture on the last rank and promote at the same time.',
      'Look at the check after promotion: a queen on the back rank often comes with check.',
    ],
    diagrams: [
      {
        fen: '8/P6k/8/8/8/8/8/K7 w - - 0 1',
        caption: 'Nothing can stop the pawn. a8=Q turns it into a queen.',
        arrows: [['a7', 'a8', 'move']],
        marks: { a8: 'target' },
        move: 'a7a8q',
      },
    ],
  },
  {
    key: 'advancedPawn',
    blurb: 'A pawn deep in enemy territory, one or two steps from queening.',
    summary: 'A pawn on the sixth or seventh rank is a huge asset: it restricts the enemy pieces and demands an answer. Often it supports a tactic, like capturing onto the last rank, or wins because the opponent has to spend a piece to blockade it.',
    spot: [
      'Count the steps to the last rank and who controls the squares in front of the pawn.',
      'A pawn on the seventh can often capture a piece on the eighth and promote at once.',
      'Look at whether pushing the pawn comes with check or attacks something.',
    ],
    diagrams: [
      {
        fen: '3r2k1/4P3/8/8/8/8/8/6K1 w - - 0 1',
        caption: 'The pawn on e7 attacks the rook on d8. exd8=Q+ wins the rook, promotes, and gives check at the same time.',
        arrows: [['e7', 'd8', 'move']],
        marks: { d8: 'target', g8: 'hot' },
        move: 'e7d8q',
        claim: 'check',
      },
    ],
  },
  {
    key: 'exposedKing',
    blurb: 'A king with no shelter around it.',
    summary: 'When the pawns and pieces that guard a king have gone, the king can be hunted with checks. An exposed king does not always mean a mate, but it makes every threat stronger, because the opponent must keep answering checks.',
    spot: [
      'The enemy king has lost its pawn cover or has been dragged into the middle of the board.',
      'Look at every check you have, even sacrifices; one may win a piece or force mate.',
      'Be careful with your own king: do not leave it as bare as the one you are attacking.',
    ],
    diagrams: [
      {
        fen: '3k4/8/8/8/8/8/Q7/4RK2 w - - 0 1',
        caption: 'The black king has no pawns or pieces around it. Qa7 takes away the whole seventh rank, so its only move is Kc8, and Re8 is checkmate.',
        arrows: [['a2', 'a7', 'move'], ['e1', 'e8', 'next']],
        marks: { d8: 'target', c7: 'hot', d7: 'hot', e7: 'hot' },
        move: 'a2a7',
        claim: 'mate2',
      },
    ],
  },
  {
    key: 'endgame',
    blurb: 'Few pieces left: kings join in, pawns matter.',
    summary: 'In the endgame, with few pieces on the board, the king becomes a fighter, pawns race to promote and every tempo counts. Tactics still work (forks, skewers, promotions) but look for pawn breakthroughs and ways to make your king active.',
    spot: [
      'Bring your king toward the action and the pawns.',
      'Count pawn races: who queens first, and with check?',
      'Rooks belong behind passed pawns, yours or theirs.',
    ],
    diagrams: [
      {
        fen: '8/6k1/8/P7/8/8/8/R3K3 w - - 0 1',
        caption: 'A rook belongs behind a passed pawn. From a1 it guards the a-pawn all the way to a8, and it can never be blocked by the pawn itself.',
        arrows: [['a1', 'a4', 'threat'], ['a5', 'a8', 'next']],
        marks: { a8: 'target' },
      },
    ],
  },
  {
    key: 'opening',
    blurb: 'The first moves: develop, castle, and avoid traps.',
    summary: 'Opening puzzles come from the first ten or so moves. Most of them punish a mistake: a hanging pawn, an undeveloped piece, or an exposed king. The principles are simple: control the centre, bring out your knights and bishops, and castle early.',
    spot: [
      'Count which pieces are developed. The side that has more of them is often tactically ahead.',
      'Look at f7 and f2: these squares are guarded only by the king at the start, so they are common targets.',
      'Do not move the same piece twice in the opening unless there is a reason.',
    ],
    diagrams: [
      {
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
        orientation: 'black',
        caption: 'After 1.e4 e5 2.Nf3 Nc6 3.Bc4, the bishop eyes f7, which only the king guards. It is not a threat yet, but this is the target that many beginner traps aim at.',
        arrows: [['c4', 'f7', 'threat']],
        marks: { f7: 'hot' },
      },
    ],
  },
  {
    key: 'middlegame',
    blurb: 'Pieces developed, kings usually castled: the tactics begin.',
    summary: 'The middlegame is where most tactics happen: both sides have developed and the position is full of loose pieces and long lines. Any of the themes in this guide can appear. The skill is a routine: check, capture, threat, in that order.',
    spot: [
      'Check every check, capture and threat for both sides before you move.',
      'Find undefended pieces and pieces with too many jobs.',
      'Look at where the kings are and which lines are open.',
    ],
    diagrams: [
      {
        fen: 'r1bqk2r/ppp2ppp/2n2n2/3pp3/1b2P3/2NP1N2/PPP2PPP/R1BQKB1R w KQkq - 0 6',
        caption: 'Run the routine before every move: checks, captures, threats. Here Black’s bishop on b4 pins the c3 knight to the king, so that knight can not move.',
        arrows: [['b4', 'e1', 'threat']],
        marks: { c3: 'target', e1: 'hot' },
      },
    ],
  },
]
