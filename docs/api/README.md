# Contrato de monitoreo M01

`GET /api/v1/health`: disponibilidad del proceso de monitoreo; no acredita salud de toda la plataforma.

`GET /api/v1/dashboard/system`: sampledAt (UTC ISO), uptimeSeconds del proceso, cpuPercent (muestra de 100 ms), memory y disk con usedBytes/totalBytes/percent. Memoria usada se calcula como total menos disponible. Disco corresponde al volumen del código de la API. services declara api=available, database=not_configured, trainingWorker=not_configured y gpu=not_measured. Sin caché HTTP.

El cliente valida tipos y rangos, consulta cada 15 segundos mientras está visible, limita cada solicitud a cinco segundos y permite actualización manual. Ante desconexión conserva la última lectura identificada como antigua. No interpreta fallos como cero consumo.

Los demás endpoints propuestos en el documento maestro siguen pendientes. Véase services/api/README.md para ejecución y límites de seguridad local.
