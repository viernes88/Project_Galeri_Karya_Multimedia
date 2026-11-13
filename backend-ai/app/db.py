import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone

from .config import Config

SCHEMA = """
CREATE TABLE IF NOT EXISTS submissions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    creator      TEXT NOT NULL,
    title        TEXT NOT NULL,
    description  TEXT NOT NULL,
    genre        TEXT NOT NULL,
    confidence   REAL,
    file_hash    TEXT NOT NULL UNIQUE,
    image_cid    TEXT NOT NULL,
    metadata_cid TEXT NOT NULL,
    token_uri    TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    token_id     INTEGER,
    tx_hash      TEXT,
    note         TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sub_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_sub_creator ON submissions(creator);
"""


def _now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@contextmanager
def connect():
    conn = sqlite3.connect(Config.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    Config.DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as c:
        c.executescript(SCHEMA)


def serialize(row) -> dict:
    return {
        "id": row["id"],
        "creator": row["creator"],
        "title": row["title"],
        "description": row["description"],
        "genre": row["genre"],
        "confidence": row["confidence"],
        "fileHash": row["file_hash"],
        "imageCid": row["image_cid"],
        "metadataCid": row["metadata_cid"],
        "tokenURI": row["token_uri"],
        "imageUrl": f"{Config.IPFS_GATEWAY}/{row['image_cid']}",
        "status": row["status"],
        "tokenId": row["token_id"],
        "txHash": row["tx_hash"],
        "note": row["note"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def find_by_hash(file_hash: str):
    with connect() as c:
        row = c.execute("SELECT * FROM submissions WHERE file_hash = ?", (file_hash,)).fetchone()
    return serialize(row) if row else None


def insert_submission(d: dict) -> int:
    now = _now()
    with connect() as c:
        cur = c.execute(
            """INSERT INTO submissions
               (creator, title, description, genre, confidence, file_hash,
                image_cid, metadata_cid, token_uri, status, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,'pending',?,?)""",
            (d["creator"], d["title"], d["description"], d["genre"], d.get("confidence"),
             d["file_hash"], d["image_cid"], d["metadata_cid"], d["token_uri"], now, now),
        )
        return cur.lastrowid


def get_submission(sub_id: int):
    with connect() as c:
        row = c.execute("SELECT * FROM submissions WHERE id = ?", (sub_id,)).fetchone()
    return serialize(row) if row else None


def list_submissions(status=None, creator=None):
    sql, params, where = "SELECT * FROM submissions", [], []
    if status:
        where.append("status = ?")
        params.append(status)
    if creator:
        where.append("creator = ?")
        params.append(creator.lower())
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY id DESC"
    with connect() as c:
        rows = c.execute(sql, params).fetchall()
    return [serialize(r) for r in rows]


def update_status(sub_id, status, token_id=None, tx_hash=None, note=None):
    with connect() as c:
        c.execute(
            """UPDATE submissions
               SET status = ?, token_id = ?, tx_hash = ?, note = ?, updated_at = ?
               WHERE id = ?""",
            (status, token_id, tx_hash, note, _now(), sub_id),
        )
