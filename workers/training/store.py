"""Durable local jobs and event journal, shared by API and isolated workers."""
import json
import os
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = Path(os.environ.get("NEUROLAB_TRAINING_DIR", ROOT / ".runtime" / "training")).resolve()
TERMINAL = {"COMPLETED", "FAILED", "CANCELLED"}
TRANSITIONS = {"QUEUED": {"PREPARING", "CANCELLED", "FAILED"}, "PREPARING": {"RUNNING", "CANCELLED", "FAILED"}, "RUNNING": TERMINAL}

class CapacityError(ValueError):
    pass


def now():
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def connect():
    DATA.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DATA / "jobs.sqlite3", timeout=10)
    db.row_factory = sqlite3.Row
    try:
        with db:
            yield db
    finally:
        db.close()


def initialize():
    with connect() as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY,state TEXT NOT NULL,created TEXT NOT NULL,record TEXT NOT NULL,payload TEXT NOT NULL,pid INTEGER)")
        db.execute("CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY AUTOINCREMENT,job_id TEXT NOT NULL,record TEXT NOT NULL)")
        db.execute("CREATE INDEX IF NOT EXISTS events_job ON events(job_id,seq)")
        if 'submission' not in [r[1] for r in db.execute('PRAGMA table_info(jobs)')]:
            db.execute('ALTER TABLE jobs ADD COLUMN submission TEXT')
        db.execute('CREATE UNIQUE INDEX IF NOT EXISTS jobs_submission ON jobs(submission)')


def journal(db, record):
    event = db.execute("INSERT INTO events(job_id,record) VALUES (?,?)", (record["id"], ""))
    record["eventId"] = event.lastrowid
    body = json.dumps(record, allow_nan=False)
    db.execute("UPDATE events SET record=? WHERE seq=?", (body, event.lastrowid))
    db.execute("UPDATE jobs SET state=?,record=? WHERE id=?", (record["state"], body, record["id"]))
    return record


def create(payload, parent=None, submission=None):
    identifier = str(uuid.uuid4())
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        if submission:
            existing = db.execute('SELECT record FROM jobs WHERE submission=?', (submission,)).fetchone()
            if existing:
                return json.loads(existing[0])
        if db.execute("SELECT COUNT(*) FROM jobs WHERE state NOT IN ('COMPLETED','FAILED','CANCELLED')").fetchone()[0] >= 5:
            raise CapacityError("La cola local admite un trabajo activo y cuatro pendientes.")
        size, count = db.execute("SELECT COALESCE(SUM(LENGTH(payload)),0),COUNT(*) FROM jobs").fetchone()
        body = json.dumps(payload, allow_nan=False)
        if count >= 50 or size + len(body.encode()) > 256 * 1024 * 1024:
            raise CapacityError("Se alcanzó el límite local de historial (50 trabajos o 256 MB de datos preparados).")
        record = {"id": identifier, "state": "QUEUED", "projectId": payload["project"]["id"], "projectName": payload["project"]["name"], "family": payload["architecture"]["family"], "architecture": payload["architecture"], "config": payload["config"], "dataset": payload["dataset"], "createdAt": now(), "updatedAt": now(), "epoch": 0, "progress": 0, "metrics": [], "artifacts": [], "logs": ["Trabajo validado y en cola FIFO local."], "cancelRequested": False, "retryOf": parent}
        db.execute("INSERT INTO jobs(id,state,created,record,payload,submission) VALUES (?,?,?,?,?,?)", (identifier, "QUEUED", record["createdAt"], "", body, submission))
        return journal(db, record)


def get(identifier):
    with connect() as db:
        row = db.execute("SELECT record FROM jobs WHERE id=?", (identifier,)).fetchone()
        if not row:
            raise KeyError(identifier)
        return json.loads(row[0])


def payload(identifier):
    with connect() as db:
        return json.loads(db.execute("SELECT payload FROM jobs WHERE id=?", (identifier,)).fetchone()[0])


def list_jobs():
    with connect() as db:
        return [json.loads(row[0]) for row in db.execute("SELECT record FROM jobs ORDER BY created DESC")]


def update(identifier, state=None, log=None, **changes):
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT record FROM jobs WHERE id=?", (identifier,)).fetchone()
        if not row:
            raise KeyError(identifier)
        record = json.loads(row[0])
        if record["state"] in TERMINAL:
            return record
        if state == "COMPLETED" and record["cancelRequested"]:
            state = "CANCELLED"
            changes.pop("artifacts", None)
        if state and state != record["state"] and state not in TRANSITIONS.get(record["state"], set()):
            raise ValueError("Transición de estado inválida.")
        record.update(changes)
        if state:
            record["state"] = state
        if record["state"] in TERMINAL:
            record["endedAt"] = now()
        if log:
            record["logs"] = (record["logs"] + [log])[-40:]
        record["updatedAt"] = now()
        return journal(db, record)


def cancel(identifier):
    record = get(identifier)
    if record["state"] in TERMINAL:
        raise ValueError("El trabajo ya terminó.")
    return update(identifier, state="CANCELLED" if record["state"] == "QUEUED" else None, cancelRequested=True, cancelAt=now(), log="Cancelación solicitada; el proceso confirmará el estado final.")


def set_pid(identifier, pid):
    with connect() as db:
        db.execute("UPDATE jobs SET pid=? WHERE id=?", (pid, identifier))


def active_processes():
    with connect() as db:
        return list(db.execute("SELECT id,pid FROM jobs WHERE state IN ('PREPARING','RUNNING')"))


def events(identifier, after):
    with connect() as db:
        return [json.loads(row[0]) for row in db.execute("SELECT record FROM events WHERE job_id=? AND seq>? ORDER BY seq LIMIT 250", (identifier, after))]


def directory(identifier):
    # Only identifiers present in the database are accepted; no paths from requests.
    identifier = str(uuid.UUID(identifier))
    get(identifier)
    path = (DATA / identifier).resolve()
    if not path.is_relative_to(DATA):
        raise ValueError("Ruta inválida.")
    path.mkdir(exist_ok=True)
    return path
