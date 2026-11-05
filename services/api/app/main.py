"""Local monitoring API. Bind to loopback; production requires platform auth."""
import os
import time
from datetime import datetime, timezone
from pathlib import Path
import psutil
from fastapi import FastAPI, Response

app = FastAPI(title="NeuroLab monitoring", version="1.0.0")
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
        "services": {"api": "available", "database": "not_configured", "trainingWorker": "not_configured", "gpu": "not_measured"},
    }


@app.get("/api/v1/dashboard/system")
def dashboard_system(response: Response):
    response.headers["Cache-Control"] = "no-store"
    return system_snapshot()


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "service": "dashboard-monitoring"}
