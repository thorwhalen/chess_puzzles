"""Backend tests against a tiny DB built by the real build script (no network)."""

import importlib.util
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent.parent
HEADER = "PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags"
FEN = "2r3k1/1p3ppp/3p3q/3P1b2/5N2/Pp2Q1P1/1PR4P/K6R b - - 0 27"


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture()
def client(tmp_path, monkeypatch):
    build = _load("build_puzzle_db", ROOT / "scripts" / "build_puzzle_db.py")
    rows = [HEADER]
    # one kept (mate in 1, 554), one too hard (2400), one unpopular
    rows.append(f"aaa01,{FEN},c8c2 e3e8,554,75,95,900,endgame mate mateIn1 oneMove,u,")
    rows.append(f"aaa02,{FEN},c8c2 e3e8,2400,75,95,900,mateIn1,u,")
    rows.append(f"aaa03,{FEN},c8c2 e3e8,600,75,10,900,mateIn1,u,")
    (tmp_path / "puzzles").mkdir()
    assert build.build(rows, str(tmp_path / "puzzles" / "puzzles.sqlite")) == 1
    monkeypatch.setenv("CHESS_PUZZLES_DATA_DIR", str(tmp_path))
    server = _load("chess_puzzles_server", ROOT / "server.py")
    return TestClient(server.app)


def test_next_in_band_and_theme(client):
    r = client.get("/next", params={"min_rating": 400, "max_rating": 900, "theme": "mateIn1"})
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == "aaa01" and body["moves"] == ["c8c2", "e3e8"] and "mateIn1" in body["themes"]


def test_filters_that_match_nothing_404(client):
    assert client.get("/next", params={"min_rating": 1000, "max_rating": 1500}).status_code == 404
    assert client.get("/next", params={"theme": "fork"}).status_code == 404


def test_exclude_falls_back_to_repeat(client):
    assert client.get("/next", params={"exclude": "aaa01"}).json()["id"] == "aaa01"


def test_theme_param_is_validated(client):
    assert client.get("/next", params={"theme": "x' OR 1=1 --"}).status_code == 422


def test_meta(client):
    m = client.get("/meta").json()
    assert m["count"] == 1 and m["themes"]["mateIn1"] == 1


def test_missing_db_is_503_not_import_error(tmp_path, monkeypatch):
    monkeypatch.setenv("CHESS_PUZZLES_DATA_DIR", str(tmp_path))
    server = _load("chess_puzzles_server", ROOT / "server.py")
    assert TestClient(server.app).get("/next").status_code == 503
