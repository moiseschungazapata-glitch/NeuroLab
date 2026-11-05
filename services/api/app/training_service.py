import importlib.util
import os
import secrets
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
import psutil
from workers.training import store


class TrainingService:
    def __init__(self):
        store.initialize()
        self.token = secrets.token_urlsafe(32)
        self.root = Path(__file__).resolve().parents[3]
        self.tf_path = Path(os.environ.get('NEUROLAB_TF_PATH', self.root / '.training-runtime'))
        self.engine_ready = (self.tf_path / 'tensorflow').is_dir() or importlib.util.find_spec('tensorflow') is not None
        self.stop_event = threading.Event()
        self.process = self.identifier = self.started = None
        self.lock = None

    def start(self):
        self.lock = open(store.DATA / 'coordinator.lock', 'a+b')
        self.lock.seek(0)
        if os.name == 'nt':
            import msvcrt
            if not self.lock.read(1):
                self.lock.write(b'0')
                self.lock.flush()
            self.lock.seek(0)
            msvcrt.locking(self.lock.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(self.lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        # A lost API process cannot leave an untracked worker consuming resources.
        for row in store.active_processes():
            try:
                process = psutil.Process(row['pid']) if row['pid'] else None
                if process and 'workers.training.worker' in process.cmdline() and row['id'] in process.cmdline() and Path(process.cwd()).resolve() == self.root:
                    process.terminate()
                    try:
                        process.wait(3)
                    except psutil.TimeoutExpired:
                        process.kill()
                        process.wait(3)
            except (psutil.Error, OSError):
                pass
            store.update(row['id'], state='FAILED', error='La API se reinició durante el trabajo. Puedes reintentar conservando la configuración.', log='Se recuperó el estado persistido tras un reinicio.')
        self.thread = threading.Thread(target=self.loop, daemon=True, name='training-coordinator')
        self.thread.start()

    def terminate(self, state, message):
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(3)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(3)
        if self.identifier:
            store.update(self.identifier, state=state, error=message if state == 'FAILED' else None, log=message)
        self.process = self.identifier = self.started = None

    def loop(self):
        while not self.stop_event.wait(0.25):
            try:
                if self.process:
                    record = store.get(self.identifier)
                    if self.process.poll() is not None:
                        if record['state'] not in store.TERMINAL:
                            store.update(self.identifier, state='CANCELLED' if record['cancelRequested'] else 'FAILED', error=None if record['cancelRequested'] else 'El proceso terminó antes de confirmar el resultado.', log='Finalizó el proceso del worker.')
                        self.process = self.identifier = self.started = None
                        continue
                    if record['cancelRequested'] and (datetime.now(timezone.utc)-datetime.fromisoformat(record['cancelAt'])).total_seconds() > 5:
                        self.terminate('CANCELLED', 'Cancelación confirmada; el proceso fue detenido tras cinco segundos de espera.')
                        continue
                    if time.monotonic() - self.started > 300:
                        self.terminate('FAILED', 'Se alcanzó el límite local de 300 segundos. Reduce datos, capas o épocas y reintenta.')
                        continue
                    try:
                        memory = psutil.Process(self.process.pid).memory_info().rss
                        if memory > 2 * 1024**3:
                            self.terminate('FAILED', 'El proceso superó el límite local de 2 GiB de memoria.')
                    except psutil.Error:
                        pass
                    continue
                queued = sorted((r for r in store.list_jobs() if r['state'] == 'QUEUED'), key=lambda r: r['createdAt'])
                if queued and self.engine_ready:
                    identifier = queued[0]['id']
                    record = store.update(identifier, state='PREPARING', log='Worker asignado. Preparando TensorFlow CPU.')
                    if record['state'] != 'PREPARING':
                        continue
                    env = {**os.environ, 'PYTHONPATH': os.pathsep.join([str(self.tf_path), str(self.root), os.environ.get('PYTHONPATH', '')]), 'NEUROLAB_TRAINING_DIR': str(store.DATA), 'TF_CPP_MIN_LOG_LEVEL': '2', 'CUDA_VISIBLE_DEVICES': '-1', 'OMP_NUM_THREADS': '2', 'PYTHONUNBUFFERED': '1'}
                    self.identifier, self.started = identifier, time.monotonic()
                    log_path = store.directory(identifier) / 'worker-process.log'
                    with open(log_path, 'ab') as output:
                        self.process = subprocess.Popen([sys.executable, '-m', 'workers.training.worker', identifier], cwd=self.root, env=env, stdin=subprocess.DEVNULL, stdout=output, stderr=output, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
                    store.set_pid(identifier, self.process.pid)
            except Exception:
                if self.identifier:
                    self.terminate('FAILED', 'No se pudo iniciar o supervisar el worker. Revisa el entorno local.')

    def close(self):
        self.stop_event.set()
        if hasattr(self, 'thread'):
            self.thread.join(5)
        self.terminate('FAILED', 'La API se detuvo durante el entrenamiento. La configuración se conserva para reintentar.')
        if self.lock:
            self.lock.close()
