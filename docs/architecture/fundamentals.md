# M03: Fundamentos neuronales

El módulo mantiene las fichas sobre neuronas, capas, conexiones, pesos, sesgos y activaciones, y el catálogo RNN/CNN/GAN. Incorpora 27 términos con definición y ejemplo, búsqueda sin distinción de tildes y filtro por categoría.

El laboratorio escalar de neurona calcula `z = x*w+b` y su salida con ReLU, Sigmoid o Tanh. Los controles son manuales; no hay entrenamiento. La curva utiliza un dominio de −6 a 6, que cubre todas las combinaciones permitidas por los controles de entrada, peso y sesgo.

Los ejemplos guiados tienen cuatro pasos y una comprobación final con retroalimentación:

- RNN: secuencia [1, 0, −1], peso de entrada 0,8, estado inicial cero y sesgo cero. El peso recurrente varía de 0 a 1. Se calculan los estados con Tanh sin ajustar pesos.
- CNN: entrada 4×4, kernel [1,0;0,−1], stride 1, sin padding ni activación. Inspeccionar una posición de la salida 3×3 muestra los cuatro productos y su suma. La operación es correlación cruzada, utilizada habitualmente en las capas de convolución.
- GAN: esquema de las fases de preparación y actualización alternada del discriminador y generador. No genera imágenes ni ejecuta redes.

Una respuesta correcta guarda la familia completada en `nl-learning-completed`. Reiniciar permite repetir el recorrido, sin borrar el logro. La persistencia de aprendizaje es local y no está asociada a un servicio remoto. No se incluyen otras familias.

`tests/fundamentals.mjs` comprueba cálculos, navegación por teclado, búsquedas, categorías, recorrido y respuestas de las tres familias, persistencia, modo oscuro y diseño móvil.
