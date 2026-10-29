import type {Project, ProjectRole} from '../../types';
export const ownerEmail='moiseschungazapata@gmail.com';
export const statuses=['Exploración','En desarrollo','En revisión','Completado','Archivado'];
export const roles:ProjectRole[]=['Administrador','Responsable de proyecto','Ingeniero/analista de IA','Revisor','Lector'];
export const permissions:Record<ProjectRole,string>={Administrador:'Gestión de usuarios, configuración y recursos.','Responsable de proyecto':'Gestión del proyecto, miembros y modelos.','Ingeniero/analista de IA':'Diseño de arquitecturas, entrenamiento y evaluación.',Revisor:'Consulta, comparación y aprobación de versiones.',Lector:'Consulta de proyectos y reportes.'};
export function normalizeProject(p:Project):Project{return {...p,tags:p.tags??[],documentation:p.documentation??'',members:p.members??[{id:'owner',name:'Moisés Chunga',email:ownerEmail,role:'Responsable de proyecto'}],history:p.history??[]}}
export function projectEvent(description:string){return {id:crypto.randomUUID(),date:new Date().toISOString(),description}}
export function displayDate(value?:string){return value?new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeZone:'America/Bogota'}).format(new Date(value)):'Sin fecha registrada'}
