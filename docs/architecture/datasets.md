# M05 y preparación responsable

El módulo registra archivos por proyecto en IndexedDB. El contenido no se envía a un servidor. Los metadatos incluyen familia Feedforward/RNN/CNN/GAN, nombre, descripción, fecha, versión, archivo y tamaño original cuando están disponibles, procedencia/licencia, declaración de permiso de uso, acceso declarado y huella SHA-256 del archivo original. La huella identifica el contenido, no acredita su autenticidad ni su licencia. El acceso propietario/proyecto es metadato de la demo, sin autorización real de servidor.

## Formatos admitidos y límites

- CSV UTF-8 con encabezados únicos, delimitador coma o punto y coma, comillas escapadas y filas de igual longitud. Máximo 50 columnas y 10.000 filas. RNN usa una única serie temporal con entradas y un objetivo numéricos (rango −10¹² a 10¹²). La columna temporal puede ser numérica o ISO con hora; debe ser única. Sin columna temporal, el usuario confirma el orden de las filas. No se combinan múltiples series en un mismo archivo.
- CSV Feedforward: tabla con entradas numéricas y una columna objetivo. Admite regresión (objetivo numérico, salida Lineal), clasificación binaria (dos etiquetas, salida Sigmoid) y multiclase (Softmax con una salida por clase). La entrada del diseñador debe tener tantas características como columnas seleccionadas. Una columna opcional de grupo reúne sujetos u objetos relacionados; no se usa como entrada ni objetivo.
- JSON de imágenes: `{ "shape": [alto, ancho, canales], "samples": [{ "pixels": [0, 255, ...], "label": "clase", "group": "sujeto" }] }`. Lados de 1 a 64, canales de 1 a 4, píxeles finitos de 0 a 255, hasta 10.000 muestras y un millón de valores. Cada array de píxeles debe tener la longitud del producto de shape. CNN requiere label; GAN no. group permite mantener juntos sujetos u objetos relacionados.
- Hasta 2 MB por archivo y 20 versiones locales, incluidas las de papelera. No se admiten carpetas de imágenes, JPG/PNG directos, ZIP, notebooks ni archivos ejecutables. El módulo incluye descargas de CSV Feedforward, CSV temporal y JSON de imágenes sintéticos con el formato correcto. Las validaciones locales no sustituyen controles de seguridad de un servidor.

## Preparación y separación

Importar crea una versión original; preparar crea otra versión con copia de los datos, configuración, particiones, conteos y estadísticas. No se sobrescriben versiones anteriores. Se puede cargar un archivo nuevo en el mismo linaje o crear otra preparación sin volver a subirlo.

En RNN se ordenan las filas por tiempo cuando se proporciona esa columna. Se separan entrenamiento/validación/prueba y luego se generan ventanas dentro de cada partición. El objetivo es el valor de su columna en el paso posterior a la ventana; no se incluye en las entradas y conserva su escala original. El archivo debe corresponder a una sola serie. Cada partición necesita más filas que pasos temporales. Se limita la preparación a un millón de valores de entrada en ventanas para evitar exportaciones excesivas.

La estandarización y min–max se ajustan únicamente con las filas de entrenamiento y se reutilizan para validación/prueba. Una característica constante se transforma a cero cuando corresponde. Las ventanas nunca atraviesan particiones. Valores fuera del rango 0–1 en validación/prueba pueden ser correctos con min–max ajustado en entrenamiento.

En imágenes se agrupan los duplicados exactos y los valores group declarados antes de repartir con barajado determinista y semilla. Una unión de grupos conserva también duplicados que conectan grupos diferentes. CNN rechaza píxeles idénticos con etiquetas contradictorias, exige todas las clases en entrenamiento y advierte de clases ausentes en validación/prueba y desbalance mayor de 3:1. No se promete estratificación. Los porcentajes se aplican a grupos; los porcentajes efectivos de muestras pueden variar.

La escala de imágenes es fija: /255 para 0–1, o /127,5−1 para −1–1. GAN requiere correspondencia entre esa escala y la activación de salida Sigmoid/Tanh. No hay aumentos de imagen implementados. La agrupación y revisión humana siguen siendo necesarias para detectar ejemplos relacionados o duplicados semánticos.

## Selección, exportación y borrado

Solo una versión preparada y compatible puede seleccionarse para cada proyecto/familia. Cambios de forma, salida, ventana o escala incompatibles bloquean su uso y requieren preparar una versión nueva. La exportación JSON materializa las ventanas o los píxeles transformados de los tres conjuntos, junto con su configuración y estadísticas.

La papelera es reversible. El borrado definitivo requiere escribir ELIMINAR. No se permite borrar versiones seleccionadas o vinculadas a ejecuciones/modelos. Las ejecuciones guardan identificador, versión, checksum, configuración de preparación y parámetros del experimento; no copian los píxeles o filas originales a localStorage.

## Entrenamiento: alcance de las comprobaciones

La selección se conserva en `nl-dataset-selection`; los datos originales y preparados viven en la base IndexedDB `neurolab-datasets`. Antes de usar una versión importada, se valida compatibilidad y se solicita revisar calidad, procedencia y advertencias. Se registran épocas, lote, optimizador, semilla del modelo, tasa de aprendizaje y parada temprana prevista/paciencia.

La preparación/exportación de datos es real. M06 incorpora entrenamiento real TensorFlow, pesos, métricas y parada temprana supervisada; el simulador educativo anterior permanece separado. M06 usa CPU, no mide GPU ni reanuda desde checkpoints intermedios. Las fichas MNIST y Secuencias demo permanecen como referencias sin archivo para conservar el recorrido anterior.

## Verificación

`tests/dataset-math.mjs` comprueba parsing, límites, separación temporal, ajuste de estadísticas exclusivamente con entrenamiento, ventanas, agrupación de duplicados/sujetos, etiquetas contradictorias, compatibilidad de formas, escalas GAN y exportación transformada. `tests/datasets.mjs` prueba importación, preparación real, persistencia IndexedDB, selección y revisión, captura de parámetros, papelera/restauración/borrado protegido, ajuste de entrada/salida CNN y vista móvil/oscura. El flujo anterior se verifica con `tests/smoke.mjs`.

## Ampliación Feedforward

Las particiones se crean mediante barajado determinista con semilla después de unir entradas numéricas idénticas y grupos declarados. Una unión transitiva evita separar ejemplos conectados por un duplicado o grupo. Las etiquetas contradictorias para entradas idénticas se rechazan en clasificación; la regresión puede contener observaciones repetidas con distinto objetivo, que permanecen juntas. Se requieren tres grupos independientes. No se garantiza estratificación; se exige que entrenamiento contenga todas las clases y se advierte si faltan clases en validación/prueba o existe desbalance mayor a 3:1.

La normalización estándar/min–max se ajusta solo con las filas de entrenamiento y se reutiliza en los otros conjuntos. No se normalizan los objetivos de regresión. La exportación materializa vectores de entrada por fila; clasificación binaria exporta índices 0/1 y multiclase vectores one-hot. La lista ordenada de clases se guarda y se presenta en la interfaz para interpretar esa codificación. Las características deben ser numéricas; no hay imputación automática ni codificación de entradas categóricas.

Feedforward se puede seleccionar por proyecto y conservar entre sesiones en la clave existente de selecciones. La selección no inicia un entrenamiento ni cambia la familia operativa de los módulos anteriores. El entrenamiento Feedforward real está disponible en M06 con confirmación del envío de datos preparados.

## Catálogo, trazabilidad y almacenamiento

El catálogo combina familia, preparación (original/preparada) y búsqueda sin tildes/mayúsculas por nombre, descripción, archivo o procedencia. Cada ficha incluye archivo, tamaño registrado, fecha America/Lima y linaje. El detalle permite inspeccionar otras versiones del mismo dataset. Cada versión nueva registra parentId, cuando aplica; los registros anteriores siguen siendo compatibles sin ese campo. La huella SHA-256 corresponde al archivo original, no a un artefacto preparado ni a una prueba de licencia.

IndexedDB asigna el siguiente número de versión dentro de una transacción de lectura/escritura. Dos escrituras concurrentes no reciben el mismo número; el límite global de 20 versiones, incluida la papelera, se vuelve a comprobar en la transacción. No se actualizan datos o metadatos de versiones existentes: se crea otra versión. Solo el estado de papelera/restauración puede cambiar sobre una versión guardada.

La capa de almacenamiento vuelve a comprobar las referencias locales a selecciones, ejecuciones y modelos antes de enviar a papelera o purgar. La purga exige que la versión ya esté en papelera. La interfaz protege además el dataset de la simulación activa. Estas son garantías de integridad locales; no representan autorización segura multiusuario ni una transacción distribuida entre pestañas y servicios. Para ver cambios externos al catálogo se usa Actualizar catálogo.

El parser CSV detecta delimitadores fuera de comillas, admite BOM UTF-8 y conserva filas explícitas con campos vacíos para que las validaciones no oculten datos faltantes. Se rechaza texto que no sea UTF-8 válido. Los diálogos de registro y purga permiten Escape, mantienen el foco y lo devuelven al control de apertura.

## Verificación adicional

- tests/dataset-tabular-math.mjs: regresión/binaria/multiclase, codificación de objetivos, separación de grupos y duplicados, ausencia de fuga en las estadísticas, compatibilidad y errores CSV/UTF-8.
- tests/datasets-feedforward.mjs: recorrido real Feedforward, persistencia IndexedDB, exportación, selección, historial de versiones, búsqueda, foco/Escape, inmutabilidad, números de versión concurrentes, protecciones de referencia, capacidad y móvil/oscuro de 390/320 px.

Sigue pendiente el almacenamiento de objetos en servidor, validación de archivos en backend, cuotas por usuario y permisos RBAC. No se transfieren datasets al consultar M05 o usar monitoreo/arquitecturas. Iniciar M06 permite enviar explícitamente una copia de los conjuntos preparados al servidor local; los archivos originales permanecen en el navegador y los formatos continúan limitados a CSV tabular/temporal y JSON numérico de imágenes.
