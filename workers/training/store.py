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
        db.execute("""CREATE TABLE IF NOT EXISTS evaluations (
            job_id TEXT PRIMARY KEY REFERENCES jobs(id),
            observations TEXT NOT NULL, limitations TEXT NOT NULL,
            revision INTEGER NOT NULL, updated_at TEXT NOT NULL
        )""")
        db.execute("""CREATE TABLE IF NOT EXISTS model_versions (
            job_id TEXT PRIMARY KEY REFERENCES jobs(id),
            project_id INTEGER NOT NULL, version INTEGER NOT NULL,
            status TEXT NOT NULL, revision INTEGER NOT NULL,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
            snapshot TEXT NOT NULL,
            UNIQUE(project_id, version)
        )""")
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


class EvaluationConflict(ValueError):
    pass


class RegistryConflict(ValueError):
    pass


def get_evaluation(identifier):
    with connect() as db:
        row = db.execute(
            'SELECT observations, limitations, revision, updated_at AS updatedAt FROM evaluations WHERE job_id=?',
            (identifier,),
        ).fetchone()
    return dict(row) if row else {'observations': '', 'limitations': '', 'revision': 0, 'updatedAt': None}


def save_evaluation(identifier, observations, limitations, revision):
    with connect() as db:
        db.execute('BEGIN IMMEDIATE')
        if not db.execute('SELECT 1 FROM jobs WHERE id=?', (identifier,)).fetchone():
            raise KeyError(identifier)
        current = db.execute('SELECT revision FROM evaluations WHERE job_id=?', (identifier,)).fetchone()
        if revision != (current['revision'] if current else 0):
            raise EvaluationConflict('La evaluación cambió desde que la abriste.')
        saved = {'observations': observations, 'limitations': limitations, 'revision': revision + 1, 'updatedAt': now()}
        db.execute('''INSERT INTO evaluations (job_id, observations, limitations, revision, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(job_id) DO UPDATE SET observations=excluded.observations,
            limitations=excluded.limitations, revision=excluded.revision, updated_at=excluded.updated_at''',
            (identifier, observations, limitations, saved['revision'], saved['updatedAt']))
        return saved


def _model_version(row):
    result = json.loads(row['snapshot'])
    result.update({
        'jobId': row['job_id'], 'projectId': row['project_id'],
        'version': row['version'], 'status': row['status'],
        'revision': row['revision'], 'createdAt': row['created_at'],
        'updatedAt': row['updated_at'],
    })
    return result


def get_model_version_from_db(db, identifier):
    row = db.execute('SELECT * FROM model_versions WHERE job_id=?', (identifier,)).fetchone()
    if not row:
        raise KeyError(identifier)
    return _model_version(row)


def list_model_versions():
    with connect() as db:
        rows = db.execute('SELECT * FROM model_versions ORDER BY created_at DESC').fetchall()
    return [_model_version(row) for row in rows]


def get_model_version(identifier):
    with connect() as db:
        return get_model_version_from_db(db, identifier)


def register_model(identifier):
    with connect() as db:
        db.execute('BEGIN IMMEDIATE')
        existing = db.execute('SELECT * FROM model_versions WHERE job_id=?', (identifier,)).fetchone()
        if existing:
            return _model_version(existing)
        job_row = db.execute('SELECT record FROM jobs WHERE id=?', (identifier,)).fetchone()
        if not job_row:
            raise KeyError(identifier)
        job = json.loads(job_row['record'])
        if job['state'] != 'COMPLETED' or not job.get('artifacts'):
            raise RegistryConflict('Solo se registran ejecuciones completadas con artefactos.')
        version = db.execute(
            'SELECT COALESCE(MAX(version), 0) + 1 FROM model_versions WHERE project_id=?',
            (job['projectId'],),
        ).fetchone()[0]
        stamp = now()
        snapshot = {
            'projectName': job['projectName'], 'family': job['family'],
            'architecture': job['architecture'], 'config': job['config'],
            'dataset': job['dataset'], 'testMetrics': job.get('testMetrics', {}),
            'artifacts': job['artifacts'], 'startedAt': job.get('startedAt'),
            'endedAt': job.get('endedAt'), 'tensorflowVersion': job.get('tensorflowVersion'),
            'stoppedEarly': job.get('stoppedEarly', False),
            'weightsChanged': job.get('weightsChanged', False),
        }
        db.execute('''INSERT INTO model_versions
            (job_id, project_id, version, status, revision, created_at, updated_at, snapshot)
            VALUES (?, ?, ?, 'Borrador', 0, ?, ?, ?)''',
            (identifier, job['projectId'], version, stamp, stamp, json.dumps(snapshot, allow_nan=False)))
        return get_model_version_from_db(db, identifier)


def change_model_status(identifier, status, revision):
    transitions = {'Borrador': 'Revisado', 'Revisado': 'Aprobado', 'Aprobado': 'Retirado'}
    with connect() as db:
        db.execute('BEGIN IMMEDIATE')
        row = db.execute('SELECT * FROM model_versions WHERE job_id=?', (identifier,)).fetchone()
        if not row:
            raise KeyError(identifier)
        if revision != row['revision']:
            raise RegistryConflict('La versión cambió desde que la abriste.')
        if transitions.get(row['status']) != status:
            raise RegistryConflict('Transición de estado no permitida.')
        db.execute('UPDATE model_versions SET status=?, revision=?, updated_at=? WHERE job_id=?',
                   (status, revision + 1, now(), identifier))
        return get_model_version_from_db(db, identifier)


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
