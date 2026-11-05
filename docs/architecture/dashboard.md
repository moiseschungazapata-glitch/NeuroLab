# M01: indicadores y alertas

El dashboard calcula sus indicadores a partir de los proyectos, configuraciones, ejecuciones y versiones del navegador. Ya no muestra el incremento mensual fijo. El total de experimentos incluye la simulación en curso; la proporción completada utiliza únicamente los registros finalizados. Los datos de ejemplo iniciales se incluyen y están identificados en la interfaz.

La actividad muestra completados, cancelados y en curso; los fallidos aparecen cuando existen. El tamaño local es una estimación UTF-16 de claves y valores `nl-*` en localStorage. No representa cuotas de almacenamiento, CPU, GPU ni telemetría de servidor. El estado «Frontend local» describe el entorno existente, sin afirmar que exista una API conectada.

Las alertas se derivan del estado actual: proyecto inexistente, arquitectura inválida, última ejecución cancelada o fallida y último resultado completado sin una versión vinculada. Permiten navegar al módulo correspondiente, crear proyecto, corregir la arquitectura o guardar la versión. La campana muestra la cantidad pendiente y enfoca el panel. Descartarlas persiste en `nl-dismissed-alerts`; pueden restaurarse. Los cambios del estado resuelven automáticamente los avisos aplicables.

Las versiones nuevas guardan `runId` para vincularse a su ejecución. Los registros previos siguen siendo compatibles mediante un campo opcional. Una versión antigua sin vínculo no se atribuye automáticamente a una ejecución por similitud de sus métricas.

El monitor del dashboard refleja el porcentaje real del temporizador de la simulación local. El entrenamiento y las métricas de aprendizaje continúan siendo ilustrativos. No se añadió backend ni se implementaron familias fuera de RNN, CNN y GAN.

La prueba `tests/dashboard.mjs` verifica cambios de indicadores, cancelación, finalización, vínculo de versiones, alertas, descarte/restauración persistente, navegación, temas y vista móvil.

## Ampliación de M01

Filtro Todos/proyecto aplicado a proyectos, ejecuciones, versiones, actividad y alertas de resultados. El contador de arquitecturas sigue indicando explícitamente el proyecto seleccionado; no suma plantillas globales. Los cinco registros más recientes se presentan en orden de registro; el historial completo sigue disponible en Entrenamientos. Estados vacíos ofrecen acciones de creación/configuración.

La proporción completada considera únicamente estados terminales Completado/Cancelado/Fallido. Las alertas guardan el identificador de la ejecución objetivo: guardar una versión desde un filtro conserva ese resultado y no el último resultado global. Las alertas de entrenamientos cambian también el contexto al proyecto correspondiente.

Estado del sistema consulta la nueva API FastAPI. CPU, memoria y disco son reales; los resultados de aprendizaje siguen simulados. Se muestran carga, desconexión, lectura antigua, actualización manual y recuperación automática. Uso >=90% muestra advertencia solo en lecturas disponibles. Base de datos y worker se declaran sin configurar; GPU sin medición.

Pruebas: tests/dashboard.mjs y tests/dashboard-system.mjs (Playwright, Chrome, frontend en 5173 y API en 8000). La segunda verifica contrato HTTP real, fallo y recuperación con respuestas controladas, validación de datos, aislamiento de filtros, guardado del resultado correcto y móvil/oscuro. services/api/tests/test_dashboard.py cubre recursos reales y contrato de salud/caché.

M01 cubre la experiencia y el monitoreo del entorno local. El cierre empresarial completo depende de proyectos y trabajos persistidos con autenticación, API/DB y workers de M02/M06/M10; no se presenta el resumen local como una fuente compartida de servidor.
