# Organización del proyecto

El árbol solicitado se utiliza desde la raíz actual del proyecto; no se añade otra carpeta contenedora con el mismo nombre.

```text
apps/web/
  index.html
  tsconfig.json
  src/
    main.tsx
    app/
      App.tsx
      AccessGate.tsx
      navigation.ts
    components/
      Chart.tsx
      NeuralScene.tsx
      ThemeToggle.tsx
    features/
      dashboard/
      projects/
      fundamentals/
      architectures/
      datasets/
      training/
      evaluation/
      model-registry/
      reports/
      administration/
    lib/
    hooks/
    types/
    styles/
services/api/
  app/
    api/v1/
    core/
    modules/
    schemas/
    repositories/
    main.py
  tests/
workers/training/
infra/
  docker/
  migrations/
  monitoring/
docs/
  architecture/
  api/
  operations/
tests/
README.md
```

El estado permanece en `useLaboratory`, montado en `App`, para que cambiar de pantalla no reinicie una simulación. Cada pantalla recibe un contexto tipado. Los tipos, plantillas y validaciones de arquitectura están separados de la UI. El acceso monta el laboratorio después de verificar la sesión local; al cerrar sesión lo desmonta. La navegación sigue utilizando la selección de secciones existente, sin introducir un router nuevo.

Los estilos mantienen su orden de carga para conservar la apariencia y los temas. Los comandos npm se ejecutan desde la raíz y apuntan al frontend en `apps/web`; las dependencias siguen centralizadas en la raíz para evitar instalaciones duplicadas.

Las familias operativas siguen siendo RNN/CNN/GAN; M04 incluye además Feedforward para diseño y exportación. M01 implementa una API local FastAPI de monitoreo. M06 añade cola FIFO, procesos worker TensorFlow y persistencia SQLite de trabajos; los demás dominios del servidor y PostgreSQL siguen pendientes. Los archivos `.gitkeep` conservan las carpetas vacías al versionarlas.
