"""Pick one short, popular, low-rated puzzle per theme for the theme guide.

Reads the app's puzzle DB and writes src/learn/examples.json (CC0 Lichess puzzles, so
the file may be committed). Re-run after rebuilding the DB:

    python scripts/pick_examples.py ~/.local/share/chess_puzzles/puzzles/puzzles.sqlite
"""

from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

THEMES = (
    "mateIn1", "mateIn2", "mateIn3", "fork", "pin", "skewer", "discoveredAttack", "hangingPiece",
    "backRankMate", "trappedPiece", "sacrifice", "deflection", "attraction", "doubleCheck",
    "smotheredMate", "capturingDefender", "promotion", "advancedPawn", "exposedKing", "endgame",
    "opening", "middlegame",
)
MAX_RATING = 1000
MAX_PLIES = {"mateIn3": 6, "exposedKing": 6}  # default 4: short lines read well in a diagram
PHASES_AND_MATES = {"opening", "middlegame", "endgame", "mateIn1", "mateIn2", "mateIn3"}
REQUIRE = {"sacrifice": "mate"}  # a sacrifice example must show its payoff
SKIP = {"hUAUF"}  # tagged "pin" but the line is a knight fork
OUT = Path(__file__).resolve().parent.parent / "src" / "learn" / "examples.json"


def pick(con: sqlite3.Connection, theme: str, *, max_rating: int = MAX_RATING, used: set = frozenset(), pure: bool = True) -> dict | None:
    rows = con.execute(
        "SELECT id, fen, moves, rating, popularity, nb_plays, themes FROM puzzle "
        "WHERE (' ' || themes || ' ') LIKE ? AND rating <= ? ORDER BY popularity DESC, nb_plays DESC",
        (f"% {theme} %", max_rating),
    )
    limit = MAX_PLIES.get(theme, 4)
    for r in rows:
        moves = r[2].split()
        themes = set(r[6].split())
        others = (themes & set(THEMES)) - {theme} - PHASES_AND_MATES
        if (len(moves) > limit or r[0] in used or r[0] in SKIP
                or (pure and others) or (theme in REQUIRE and REQUIRE[theme] not in themes)):
            continue
        return {"theme": theme, "id": r[0], "fen": r[1], "moves": moves, "rating": r[3], "themes": r[6].split()}
    return None


if __name__ == "__main__":
    con = sqlite3.connect(sys.argv[1])
    out: dict[str, dict] = {}
    used: set[str] = set()  # one puzzle serves one theme only
    for t in THEMES:
        # Widen the rating cap in steps for rare themes (the easy pool may have none).
        ex = next((e for pure in (True, False) for cap in (MAX_RATING, 1200, 1500) if (e := pick(con, t, max_rating=cap, used=used, pure=pure))), None)
        if ex is None:
            sys.exit(f"no example for {t}")
        out[t] = ex
        used.add(ex["id"])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=1) + "\n")
    print(f"wrote {len(out)} examples to {OUT}")
