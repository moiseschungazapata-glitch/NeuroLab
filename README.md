# NeuroLab Enterprise

Frontend React/TypeScript con proyectos, diseñador Feedforward/RNN/CNN/GAN, datasets y entrenamiento real TensorFlow/Keras en CPU, con simulación educativa separada. FastAPI ofrece monitoreo, validación de arquitecturas y cola de trabajos.

## Inicio

1. Instalar Node.js y Python 3.12 o compatible.
2. Ejecutar `npm ci` y `npm run dev` en la raíz.
3. Para activar CPU/memoria/disco, iniciar la API siguiendo [services/api/README.md](services/api/README.md).
4. Abrir http://127.0.0.1:5173. El Dashboard funciona también sin API y muestra explícitamente su desconexión.

## M01 Dashboard

- Resumen de proyectos, arquitecturas, experimentos y versiones con filtro por proyecto.
- Actividad, progreso activo, cinco registros recientes y acceso al historial completo.
- Alertas persistentes, descarte/restauración y acciones vinculadas al proyecto/resultado correcto.
- Estados vacíos y acciones para crear el primer proyecto o configurar un experimento.
- Monitoreo real de CPU, memoria y disco, advertencias de consumo elevado, estado de conexión y recuperación.
- Temas claro/oscuro y diseño móvil.

Los proyectos y simulaciones se conservan en el navegador; los entrenamientos reales, métricas y modelos se conservan en el servidor local con SQLite y workers separados. PostgreSQL y la identidad multiusuario siguen pendientes. La API de monitoreo solo debe exponerse en loopback durante desarrollo. El cierre empresarial del PDF requiere integrar los servicios y permisos de los otros módulos.

## M02 Proyectos

Gestión local con búsqueda y filtros, contexto, justificación de familia, documentación con borradores recuperables, miembros y roles declarativos, historial y vínculos a los demás módulos. Incluye archivado/reactivación, copia con arquitecturas independientes y exportación JSON por proyecto. Los proyectos archivados no inician simulaciones.

Las cuentas, invitaciones y permisos de servidor siguen pendientes de identidad y persistencia compartida. Véase [la documentación de M02](docs/architecture/projects.md).

## M04 Diseñador

Cuatro familias de diseño, validación de formas y parámetros, importación JSON con confirmación, exportación JSON/código Keras, deshacer/rehacer, plantillas y revisiones nombradas. Validación analítica independiente en Python. Feedforward se habilita en el diseñador; sus datasets están disponibles en M05 y su entrenamiento real está disponible en M06. Véase [M04](docs/architecture/designer.md).

## M05 Datasets

Importación local CSV para Feedforward/RNN y JSON numérico para CNN/GAN; metadatos, calidad, versiones inmutables, particiones reales y normalización ajustada solo con entrenamiento. Feedforward admite regresión y clasificación binaria/multiclase, con grupos y duplicados conservados dentro de cada partición. Incluye búsqueda, filtros, historial de versiones, selección, exportación y papelera protegida. Véase [M05](docs/architecture/datasets.md).

El catálogo y los archivos originales permanecen en IndexedDB. Al iniciar un entrenamiento real, el usuario confirma el envío de una copia preparada a la API local. Almacenamiento de objetos, permisos y cuotas por usuario siguen pendientes.

## M06 Entrenamientos

TensorFlow/Keras real para Feedforward, RNN, CNN y GAN en procesos CPU separados. Cola FIFO, estados persistidos en SQLite, métricas por época mediante SSE y recuperación con REST, cancelación confirmada, reintentos independientes, parada temprana supervisada y modelos .keras descargables con SHA-256. El simulador se conserva bajo su propio encabezado educativo. Véase [M06](docs/architecture/training.md).

Instalar [las dependencias del worker](workers/training/requirements.txt) con el mismo Python de la API o dentro de .training-runtime. El acceso se limita al entorno local: identidad, RBAC, prioridad por rol, PostgreSQL y despliegue empresarial siguen pendientes.

## Verificación

- `npm run build`
- `node tests/project-rules.mjs`
- `node tests/projects.mjs`
- `node tests/projects-actions.mjs`
- `node tests/architecture-math.mjs`
- `node tests/architecture-exchange.mjs`
- `node tests/architectures.mjs`
- `node tests/architectures-tools.mjs`
- `node tests/dataset-math.mjs`
- `node tests/dataset-tabular-math.mjs`
- `node tests/datasets.mjs`
- `node tests/datasets-feedforward.mjs`
- `node tests/dashboard.mjs`
- `node tests/dashboard-system.mjs`
- `node tests/smoke.mjs`
- `python -m unittest discover -s services/api/tests -v`
- `node tests/training-engine.mjs`
- `node tests/training-ui.mjs`
- `node tests/training-early-stopping.mjs`
- `python tests/training-recovery.py`

Las pruebas de navegador requieren Playwright y Chrome, frontend en 5173 y API en 8000. Si Playwright no está instalado en el proyecto, `NEUROLAB_PLAYWRIGHT` admite una URL file:/// absoluta hacia su index.mjs.
