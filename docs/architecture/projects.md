# M02: Proyectos de IA

## Funciones implementadas

Listado con búsqueda por nombre, descripción y etiquetas, sin distinguir tildes o mayúsculas; filtros combinados de familia, estado y etiqueta; ordenación por nombre o fechas. Estado vacío con creación directa. Solo se ofrecen las familias actualmente soportadas: RNN, CNN y GAN.

Creación y edición con validaciones compartidas: nombre hasta 70 caracteres, problema hasta 500, familia y estado admitidos, justificación opcional hasta 500 y ocho etiquetas de hasta 25 caracteres. Se detectan nombres duplicados normalizando espacios, tildes y mayúsculas; etiquetas se deduplican con el mismo criterio. Los proyectos anteriores conservan sus campos y fechas sin inventar fechas históricas.

Ficha con Contexto, Arquitectura, Dataset, Entrenamientos, Modelos e Historial. Los vínculos por projectId se conservan al renombrar. La justificación de familia aparece en Contexto. Las fechas incluyen hora y zona America/Lima; fechas inválidas muestran Sin fecha registrada.

## Organización y respaldo

Archivar requiere confirmación y conserva datasets, modelos y arquitecturas. Se bloquea el archivado durante una simulación del proyecto, tanto desde la acción como desde el formulario de edición. Un proyecto archivado no puede iniciar nuevas simulaciones. Reactivar recupera el estado anterior cuando está registrado, o En desarrollo para registros antiguos.

Duplicar valida el nuevo nombre y copia contexto, etiquetas, documentación guardada y el banco completo de arquitecturas con identificador independiente. La copia inicia en Exploración y conserva únicamente al propietario demo. No se copian integrantes, historial antiguo, datasets, selecciones, ejecuciones ni versiones. Se registra la procedencia en su historial.

Exportar JSON genera un respaldo con versión de esquema, fecha, proyecto, arquitecturas, ejecuciones y versiones de ese proyecto, y metadatos de sus datasets. No incluye archivos originales ni pesos entrenados; no constituye un mecanismo de restauración completo. La exportación utiliza la documentación guardada, no un borrador pendiente.

## Borradores y persistencia

La documentación conserva un borrador por proyecto en nl-project-draft-{id}, incluso al cambiar de módulo o recargar. Se puede descartar explícitamente. Al guardar correctamente nl-projects se elimina solo el borrador que coincide con el documento guardado. Si falla el guardado del proyecto, se conserva el borrador y se informa el error, permitiendo exportar los datos que siguen en memoria. Se advierte antes de cerrar con cambios pendientes o un fallo de persistencia.

La persistencia general sigue siendo localStorage. Se muestra un aviso persistente si el navegador rechaza la escritura de proyectos; no se presenta el estado como guardado. Si también falla la escritura del borrador, se informa expresamente y no se garantiza su recuperación.

## Miembros y límites

Registro local con nombre, correo y uno de los cinco roles previstos; validación de campos, correos duplicados, cambio de rol y retiro confirmado. El propietario demo está protegido en los controles. El historial identifica el miembro retirado y el rol anterior/nuevo en los cambios.

Esto no crea cuentas, no envía invitaciones y no aplica autorización segura. La gestión multiusuario, persistencia PostgreSQL, invitaciones, RBAC y auditoría protegida requieren los servicios de identidad y proyectos de la plataforma. M02 no declara esos requisitos empresariales completados. No se implementó borrado destructivo de proyectos; se utiliza archivado reversible.

## Verificación

- node tests/project-rules.mjs: reglas de nombres, etiquetas, límites, familias, estados, roles, correos y fechas inválidas (Node 24).
- tests/projects.mjs: filtros, edición, miembros, documentación, pestañas, vínculos persistentes y móvil/oscuro.
- tests/projects-actions.mjs: recuperación de borradores, archivado/reactivación, bloqueo de simulación, exportación filtrada, duplicación independiente y error de almacenamiento recuperable.
- tests/smoke.mjs y tests/dashboard.mjs: regresión del flujo principal y M01.

Las pruebas de navegador requieren Playwright y Chrome con el frontend en 5173; NEUROLAB_PLAYWRIGHT permite señalar el módulo instalado usando una URL file:///.
