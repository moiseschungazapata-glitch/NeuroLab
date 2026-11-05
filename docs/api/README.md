# Contratos locales M01, M04 y M06

`GET /api/v1/health`: disponibilidad del proceso de monitoreo; no acredita salud de toda la plataforma.

`GET /api/v1/dashboard/system`: sampledAt (UTC ISO), uptimeSeconds del proceso, cpuPercent (muestra de 100 ms), memory y disk con usedBytes/totalBytes/percent. Memoria usada se calcula como total menos disponible. Disco corresponde al volumen del código de la API. services declara api=available, database=not_configured, trainingWorker=not_configured y gpu=not_measured. Sin caché HTTP.

El cliente valida tipos y rangos, consulta cada 15 segundos mientras está visible, limita cada solicitud a cinco segundos y permite actualización manual. Ante desconexión conserva la última lectura identificada como antigua. No interpreta fallos como cero consumo.

Los demás endpoints propuestos en el documento maestro siguen pendientes. Véase services/api/README.md para ejecución y límites de seguridad local.

## M04

POST /api/v1/architectures/validate recibe un objeto de arquitectura normalizada con familia, input, layers, outputUnits/outputActivation y latent cuando aplica. Admite Feedforward/RNN/CNN/GAN. Responde {valid, errors, parameters}; cuando es válido incluye engine=analytic y gruResetAfter=false. Una configuración inválida devuelve valid=false y errores, sin ejecutar modelos. Tipos HTTP inválidos se rechazan con 422. Cache-Control: no-store. Sin acceso a archivos o ejecución de código aportado por el cliente.

El servicio se limita al desarrollo local. El paso a producción requiere identidad, autorización y límites de recursos de la plataforma.

## M06

- GET /api/v1/training/session: capacidad local en memoria, estado de instalación y límites. No cachear ni registrar el token.
- GET /api/v1/training-jobs: historial local persistido (hasta 50 trabajos).
- POST /api/v1/projects/{id}/training-jobs: configuración, arquitectura normalizada, metadatos de dataset y splits preparados; requiere consentimiento y cabecera Idempotency-Key UUID. Devuelve 202 con trabajo QUEUED o el trabajo previamente creado con esa clave.
- GET /api/v1/training-jobs/{id}: snapshot público con eventId y métricas; excluye las filas del payload.
- POST /api/v1/training-jobs/{id}/cancel: solicita cancelación; el worker confirma CANCELLED. En cola puede confirmarse inmediatamente. Terminales: 409.
- POST /api/v1/training-jobs/{id}/retry: solo FAILED/CANCELLED; UUID nuevo y retryOf, con payload previo intacto. Requiere Idempotency-Key.
- GET /api/v1/training-jobs/{id}/events: SSE con id, event=job y snapshot JSON; Last-Event-ID permite retomar. Heartbeat cada 10 s; REST recupera estado ante desconexión.
- GET /api/v1/training-jobs/{id}/artifacts/{name}: descarga autorizada solo de model.keras o generator/discriminator.keras generados por un trabajo COMPLETED.

Todas las operaciones excepto bootstrap requieren Authorization: Bearer con la capacidad de sesión local. La API comprueba host/origen loopback; no hay CORS permisivo. Respuestas no-store. Cuerpo máximo 24 MiB (413), validaciones 422, identidad local ausente 401, origen/host 403, no encontrado 404, conflicto de estado 409, cola/historial llenos 429 y motor no disponible 503.

El contrato de envío usa project={id,name,status}, architecture={family,input,layers,outputUnits,outputActivation,latent}, config={epochs,batch,optimizer,modelSeed,learningRate,earlyStopping,patience}, dataset={id,name,version,checksum,classes,task}, splits={train,validation,test} y consent=true. Cada muestra contiene sourceIndex, input y target (tabular/temporal) o label (CNN). GAN usa píxeles escalados según su activación. El servidor valida y vuelve a calcular un checksum del contenido preparado.

Esta capacidad protege el entorno local; no implementa identidad multiusuario, pertenencia a proyectos ni permisos RBAC. Los snapshots de proyectos proceden del navegador. Ver los límites empresariales en docs/architecture/training.md.
