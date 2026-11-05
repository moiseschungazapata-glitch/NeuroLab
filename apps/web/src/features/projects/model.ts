import type {Project, ProjectRole} from '../../types';
export const ownerEmail='moiseschungazapata@gmail.com';
export const statuses=['Exploración','En desarrollo','En revisión','Completado','Archivado'];
export const roles:ProjectRole[]=['Administrador','Responsable de proyecto','Ingeniero/analista de IA','Revisor','Lector'];
export const permissions:Record<ProjectRole,string>={Administrador:'Gestión de usuarios, configuración y recursos.','Responsable de proyecto':'Gestión del proyecto, miembros y modelos.','Ingeniero/analista de IA':'Diseño de arquitecturas, entrenamiento y evaluación.',Revisor:'Consulta, comparación y aprobación de versiones.',Lector:'Consulta de proyectos y reportes.'};
export function normalizeProject(p:Project):Project{return {...p,tags:p.tags??[],documentation:p.documentation??'',members:p.members??[{id:'owner',name:'Moisés Chunga',email:ownerEmail,role:'Responsable de proyecto'}],history:p.history??[]}}
export function projectEvent(description:string){return {id:crypto.randomUUID(),date:new Date().toISOString(),description}}
export function displayDate(value?:string){return value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('es-PE',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Lima'}).format(new Date(value)):'Sin fecha registrada'}
export function searchText(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toLocaleLowerCase('es')}
export function projectTags(value:string){const seen=new Set<string>();return value.split(',').map(t=>t.trim()).filter(t=>{const key=searchText(t);if(!key||seen.has(key))return false;seen.add(key);return true})}
export function validateProject(project:Pick<Project,'id'|'name'|'description'|'family'|'status'|'tags'|'familyReason'>,projects:Project[]){
 if(!project.name.trim()||!project.description.trim())return 'Completa el nombre y el problema a resolver.';
 if(project.name.length>70||project.description.length>500)return 'Usa hasta 70 caracteres para el nombre y 500 para el problema.';
 if(!['RNN','CNN','GAN'].includes(project.family)||!statuses.includes(project.status))return 'Selecciona una familia y un estado válidos.';
 if((project.tags?.length??0)>8||project.tags?.some(t=>t.length>25))return 'Usa hasta 8 etiquetas de 25 caracteres como máximo.';
 if((project.familyReason?.length??0)>500)return 'La justificación admite hasta 500 caracteres.';
 if(projects.some(p=>p.id!==project.id&&searchText(p.name)===searchText(project.name)))return 'Ya existe un proyecto con ese nombre.';
 return '';
}
export function validateMember(name:string,email:string,role:string,members:NonNullable<Project['members']>){
 if(!name.trim()||name.length>80)return 'Escribe un nombre de hasta 80 caracteres.';
 if(email.length>150||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))return 'Escribe un correo válido.';
 if(!roles.includes(role as ProjectRole))return 'Selecciona un rol válido.';
 if(members.some(m=>m.email.toLowerCase()===email.toLowerCase()))return 'Este correo ya pertenece al proyecto.';
 return '';
}
