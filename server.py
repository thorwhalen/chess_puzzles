"""chess_puzzles backend: serves beginner/low-intermediate Lichess puzzles from a SQLite file.

Mounted by enlace under ``/api/chess_puzzles/``. The puzzle database is *data*, not code: it
lives under ``$CHESS_PUZZLES_DATA_DIR`` (default ``~/.local/share/chess_puzzles``) in the
``puzzles/`` kind and is built by ``scripts/build_puzzle_db.py``. If it is missing the app
degrades to a 503 on the puzzle routes; it never fails at import (other apps share the process).

Puzzles come from the Lichess puzzle database (CC0). See README.md.
"""

from __future__ import annotations

import os
import sqlite3
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query

DATA_ENV_VAR = "CHESS_PUZZLES_DATA_DIR"
DB_NAME = "puzzles.sqlite"
MAX_EXCLUDE = 300  # recent ids the client may ask us to skip
FALLBACK_MAX_DISTANCE = 500  # rating points a themed fallback may stray from the requested band

app = FastAPI(title="Chess Puzzles")


def data_root() -> Path:
    return Path(os.environ.get(DATA_ENV_VAR) or Path.home() / ".local" / "share" / "chess_puzzles")


def _connect() -> sqlite3.Connection:
    path = data_root() / "puzzles" / DB_NAME
    if not path.exists():
        raise HTTPException(503, "Puzzle database not provisioned on this server.")
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    return con


def _to_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "fen": row["fen"],
        "moves": row["moves"].split(),
        "rating": row["rating"],
        "themes": row["themes"].split(),
    }


@lru_cache(maxsize=4)
def _meta_for(db_mtime: float) -> dict:  # keyed on the file's mtime: rebuilt only when the DB changes
    with _connect() as con:
        lo, hi, n = con.execute("SELECT MIN(rating), MAX(rating), COUNT(*) FROM puzzle").fetchone()
        counts: dict[str, int] = {}
        for (themes,) in con.execute("SELECT themes FROM puzzle"):
            for t in themes.split():
                counts[t] = counts.get(t, 0) + 1
    return {"min_rating": lo, "max_rating": hi, "count": n, "themes": counts}


@app.get("/meta")
def meta() -> dict:
    """Rating range and the available themes with counts."""
    path = data_root() / "puzzles" / DB_NAME
    if not path.exists():
        raise HTTPException(503, "Puzzle database not provisioned on this server.")
    return _meta_for(path.stat().st_mtime)


@app.get("/next")
def next_puzzle(
    min_rating: int = Query(0, ge=0, le=4000),
    max_rating: int = Query(4000, ge=0, le=4000),
    theme: str | None = Query(None, pattern=r"^[A-Za-z0-9]+$"),
    exclude: str = Query("", max_length=MAX_EXCLUDE * 12),
) -> dict:
    """A random puzzle in the rating band (and theme), skipping recently seen ids."""
    ids = [i for i in exclude.split(",", MAX_EXCLUDE) if i.isascii() and i.isalnum()]
    sql = "SELECT * FROM puzzle WHERE rating BETWEEN ? AND ?"
    args: list = [min_rating, max_rating]
    if theme:
        sql += " AND (' ' || themes || ' ') LIKE ?"
        args.append(f"% {theme} %")
    if ids:
        sql += f" AND id NOT IN ({','.join('?' * len(ids))})"
        args += ids
    sql += " ORDER BY RANDOM() LIMIT 1"
    with _connect() as con:
        row = con.execute(sql, args).fetchone()
        if row is None and ids:  # everything in the band was seen: allow repeats
            row = con.execute(sql.split(" AND id NOT IN")[0] + " ORDER BY RANDOM() LIMIT 1",
                              args[: len(args) - len(ids)]).fetchone()
    if row is None and theme:  # nothing of that theme in the band: the nearest in rating, not too far off
        mid = (min_rating + max_rating) / 2
        base = "SELECT * FROM puzzle WHERE (' ' || themes || ' ') LIKE ? AND ABS(rating - ?) <= ?"
        order = " ORDER BY ABS(rating - ?), RANDOM() LIMIT 1"
        args = [f"% {theme} %", mid, FALLBACK_MAX_DISTANCE]
        with _connect() as con:
            if ids:
                row = con.execute(base + f" AND id NOT IN ({','.join('?' * len(ids))})" + order, [*args, *ids, mid]).fetchone()
            if row is None:  # all seen: allow a repeat rather than nothing
                row = con.execute(base + order, [*args, mid]).fetchone()
    if row is None:
        raise HTTPException(404, "No puzzle matches these filters.")
    return _to_dict(row)


@app.get("/puzzle/{puzzle_id}")
def get_puzzle(puzzle_id: str) -> dict:
    with _connect() as con:
        row = con.execute("SELECT * FROM puzzle WHERE id = ?", (puzzle_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "Unknown puzzle.")
    return _to_dict(row)
