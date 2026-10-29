# Operación del frontend

Ejecutar `npm install` y `npm run dev` desde la raíz. Vite sirve `apps/web/index.html`. Para comprobar los tipos, usar `npm run typecheck`; para generar la entrega estática en `dist/`, usar `npm run build`. `npm run preview` sirve esa compilación.

Conservar el mismo origen (protocolo, dirección y puerto) permite seguir usando los datos locales anteriores. Las claves `nl-projects`, `nl-architectures-v2`, `nl-runs-v2`, `nl-versions-v2`, `nl-notes`, `nl-theme`, `nl-sidebar-collapsed` y `nl-session` no cambian con la reorganización. No es necesario limpiar el almacenamiento del navegador.

El acceso es local y de demostración. Los trabajos en curso continúan al navegar entre módulos, pero se reinician al recargar o cerrar sesión. Los registros terminados permanecen en el navegador.

Docker, migraciones, monitoreo y workers son carpetas reservadas: esta etapa no añade servicios ni infraestructura ejecutable.
