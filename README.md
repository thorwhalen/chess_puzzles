# chess_puzzles

Beginner and low-intermediate chess tactics, built for a phone. Live at apps.thorwhalen.com/chess_puzzles/.

Pick a difficulty (Adaptive follows your rating) and optionally a theme (fork, pin, mate in 1/2/3, ...), then solve. Hints go piece, square, move. Wrong moves snap back, you can take back, retry, show the solution or flip the board. Rating and streak are saved in your browser.

## Run it

```bash
npm ci && npm run build            # builds the UI into frontend/
uvicorn server:app --port 8123 &   # API
npm run dev                        # UI at :5173, proxies /api/chess_puzzles to :8123
npm test && python -m pytest tests
```

## Puzzle data

Puzzles come from the [Lichess puzzle database](https://database.lichess.org/#puzzles) (CC0). The full dump is ~300 MB compressed, so it is stream-filtered and never stored:

```bash
curl -s https://database.lichess.org/lichess_db_puzzle.csv.zst | zstd -dc \
  | python scripts/build_puzzle_db.py ~/.local/share/chess_puzzles/puzzles/puzzles.sqlite
```

The result (~38k puzzles, ratings 400-1500, popular and well-tested ones, with depth for each theme at each level) is about 6 MB. It is data, not code: it lives under `$CHESS_PUZZLES_DATA_DIR` (default `~/.local/share/chess_puzzles`, kind `puzzles/`), is never committed and is not part of the deploy.

## Layout

- `server.py`: FastAPI, mounted by enlace at `/api/chess_puzzles` (`/next`, `/meta`, `/puzzle/{id}`).
- `src/engine.ts`: pure rules (replay, check a move, hints). `src/store.ts`: zustand + immer session and progress. `src/rating.ts`: Elo and the difficulty bands. `src/persist.ts`: the only module that touches localStorage.
- `scripts/build_puzzle_db.py`: the filter.

## Licences

Code MIT. Puzzles CC0 (Lichess). chess.js BSD-2-Clause, react-chessboard MIT. Chessground is GPL-3 and deliberately not used.
