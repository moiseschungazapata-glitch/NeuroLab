# Dataset de demostración CNN

`dataset_clasificacion_patrones_2x2.json` contiene 40 imágenes sintéticas de forma `2 × 2 × 1` y dos clases equilibradas.

- `clase-A`: diagonal principal iluminada.
- `clase-B`: diagonal secundaria iluminada.
- Cada muestra tiene un grupo independiente para permitir la separación en entrenamiento, validación y prueba.
- Los valores de píxel están en el intervalo 0–255.

Configuración recomendada en NeuroLab:

- Familia: CNN.
- Separación: 70 % entrenamiento, 15 % validación y 15 % prueba.
- Semilla: 42.
- Normalización: Píxeles / 255 → 0 a 1.
- Salida de la arquitectura: 2 unidades, Softmax.
