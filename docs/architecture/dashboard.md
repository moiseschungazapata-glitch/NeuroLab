# M01: indicadores y alertas

El dashboard calcula sus indicadores a partir de los proyectos, configuraciones, ejecuciones y versiones del navegador. Ya no muestra el incremento mensual fijo. El total de experimentos incluye la simulación en curso; la proporción completada utiliza únicamente los registros finalizados. Los datos de ejemplo iniciales se incluyen y están identificados en la interfaz.

La actividad muestra completados, cancelados y en curso; los fallidos aparecen cuando existen. El tamaño local es una estimación UTF-16 de claves y valores `nl-*` en localStorage. No representa cuotas de almacenamiento, CPU, GPU ni telemetría de servidor. El estado «Frontend local» describe el entorno existente, sin afirmar que exista una API conectada.

Las alertas se derivan del estado actual: proyecto inexistente, arquitectura inválida, última ejecución cancelada o fallida y último resultado completado sin una versión vinculada. Permiten navegar al módulo correspondiente, crear proyecto, corregir la arquitectura o guardar la versión. La campana muestra la cantidad pendiente y enfoca el panel. Descartarlas persiste en `nl-dismissed-alerts`; pueden restaurarse. Los cambios del estado resuelven automáticamente los avisos aplicables.

Las versiones nuevas guardan `runId` para vincularse a su ejecución. Los registros previos siguen siendo compatibles mediante un campo opcional. Una versión antigua sin vínculo no se atribuye automáticamente a una ejecución por similitud de sus métricas.

El monitor del dashboard refleja el porcentaje real del temporizador de la simulación local. El entrenamiento y las métricas de aprendizaje continúan siendo ilustrativos. No se añadió backend ni se implementaron familias fuera de RNN, CNN y GAN.

La prueba `tests/dashboard.mjs` verifica cambios de indicadores, cancelación, finalización, vínculo de versiones, alertas, descarte/restauración persistente, navegación, temas y vista móvil.
