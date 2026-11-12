"""Local monitoring API. Bind to loopback; production requires platform auth."""
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from contextlib import asynccontextmanager
import psutil
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from .architectures import validate_architecture
from .config import ALLOWED_ORIGINS
from .training_service import TrainingService
from .training_routes import router as training_router
from .reports import router as reports_router

@asynccontextmanager
async def lifespan(app):
    engine = TrainingService()
    engine.start()
    app.state.training = engine
    try:
        yield
    finally:
        engine.close()


app = FastAPI(title="NeuroLab local services", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(ALLOWED_ORIGINS),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "Last-Event-ID"],
    expose_headers=["Content-Disposition"],
    max_age=600,
)
app.include_router(training_router)
app.include_router(reports_router)
@app.middleware('http')
async def no_training_cache(request, call_next):
    response = await call_next(request)
    if '/training' in request.url.path or '/model-versions' in request.url.path:
        response.headers['Cache-Control'] = 'no-store'
    return response
STARTED = time.monotonic()


def system_snapshot():
    cpu = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage(Path(__file__).anchor or os.sep)
    return {
        "sampledAt": datetime.now(timezone.utc).isoformat(),
        "uptimeSeconds": round(time.monotonic() - STARTED),
        "cpuPercent": cpu,
        "memory": {"usedBytes": memory.total - memory.available, "totalBytes": memory.total, "percent": memory.percent},
        "disk": {"usedBytes": disk.used, "totalBytes": disk.total, "percent": disk.percent},
        "services": {"api": "available", "database": "not_configured", "trainingWorker": "available" if getattr(app.state, 'training', None) and app.state.training.engine_ready else "not_configured", "gpu": "not_measured"},
    }


@app.get("/api/v1/dashboard/system")
def dashboard_system(response: Response):
    response.headers["Cache-Control"] = "no-store"
    return system_snapshot()


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "service": "dashboard-monitoring"}


@app.post("/api/v1/architectures/validate")
def architecture_validation(architecture: dict, response: Response):
    response.headers["Cache-Control"] = "no-store"
    return validate_architecture(architecture)
