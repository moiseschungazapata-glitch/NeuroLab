# Despliegue funcional de NeuroLab

NeuroLab se despliega como dos servicios conectados:

- **Vercel** publica la interfaz React/Vite.
- **Railway** mantiene FastAPI, TensorFlow, la cola de entrenamiento, SQLite y los artefactos `.keras` y PDF.

Esta separación es necesaria porque un entrenamiento y su canal de eventos son procesos de larga duración y el historial necesita almacenamiento persistente. El frontend queda estático y rápido en Vercel; el backend se ejecuta como un servicio permanente con un volumen montado en `/data`.

## Archivos de despliegue incluidos

- `vercel.json`: instalación, compilación y salida del frontend.
- `Dockerfile`: imagen Python 3.12 con FastAPI y TensorFlow CPU.
- `.dockerignore`: evita enviar archivos innecesarios al construir el backend.
- `.railway/railway.ts`: infraestructura del servicio, healthcheck, una réplica y volumen persistente de 2 GiB.
- `.env.example`: nombres y ejemplos de las variables necesarias.

## 1. Publicar los cambios en GitHub

Vercel y Railway construyen desde la rama `main` del repositorio `moiseschungazapata-glitch/NeuroLab`. Antes de importar, confirmar que todos estos archivos estén en GitHub.

## 2. Crear el backend en Railway

### Opción visual

1. Crear un proyecto en Railway y elegir **Deploy from GitHub repo**.
2. Seleccionar `moiseschungazapata-glitch/NeuroLab` y la rama `main`.
3. Mantener el directorio raíz en `/`. Railway detectará el `Dockerfile`.
4. En **Variables**, agregar:

   ```text
   NEUROLAB_TRAINING_DIR=/data/training
   NEUROLAB_ALLOWED_ORIGINS=https://neurolab.vercel.app
   TF_CPP_MIN_LOG_LEVEL=2
   CUDA_VISIBLE_DEVICES=-1
   OMP_NUM_THREADS=2
   PYTHONUNBUFFERED=1
   ```

5. En el servicio, elegir **Add Volume** y montarlo exactamente en `/data`. Usar al menos 2 GiB.
6. Mantener **una sola réplica**. SQLite y la cola actual no deben ejecutarse en varias réplicas.
7. Configurar el healthcheck como `/api/v1/health` y un tiempo de espera de 300 segundos. La primera carga de TensorFlow puede tardar.
8. En **Networking**, generar un dominio público HTTPS.
9. Abrir `https://DOMINIO-DE-RAILWAY/api/v1/health`. Debe responder:

   ```json
   {"status":"ok","service":"dashboard-monitoring"}
   ```

Railway entrega `RAILWAY_PUBLIC_DOMAIN` automáticamente y NeuroLab lo acepta como host del backend. No hay que copiar ese dominio a `NEUROLAB_ALLOWED_HOSTS`.

### Opción reproducible con Railway CLI

El archivo `.railway/railway.ts` declara el servicio y el volumen. Con Railway CLI actualizado:

```powershell
railway login
railway config plan
railway config apply
```

Después de aplicar, todavía se debe generar el dominio público y definir `NEUROLAB_ALLOWED_ORIGINS`, porque el dominio final de Vercel pertenece a la cuenta del usuario.

## 3. Crear el frontend en Vercel

1. En Vercel, importar el mismo repositorio.
2. No usar el preset **Services** que intenta alojar los tres procesos. Elegir un proyecto Vite único.
3. Usar **Root Directory** `./`.
4. El `vercel.json` completa estos valores:
   - Framework: Vite
   - Install command: `npm ci`
   - Build command: `npm run build`
   - Output directory: `dist`
5. En **Environment Variables**, crear:

   ```text
   VITE_API_URL=https://DOMINIO-DE-RAILWAY
   ```

   Guardarla para **Production**. No añadir una barra `/` al final. Para habilitar una vista Preview también hay que añadir su dominio exacto a `NEUROLAB_ALLOWED_ORIGINS`; el desarrollo local continúa usando el proxy de Vite sin esta variable.
6. Desplegar. La URL de producción esperada, si el nombre está disponible, será `https://neurolab.vercel.app`.

Si Vercel asigna otro dominio, reemplazar `NEUROLAB_ALLOWED_ORIGINS` en Railway por el dominio real, sin barra final, y volver a desplegar el backend. Se pueden admitir varios dominios separándolos con comas.

## 4. Validación final

Con ambas URL públicas:

1. Abrir NeuroLab en Vercel y confirmar que el Dashboard indique que la API está disponible.
2. En M04, usar **Validar en servidor**.
3. En M06, confirmar que el motor indique TensorFlow disponible e iniciar un entrenamiento pequeño.
4. Recargar la página durante el entrenamiento: el trabajo debe reaparecer y reconectar sus eventos.
5. Descargar un artefacto `.keras`.
6. En M07 guardar una evaluación, en M08 registrar el modelo y en M09 descargar el PDF.
7. Reiniciar el servicio Railway y confirmar que trabajos, evaluaciones y modelos continúen disponibles. Esto verifica que `/data` está montado correctamente.

## Límites actuales

Este despliegue deja funcional el prototipo completo para un entorno controlado, pero no convierte todavía la sesión demostrativa en identidad empresarial. El endpoint de sesión entrega una capacidad temporal a los navegadores con origen autorizado. Antes de abrir el sitio a usuarios no confiables se requieren autenticación real, RBAC, límites de tasa y migrar SQLite/artefactos a servicios multiusuario. Hasta entonces, mantener protegido el proyecto de Vercel o compartirlo solo con evaluadores autorizados.

