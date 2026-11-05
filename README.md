# NeuroLab Enterprise

Frontend React/TypeScript con proyectos, diseñador RNN/CNN/GAN, datasets y recorrido de entrenamiento simulado. M01 añade monitoreo real del equipo mediante FastAPI.

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

Los resúmenes de negocio siguen siendo locales. El entrenamiento, las métricas de aprendizaje y los modelos son simulados; PostgreSQL y workers no están implementados. La API de monitoreo solo debe exponerse en loopback durante desarrollo. El cierre empresarial del PDF requiere integrar los servicios y permisos de los otros módulos.

## M02 Proyectos

Gestión local con búsqueda y filtros, contexto, justificación de familia, documentación con borradores recuperables, miembros y roles declarativos, historial y vínculos a los demás módulos. Incluye archivado/reactivación, copia con arquitecturas independientes y exportación JSON por proyecto. Los proyectos archivados no inician simulaciones.

Las cuentas, invitaciones y permisos de servidor siguen pendientes de identidad y persistencia compartida. Véase [la documentación de M02](docs/architecture/projects.md).

## Verificación

- `npm run build`
- `node tests/project-rules.mjs`
- `node tests/projects.mjs`
- `node tests/projects-actions.mjs`
- `node tests/architecture-math.mjs`
- `node tests/dataset-math.mjs`
- `node tests/dashboard.mjs`
- `node tests/dashboard-system.mjs`
- `node tests/smoke.mjs`
- `python -m unittest discover -s services/api/tests -v`

Las pruebas de navegador requieren Playwright y Chrome, frontend en 5173 y API en 8000. Si Playwright no está instalado en el proyecto, `NEUROLAB_PLAYWRIGHT` admite una URL file:/// absoluta hacia su index.mjs.
