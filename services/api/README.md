# API de monitoreo M01

FastAPI sirve `GET /api/v1/health` y `GET /api/v1/dashboard/system`.
CPU, memoria y disco son mediciones reales del host de la API con psutil. No se exponen rutas, usuarios, procesos ni variables de entorno. Las respuestas de recursos llevan Cache-Control: no-store.

## Ejecución local

Desde la raíz, con Python 3.12 o compatible:

```powershell
python -m venv .venv
.venv/Scripts/python -m pip install -r services/api/requirements.txt
.venv/Scripts/python -m uvicorn services.api.app.main:app --host 127.0.0.1 --port 8000
```

En otra terminal ejecutar `npm run dev`. Vite y preview envían `/api` al puerto 8000. No se necesitan CORS ni secretos en React. Para el entorno de esta revisión las dependencias están instaladas en `.runtime`; usar PYTHONPATH apuntando a esa carpeta con el Python del runtime de Codex.

El servicio está destinado a desarrollo en loopback. Antes de publicarlo se debe integrar autenticación y autorización de administración, HTTPS y límites de tasa de la plataforma. No iniciar en 0.0.0.0 como despliegue público.

PostgreSQL, workers, cola, modelos y API de proyectos todavía no están implementados. El endpoint declara estos servicios sin configurar, nunca saludables por inferencia. GPU queda sin medición. Los resúmenes de proyectos y experimentos siguen calculándose a partir del navegador, sin sincronización multiusuario.

Pruebas: `python -m unittest discover -s services/api/tests -v` con las dependencias instaladas.
