"""Explicit integration test: stops only the subprocess created in its own temp store."""
import sys
import tempfile
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from workers.training import store
from services.api.app.training_service import TrainingService
from services.api.app.training_validation import validate_payload
from services.api.tests.test_training import sample

previous = store.DATA
temp = tempfile.TemporaryDirectory(dir=store.ROOT / '.runtime', prefix='training-recovery-')
store.DATA = Path(temp.name).resolve()
engine = second = None
try:
    engine = TrainingService()
    engine.start()
    job = store.create(validate_payload(sample()))
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline and store.get(job['id'])['state'] == 'QUEUED':
        time.sleep(.1)
    assert store.get(job['id'])['state'] == 'PREPARING'
    engine.close()
    engine = None
    assert store.get(job['id'])['state'] == 'FAILED'
    assert store.payload(job['id'])['dataset']['id'] == 'synthetic-dataset'
    second = TrainingService()
    second.start()
    recovered = store.get(job['id'])
    assert recovered['state'] == 'FAILED' and recovered['error']
    retry = store.create(store.payload(job['id']), parent=job['id'])
    assert retry['retryOf'] == job['id'] and retry['id'] != job['id']
    store.cancel(retry['id'])
    print('PASS: interrupted worker, persisted controlled failure, coordinator restart and independent retry payload.')
finally:
    if engine:
        engine.close()
    if second:
        second.close()
    assert Path(temp.name).resolve().is_relative_to((store.ROOT / '.runtime').resolve())
    store.DATA = previous
    temp.cleanup()
