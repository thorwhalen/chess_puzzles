"""Stream-filter the Lichess puzzle dump into a small SQLite file of beginner puzzles.

The full dump (database.lichess.org, CC0) is ~4M puzzles; only the low ratings are kept,
so the result is a few MB. The dump is never stored: read it from stdin.

    curl -s https://database.lichess.org/lichess_db_puzzle.csv.zst | zstd -dc \
        | python scripts/build_puzzle_db.py OUT.sqlite

Selection (all knobs are keyword arguments of ``build``):
  * rating in [min_rating, max_rating], rating deviation <= max_rd (rating is trustworthy)
  * popularity >= min_popularity and nb_plays >= min_plays (well-liked, well-tested puzzles)
  * per rating bucket keep the ``per_bucket`` most popular, plus the ``per_theme`` most
    popular of every theme in ``FEATURED_THEMES`` so each theme has depth at each level.
"""

from __future__ import annotations

import csv
import sqlite3
import sys
from collections import defaultdict
from collections.abc import Iterable

FEATURED_THEMES = (
    "mateIn1", "mateIn2", "mateIn3", "fork", "pin", "skewer", "discoveredAttack",
    "hangingPiece", "backRankMate", "trappedPiece", "sacrifice", "deflection",
    "attraction", "doubleCheck", "smotheredMate", "capturingDefender", "promotion",
    "advancedPawn", "exposedKing", "kingsideAttack", "queensideAttack", "endgame",
    "opening", "middlegame", "intermezzo", "quietMove", "xRayAttack", "zugzwang",
    "defensiveMove", "clearance", "interference", "equality", "crushing", "advantage",
)

SCHEMA = """
CREATE TABLE puzzle (
  id TEXT PRIMARY KEY, fen TEXT NOT NULL, moves TEXT NOT NULL, rating INTEGER NOT NULL,
  popularity INTEGER NOT NULL, nb_plays INTEGER NOT NULL, themes TEXT NOT NULL
);
CREATE INDEX puzzle_rating ON puzzle(rating);
"""


def _rows(lines: Iterable[str]):
    # header: PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags
    reader = csv.reader(lines)
    next(reader)
    yield from reader


def build(
    lines: Iterable[str],
    out_path: str,
    *,
    min_rating: int = 400,
    max_rating: int = 1500,
    max_rd: int = 90,
    min_popularity: int = 90,
    min_plays: int = 500,
    bucket: int = 100,
    per_bucket: int = 2500,
    per_theme: int = 120,
) -> int:
    kept: dict[str, tuple] = {}
    for r in _rows(lines):
        rating, rd, pop, plays = int(r[3]), int(r[4]), int(r[5]), int(r[6])
        if not (min_rating <= rating <= max_rating) or rd > max_rd:
            continue
        if pop < min_popularity or plays < min_plays:
            continue
        kept[r[0]] = (r[0], r[1], r[2], rating, pop, plays, r[7])

    by_bucket = defaultdict(list)
    by_theme = defaultdict(list)
    for row in kept.values():
        b = row[3] // bucket
        by_bucket[b].append(row)
        for t in set(row[6].split()) & set(FEATURED_THEMES):
            by_theme[(b, t)].append(row)
    rank = lambda row: (row[4], row[5])  # popularity, then plays
    chosen: dict[str, tuple] = {}
    for rows, n in [(v, per_bucket) for v in by_bucket.values()] + [
        (v, per_theme) for v in by_theme.values()
    ]:
        for row in sorted(rows, key=rank, reverse=True)[:n]:
            chosen[row[0]] = row

    con = sqlite3.connect(out_path)
    con.executescript("DROP TABLE IF EXISTS puzzle;" + SCHEMA)
    con.executemany("INSERT INTO puzzle VALUES (?,?,?,?,?,?,?)", chosen.values())
    con.commit()
    con.close()
    return len(chosen)


if __name__ == "__main__":
    n = build(sys.stdin, sys.argv[1])
    print(f"wrote {n} puzzles to {sys.argv[1]}")
