# API local M01, M04 y M06

FastAPI sirve `GET /api/v1/health`, `GET /api/v1/dashboard/system` y `POST /api/v1/architectures/validate`. M04 valida diseños analíticamente sin cargar TensorFlow. M06 añade cola de entrenamiento y eventos; TensorFlow se carga únicamente en el worker separado.
CPU, memoria y disco son mediciones reales del host de la API con psutil. No se exponen rutas, usuarios, procesos ni variables de entorno. Las respuestas de recursos llevan Cache-Control: no-store.

## Ejecución local

Desde la raíz, con Python 3.12 o compatible:

```powershell
python -m venv .venv
.venv/Scripts/python -m pip install -r services/api/requirements.txt
.venv/Scripts/python -m pip install -r workers/training/requirements.txt
.venv/Scripts/python -m uvicorn services.api.app.main:app --host 127.0.0.1 --port 8000 --timeout-graceful-shutdown 5
```

En otra terminal ejecutar `npm run dev`. Vite y preview envían `/api` al puerto 8000. No se necesitan CORS ni secretos en React. Para el entorno de esta revisión las dependencias están instaladas en `.runtime`; usar PYTHONPATH apuntando a esa carpeta con el Python del runtime de Codex.

El servicio está destinado a desarrollo en loopback. Antes de publicarlo se debe integrar autenticación y autorización de administración, HTTPS y límites de tasa de la plataforma. No iniciar en 0.0.0.0 como despliegue público.

M06 implementa cola FIFO, workers aislados por proceso, SQLite local y modelos .keras reales. PostgreSQL y la API empresarial de proyectos siguen pendientes; el monitoreo distingue disponibilidad del worker y PostgreSQL. GPU queda sin medición y el motor M06 usa CPU. El resumen de simulaciones sigue siendo del navegador; los trabajos reales proceden de la API. Ver docs/architecture/training.md y workers/training/README.md.

Pruebas: `python -m unittest discover -s services/api/tests -v` con las dependencias instaladas.
