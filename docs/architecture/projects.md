# M02: Proyectos de IA

El listado permite buscar por nombre, descripción y etiquetas; combinar filtros de familia, estado y etiqueta; y ordenar por nombre, creación o actualización. Solo se ofrecen RNN, CNN y GAN. La creación y edición validan campos vacíos, nombres duplicados y etiquetas (hasta ocho, de veinticinco caracteres cada una).

Cada ficha incluye las pestañas Contexto, Arquitectura, Dataset, Entrenamientos, Modelos e Historial. Contexto permite consultar los datos y guardar documentación en texto plano. La arquitectura y el dataset enlazan con los módulos existentes; no se han cambiado los ejemplos compartidos por familia del diseñador. Entrenamientos y Modelos muestran registros vinculados al proyecto. Historial registra localmente cambios de datos, documentación y miembros.

Miembros permite registrar nombres, correos y roles, modificar el rol y retirar a un miembro después de una confirmación. Impide correos duplicados y conserva al propietario de la cuenta demo. Las cinco funciones del documento se describen en la referencia de permisos. Esto es configuración local: no envía invitaciones, no crea usuarios ni proporciona autorización segura de servidor.

Los campos nuevos del proyecto son opcionales para conservar compatibilidad con los datos anteriores: etiquetas, documentación, miembros, eventos y fechas. Los proyectos antiguos se normalizan sin eliminar sus campos existentes y sin inventar fechas de creación. Las nuevas ejecuciones y versiones almacenan `projectId`. Al iniciar, los registros antiguos se vinculan por su referencia disponible al proyecto/ejecución. Renombrar un proyecto no altera las copias históricas de su nombre ni elimina su vínculo por identificador.

El módulo no incorpora eliminación de proyectos, invitaciones reales, colaboración remota ni auditoría protegida. La persistencia sigue siendo localStorage.

`tests/projects.mjs` verifica filtros combinados, edición, estado, etiquetas, documentación, roles, duplicados, protección del propietario, retiro confirmado, pestañas, persistencia, vínculos tras renombrar y diseño móvil/oscuro. `tests/smoke.mjs` verifica que el flujo anterior de creación y simulación sigue funcionando.
