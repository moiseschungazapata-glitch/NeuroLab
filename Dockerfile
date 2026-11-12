FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    TF_CPP_MIN_LOG_LEVEL=2 \
    CUDA_VISIBLE_DEVICES=-1

WORKDIR /app

RUN apt-get update && \
    apt-get install --yes --no-install-recommends libgomp1 && \
    rm -rf /var/lib/apt/lists/*

COPY services/api/requirements.txt /tmp/api-requirements.txt
COPY workers/training/requirements.txt /tmp/worker-requirements.txt
RUN python -m pip install --upgrade pip && \
    python -m pip install -r /tmp/api-requirements.txt -r /tmp/worker-requirements.txt

COPY services /app/services
COPY workers /app/workers
RUN mkdir -p /data/training

EXPOSE 8000

CMD ["/bin/sh", "-c", "exec python -m uvicorn services.api.app.main:app --host 0.0.0.0 --port ${PORT:-8000} --timeout-graceful-shutdown 5"]
