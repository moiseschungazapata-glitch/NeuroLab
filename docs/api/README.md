# Contratos locales M01 y M04

`GET /api/v1/health`: disponibilidad del proceso de monitoreo; no acredita salud de toda la plataforma.

`GET /api/v1/dashboard/system`: sampledAt (UTC ISO), uptimeSeconds del proceso, cpuPercent (muestra de 100 ms), memory y disk con usedBytes/totalBytes/percent. Memoria usada se calcula como total menos disponible. Disco corresponde al volumen del código de la API. services declara api=available, database=not_configured, trainingWorker=not_configured y gpu=not_measured. Sin caché HTTP.

El cliente valida tipos y rangos, consulta cada 15 segundos mientras está visible, limita cada solicitud a cinco segundos y permite actualización manual. Ante desconexión conserva la última lectura identificada como antigua. No interpreta fallos como cero consumo.

Los demás endpoints propuestos en el documento maestro siguen pendientes. Véase services/api/README.md para ejecución y límites de seguridad local.

## M04

POST /api/v1/architectures/validate recibe un objeto de arquitectura normalizada con familia, input, layers, outputUnits/outputActivation y latent cuando aplica. Admite Feedforward/RNN/CNN/GAN. Responde {valid, errors, parameters}; cuando es válido incluye engine=analytic y gruResetAfter=false. Una configuración inválida devuelve valid=false y errores, sin ejecutar modelos. Tipos HTTP inválidos se rechazan con 422. Cache-Control: no-store. Sin acceso a archivos o ejecución de código aportado por el cliente.

El servicio se limita al desarrollo local. El paso a producción requiere identidad, autorización y límites de recursos de la plataforma.
