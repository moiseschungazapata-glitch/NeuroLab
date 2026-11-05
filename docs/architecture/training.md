# M06: Entrenamientos reales y simulación educativa

## Flujo implementado

1. Elegir un proyecto activo, una de las cuatro familias y una versión preparada compatible de M05.
2. Configurar épocas, lote, optimizador, semilla, tasa de aprendizaje y parada temprana supervisada.
3. Confirmar calidad, permiso de uso y envío de los conjuntos preparados a la API local. No se envían archivos por navegar o consultar M05.
4. La API vuelve a validar arquitectura, objetivos, clases, formas, dimensiones, índices, valores finitos y ausencia de entradas idénticas compartidas por particiones. Rechaza etiquetas contradictorias para entradas idénticas de clasificación.
5. Crear el trabajo de forma idempotente (el cliente reutiliza la clave si se pierde la respuesta), persistir una copia de configuración/datos y encolarlo. Un proceso separado ejecuta TensorFlow.
6. Consultar métricas reales, progreso, estados y logs mediante SSE, con REST como fuente de verdad para reconexión.
7. Evaluar el conjunto de prueba y descargar los modelos .keras con checksum SHA-256, o cancelar/reintentar según estado.

## Aprendizaje y evidencia

El motor usa TensorFlow/Keras en CPU. Feedforward admite regresión, binaria y multiclase; RNN, regresión temporal; CNN, clasificación binaria o multiclase; GAN, objetivos adversarios con generador/discriminador Dense. Se usan solo capas y activaciones previamente validadas. La construcción contrasta el conteo real de Keras con el cálculo analítico.

Los optimizadores admitidos son Adam, SGD y RMSprop, con clipnorm=1.0. Regresión usa MSE y MAE; binaria, entropía cruzada binaria y accuracy; multiclase, entropía cruzada categórica y accuracy. GAN informa pérdidas de discriminador y generador y sus referencias de validación/prueba; no informa precisión de clasificación como calidad del generador.

Cada época agrega resultados medidos de entrenamiento/validación. La parada temprana supervisada compara val_loss con mejora mínima de 1e-7 y paciencia configurada, restaura los mejores pesos y registra la terminación anticipada. El bucle comprueba cancelación por lote. La evaluación final usa exclusivamente prueba después de seleccionar los pesos. El diseño sigue los [métodos de entrenamiento de Keras](https://keras.io/guides/training_with_built_in_methods/).

En las pruebas se ejecutaron realmente las cuatro familias, se verificó cambio de pesos, métricas finitas, evaluación de prueba y coincidencia SHA-256 de los modelos descargados. También se comprobó una parada temprana en época 2. Las métricas de datos sintéticos no acreditan calidad para un problema real.

## Persistencia, cola y recuperación

SQLite local en .runtime/training conserva trabajos, payloads normalizados y eventos. No sustituye al PostgreSQL empresarial previsto. El coordinador procesa FIFO, uno por vez, con cuatro pendientes y un bloqueo que impide dos coordinadores sobre el mismo almacén. Los reintentos crean un identificador nuevo con retryOf y copia del payload previo; no mutan el trabajo original.

Cerrar o recargar el navegador no cancela el proceso. El proyecto y trabajo seleccionados se conservan localmente. La interfaz recupera el estado con REST y se suscribe a SSE desde eventId, con heartbeat, límite de espera de eventos y reconexión. Mientras la API no responde se identifica el último estado como anterior; no se inventa progreso.

Detener/reiniciar la API interrumpe de forma controlada el worker y conserva un estado FAILED recuperable. Al arrancar se comprueban procesos huérfanos por PID, comando, UUID y directorio antes de detenerlos. Un reintento vuelve a entrenar desde el inicio. Los trabajos en cola permanecen persistidos. No se implementó continuación automática desde un checkpoint intermedio.

La máquina de estados está validada en store.py. Las transacciones impiden escribir una transición inválida o modificar un trabajo terminal. Una cancelación confirmada prevalece sobre una finalización simultánea y no publica artefactos.

## Integración

M06 muestra primero el flujo real y conserva el simulador educativo en un bloque claramente identificado. Las ejecuciones reales no se insertan en las tablas de métricas demo de M07/M08. El Dashboard presenta un resumen separado de TensorFlow con datos del servidor. La ficha de proyecto muestra sus trabajos reales, además del historial simulado. M05 bloquea versiones referenciadas y conserva una lista local de referencias reales para no perder la protección al desconectarse. Archivar un proyecto con trabajo activo se bloquea en la interfaz.

Los modelos reales se descargan desde M06. Integrar selección de ejecuciones reales en Evaluación, un registro empresarial de modelos y reportes completos corresponde a M07/M08/M09.

## Datos, seguridad y límites

La API no acepta código Python ni archivos de modelos subidos. Solo configura la lista cerrada de capas. Los payloads están limitados a 24 MiB, 10000 muestras y un millón de valores de entrada; modelos a dos millones de parámetros. Se supervisan 300 s y 2 GiB por proceso. Ver workers/training/README.md para límites de historial y semántica del supervisor.

Para comenzar, el navegador obtiene una capacidad aleatoria de la API local, conservada solo en memoria. Todas las operaciones de trabajos, eventos y descargas requieren Bearer. Se rechazan hosts/orígenes ajenos a localhost/127.0.0.1 en los puertos 5173/4173/8000 y peticiones marcadas cross-site. Las respuestas de entrenamiento no se cachean. Es una protección del entorno local, no una identidad de usuario ni RBAC. No publicar esta API en una interfaz pública sin M10.

La API recibe snapshots de los proyectos locales y no puede verificar propiedad o cambios posteriores de estado desde una base empresarial. La comprobación de proyecto archivado se aplica al envío y a la interfaz, sin afirmar autorización segura de servidor. La prioridad por rol, cuotas por usuario, PostgreSQL, cola distribuida, aislamiento mediante contenedores, HTTPS, retención y backups siguen pendientes de integración empresarial.

Se registra versión de TensorFlow/Python, hash del código del worker, arquitectura, parámetros, semilla, dataset y versión, fechas y métricas. El checksum del archivo fuente es procedencia declarada por el cliente; el servidor calcula otro SHA-256 sobre los conjuntos preparados efectivamente recibidos. Los errores públicos son controlados y los detalles técnicos permanecen en archivos locales sin publicarse por HTTP.

## Pruebas

- python -m unittest discover -s services/api/tests -v: validación de entradas, estados, cola, idempotencia, journal y reapertura del almacenamiento.
- node tests/training-engine.mjs: cuatro entrenamientos reales, pesos, métricas, evaluación, modelos, SSE, origen/autorización, cancelación y reintentos.
- node tests/training-ui.mjs: crear proyecto/dataset, preparar, confirmar envío, entrenar, recargar, recuperar y descargar; integración Dashboard y móvil/oscuro.
- node tests/training-early-stopping.mjs: parada temprana real y evaluación con los mejores pesos.
- python tests/training-recovery.py: interrupción de un worker propio en almacén temporal, reinicio del coordinador y payload recuperable.

Las pruebas de integración usan datos sintéticos y deben ejecutarse con TensorFlow instalado y la API local activa. Las pruebas de navegador admiten NEUROLAB_PLAYWRIGHT con URL file:/// al módulo instalado.
