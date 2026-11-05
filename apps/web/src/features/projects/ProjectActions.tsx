import {useState} from 'react';
import type {Project} from '../../types';
import type {LaboratoryContext} from '../../hooks/useLaboratory';
import {templates} from '../architectures/model';
import {normalizeProject,projectEvent,validateProject,statuses} from './model';

export function ProjectActions({project:p,context,onUpdate}:{project:Project;context:LaboratoryContext;onUpdate:(patch:Partial<Project>,event:string)=>void}){
 const [action,setAction]=useState<'archive'|'duplicate'|null>(null),[name,setName]=useState(''),[error,setError]=useState('');
 const active=context.running&&context.job?.projectId===p.id;
 function duplicate(){
  const id=Math.max(Date.now(),...context.projects.map(p=>p.id+1)),now=new Date().toISOString();
  const copy=normalizeProject({id,name:name.trim(),description:p.description,family:p.family,familyReason:p.familyReason,status:'Exploración',tags:[...p.tags??[]],documentation:p.documentation,createdAt:now,updatedAt:now,history:[projectEvent(`Se creó como copia de «${p.name}».`)]});
  const validation=validateProject(copy,context.projects);if(validation){setError(validation);return}
  context.setProjectArchitectures(bank=>({...bank,[id]:structuredClone(bank[p.id]??templates)}));
  context.setProjects(projects=>[...projects,copy]);context.setProject(id);context.setFamily(copy.family as typeof context.family);context.setProjectDetail(id);context.setNotice('Proyecto duplicado con arquitectura independiente. No se copiaron miembros, datasets ni ejecuciones.');
 }
 function exportProject(){
  const runs=context.runs.filter(r=>r.projectId===p.id);
  const versions=context.versions.filter(v=>v.projectId===p.id);
  const datasets=context.datasets.filter(d=>d.projectId===p.id).map(({raw,...d})=>d);
  context.download(`proyecto-${p.id}.json`,JSON.stringify({schemaVersion:1,exportedAt:new Date().toISOString(),scope:'local-demo',project:p,architectures:context.projectArchitectures[p.id]??templates,runs,versions,datasets,notice:'Incluye configuración y metadatos locales. No incluye archivos de datos ni pesos entrenados.'},null,2));
 }
 return <section className="panel project-actions" aria-label="Acciones del proyecto"><div className="section-title"><div><h3>Organización y respaldo</h3><p>Las acciones utilizan la documentación guardada.</p></div></div><div className="project-action-buttons"><button className="secondary" onClick={()=>{setAction('duplicate');setName(p.name.slice(0,62)+' (copia)');setError('')}}>Duplicar proyecto</button><button className="secondary" onClick={exportProject}>Exportar proyecto JSON</button>{p.status==='Archivado'?<button className="primary" onClick={()=>onUpdate({status:statuses.includes(p.previousStatus??'')&&p.previousStatus!=='Archivado'?p.previousStatus:'En desarrollo'},'Se reactivó el proyecto.')}>Reactivar proyecto</button>:<button className="secondary" disabled={active} onClick={()=>setAction('archive')}>Archivar proyecto</button>}</div>{active&&<p className="project-local-note">Termina o cancela la simulación antes de archivar.</p>}{action==='archive'&&<div className="project-action-confirm" role="region" aria-label="Confirmar archivado"><p>Archivar conserva la arquitectura, los datasets y el historial. No se podrán iniciar simulaciones hasta reactivarlo.</p><button className="secondary" onClick={()=>setAction(null)}>Conservar activo</button><button className="primary" onClick={()=>{onUpdate({status:'Archivado',previousStatus:p.status},'Se archivó el proyecto.');setAction(null)}}>Confirmar archivado</button></div>}{action==='duplicate'&&<form className="project-action-confirm" onSubmit={e=>{e.preventDefault();duplicate()}}><label>Nombre de la copia<input autoFocus required maxLength={70} value={name} onChange={e=>setName(e.target.value)}/></label><p>Se copiarán contexto, documentación guardada y arquitecturas. La copia tendrá solo al propietario local; no heredará datasets, ejecuciones ni modelos.</p>{error&&<p className="login-error" role="alert">{error}</p>}<button className="secondary" type="button" onClick={()=>setAction(null)}>Cancelar copia</button><button className="primary" type="submit">Crear copia</button></form>}</section>;
}
