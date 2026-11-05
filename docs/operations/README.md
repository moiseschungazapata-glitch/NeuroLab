# Operación del frontend

Ejecutar `npm install` y `npm run dev` desde la raíz. Vite sirve `apps/web/index.html`. Para comprobar los tipos, usar `npm run typecheck`; para generar la entrega estática en `dist/`, usar `npm run build`. `npm run preview` sirve esa compilación.

Conservar el mismo origen (protocolo, dirección y puerto) permite seguir usando los datos locales anteriores. Las claves `nl-projects`, `nl-architectures-v2`, `nl-runs-v2`, `nl-versions-v2`, `nl-notes`, `nl-theme`, `nl-sidebar-collapsed` y `nl-session` no cambian con la reorganización. No es necesario limpiar el almacenamiento del navegador.

El acceso de identidad sigue siendo local y de demostración. Las simulaciones educativas se reinician al recargar o cerrar sesión. Los entrenamientos reales de M06 continúan en el servidor aunque se cierre el navegador; su historial se recupera desde SQLite y la interfaz reconecta por SSE/REST.

Docker y las migraciones PostgreSQL siguen pendientes. M06 implementa workers locales TensorFlow y SQLite; ver workers/training/README.md. M01 incorpora una API local de monitoreo; véase services/api/README.md para iniciarla en 127.0.0.1:8000. La aplicación funciona sin ella y muestra su desconexión explícitamente.

Para detener la API con conexiones SSE activas, usar --timeout-graceful-shutdown 5 al iniciar Uvicorn. Antes de cualquier respaldo o traslado del historial, detener la API y verificar que no haya trabajos activos; respaldar íntegramente la carpeta administrada NEUROLAB_TRAINING_DIR, incluidos SQLite, eventos y artefactos. No se configuraron backups automáticos ni retención empresarial.
