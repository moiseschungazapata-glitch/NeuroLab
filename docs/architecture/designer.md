# M04: Diseñador de arquitecturas

El diseñador soporta Feedforward, RNN, CNN y GAN. Feedforward se habilita para diseño y exportación; los módulos de proyectos, datasets, fundamentos y entrenamiento mantienen sus familias operativas anteriores. Tiene panel de entrada/bloques, grafo y propiedades; autoguardado por proyecto y familia; orden de bloques; salida configurable; validación de formas; tabla de operaciones y parámetros; revisiones recuperables y exportación JSON con esquema 4 (importación compatible con 3 y 4). Los controles y la tabla son responsive y admiten los temas existentes.

## Formas y operaciones

- Feedforward: entrada [características], bloques Dense y salida configurable. Se valida que todos los bloques sean Dense.
- RNN: entrada [pasos, características], capas SimpleRNN/LSTM/GRU antes de Dense y salida configurable. Las recurrentes intermedias devuelven secuencias y la última un vector. Una recurrente después de Dense se rechaza.
- CNN: entrada [alto, ancho, canales], Conv2D y MaxPooling2D con stride y padding. Conv2D admite kernel 1, 3, 5 o 7. Se inserta Flatten antes de la primera Dense o de la salida; no se permite volver a operaciones espaciales después de Dense. Con padding same se usa ceil(entrada/stride); con valid, floor((entrada−kernel)/stride)+1.
- GAN: ruido latente, bloques Dense en generador y discriminador y dimensiones de imagen objetivo compartidas para garantizar su compatibilidad. El generador finaliza con Dense(producto de dimensiones) y Reshape; el discriminador recibe Flatten y termina con Dense(1, Sigmoid). La salida del generador admite Tanh o Sigmoid.

Las dimensiones no incluyen el lote. La validación rechaza dimensiones no enteras, resolución espacial no positiva, canales fuera de 1–4, activaciones incompatibles, identificadores repetidos, bloques incompatibles y Softmax con menos de dos salidas. Se admite un máximo de 30 bloques editables; las imágenes tienen lados de hasta 512 y las capas hasta 1.024 unidades/filtros. Al agregar un bloque espacial/recurrente se coloca antes de Dense; el reordenamiento manual puede producir una configuración inválida y muestra su error.

## Parámetros

- Dense: `(entradas+1)*unidades`.
- Conv2D: `(kernel²*canales_entrada+1)*filtros`.
- SimpleRNN: `unidades*(entradas+unidades+1)`.
- LSTM: `4*unidades*(entradas+unidades+1)`.
- GRU: `3*unidades*(entradas+unidades+1)`; se define la variante con `reset_after=false`, un sesgo por transformación. No se presenta como el conteo de cualquier variante GRU.
- Pooling, Flatten y Reshape: cero parámetros.

El total incluye pesos y sesgos de las salidas automáticas y, en GAN, ambas redes por separado. Son cálculos analíticos del diseño definido; no se instancia TensorFlow ni se realiza entrenamiento. La simulación existente continúa siendo ilustrativa y no procesa el dataset, aunque se cambien las dimensiones.

## Persistencia y compatibilidad

`nl-project-architectures-v3` guarda un banco de familias por identificador de proyecto. En la primera migración se copia el banco compartido anterior `nl-architectures-v2` a los proyectos existentes, sin borrar la clave original. Los proyectos nuevos usan plantillas independientes. Los datos opcionales antiguos reciben dimensiones y activaciones de salida por defecto. Los snapshots previos de ejecuciones/modelos no se sobrescriben.

`nl-design-revisions-{proyecto}-{familia}` contiene revisiones con fecha y copia del diseño. Solo se guardan/exportan diseños válidos. Recuperar una revisión reemplaza el borrador después de una confirmación; no cambia la revisión original. Son revisiones de arquitectura, no modelos entrenados.

## Pruebas

`node tests/architecture-math.mjs` (Node con soporte de TypeScript, como Node 24) comprueba conteos y formas con casos pequeños calculados independientemente. `tests/architectures.mjs` verifica entradas/salidas, errores, reordenamiento, exportación, revisiones, aislamiento entre proyectos, persistencia y móvil/oscuro. Las pruebas existentes de flujo principal y dashboard cubren integración con las simulaciones y alertas.


## Herramientas añadidas

- Deshacer/rehacer hasta 50 cambios por visita a proyecto/familia; incluye importación, restauración y restablecimiento de plantilla. Las revisiones son el mecanismo duradero para conservar hitos.
- Importación JSON de hasta 256 KB con validación estructural y semántica, versión de esquema 3/4, límites de bloques/dimensiones/activaciones y selección explícita de la familia destino. Una vista previa requiere confirmación; cancelar o rechazar no altera el diseño. No se ejecuta contenido del archivo.
- Restablecer plantilla requiere confirmación y no modifica revisiones ni ejecuciones.
- Revisiones opcionalmente nombradas, hasta 100 por proyecto/familia, comparación resumida con el borrador y eliminación confirmada. Fallos de almacenamiento se informan; no se afirma que una revisión se guardó cuando falla la escritura. Las fechas usan America/Lima.
- Fallos del autoguardado de arquitectura muestran una advertencia persistente y permiten exportar JSON para respaldar el estado en memoria.
- Código Python exportable con TensorFlow/Keras (API de Keras 3, TensorFlow 2.16+). Construye la arquitectura y muestra model.summary(), incluidas las ramas GAN, activaciones y GRU reset_after=False. No compila la función de pérdida, entrena ni incluye pesos aprendidos. Se verificó sintaxis Python para las cuatro familias; no se ejecutó TensorFlow en este entorno.

## Validación independiente de servidor

POST /api/v1/architectures/validate recibe la arquitectura normalizada, vuelve a comprobar límites, familias, orden, formas y activaciones, y devuelve valid/errors/parameters. La implementación Python calcula parámetros de forma independiente y no carga TensorFlow. El botón Validar en servidor compara el conteo devuelto con el análisis local y muestra desconexiones o discrepancias sin simular éxito. Cambiar el diseño invalida la comprobación anterior; las solicitudes se cancelan al abandonar el diseño y tienen un límite de cinco segundos.

Este servicio local no sustituye autenticación, persistencia compartida ni creación de un artefacto entrenado. Se mantiene en loopback junto con el monitoreo M01.

## Compatibilidad y pruebas nuevas

Feedforward se agrega al normalizar bancos anteriores sin eliminar RNN/CNN/GAN ni sobrescribir sus diseños. El Dashboard cuenta las cuatro familias de diseño y enlaza alertas de Feedforward con su editor. Un proyecto conserva su familia operativa cuando se diseña Feedforward; el botón principal valida ese diseño y no inicia accidentalmente una simulación de otra familia.

- tests/architecture-exchange.mjs: Feedforward, migración, importación limitada, errores y exportación Keras; con NEUROLAB_PYTHON también analiza la sintaxis Python exportada.
- services/api/tests/test_architectures.py: validaciones Python y comparación de conteos con fixtures generados por la prueba anterior para las cuatro familias.
- tests/architectures-tools.mjs: importación/confirmación/cancelación, revisiones nombradas, deshacer/rehacer, plantillas, API real/fallo, alerta Feedforward, persistencia y móvil de 390/320 px.
