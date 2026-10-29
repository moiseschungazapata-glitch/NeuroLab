# M04: Diseñador de arquitecturas

El diseñador soporta exclusivamente RNN, CNN y GAN. Tiene panel de entrada/bloques, grafo y propiedades; autoguardado por proyecto y familia; orden de bloques; salida configurable; validación de formas; tabla de operaciones y parámetros; revisiones recuperables y exportación JSON con esquema 3. Los controles y la tabla son responsive y admiten los temas existentes.

## Formas y operaciones

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

