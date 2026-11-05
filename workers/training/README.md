# Worker TensorFlow CPU - M06

Un proceso Python separado por trabajo construye exclusivamente la arquitectura validada, carga los conjuntos preparados, ajusta pesos, evalúa y guarda archivos .keras. No ejecuta notebooks ni código aportado por usuarios.

Instalar con el mismo Python usado por la API:

```powershell
python -m pip install -r workers/training/requirements.txt
```

Alternativa aislada dentro del proyecto:

```powershell
python -m pip install --target .training-runtime -r workers/training/requirements.txt
```

La API detecta .training-runtime automáticamente o TensorFlow en su entorno. NEUROLAB_TF_PATH permite indicar otra carpeta de paquetes. En esta revisión se instaló TensorFlow 2.21.0 en .training-runtime y se ejecutaron las cuatro familias en CPU. Ver la [guía oficial de instalación](https://www.tensorflow.org/install/pip).

El coordinador de la API inicia el worker con la ventana oculta en Windows y CUDA deshabilitado. No ejecutar varios coordinadores sobre la misma carpeta: un bloqueo de archivo impide consumir la misma cola desde dos API.

Los datos y estados se conservan por defecto en .runtime/training; NEUROLAB_TRAINING_DIR permite usar otra carpeta administrada por el operador. SQLite guarda configuración, copias de los conjuntos preparados, eventos y estado; una carpeta UUID por trabajo contiene modelos .keras y registros técnicos. No exponer esa carpeta mediante un servidor de archivos.

Límites locales fijos: un proceso, cuatro pendientes, dos millones de parámetros, un millón de valores de entrada, 10000 muestras totales, envío máximo de 24 MiB, 300 segundos y 2 GiB RSS. TensorFlow usa hasta dos hilos de cálculo. El límite de memoria se supervisa periódicamente; no es un contenedor con cuota de hardware. El historial acepta 50 trabajos o 256 MiB de payloads; los eventos y artefactos ocupan espacio adicional. La retención y las cuotas por usuario pertenecen a M10.

Feedforward/RNN/CNN usan pérdidas supervisadas y métricas acordes al objetivo. GAN actualiza generador y discriminador con dos optimizadores; sus pérdidas no garantizan calidad visual. La parada temprana supervisada usa pérdida de validación y restaura los mejores pesos; no se habilita automáticamente para GAN. La evaluación de prueba ocurre después del entrenamiento, sin usar prueba para decidir las épocas.

La cancelación se comprueba entre lotes y antes de guardar; el coordinador termina el proceso si no confirma en cinco segundos. Un reinicio/interrupción del servicio marca trabajos interrumpidos como FAILED, conservando sus datos para reintentar desde el inicio. No hay reanudación automática desde la última época ni checkpoints de recuperación por lote.

La máquina de estados es QUEUED -> PREPARING -> RUNNING -> COMPLETED/FAILED/CANCELLED. Cada actualización se persiste con su evento dentro de una transacción. Una cancelación en cola puede pasar directamente a CANCELLED.
