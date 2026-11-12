import {useMemo,useState} from 'react';
import {ArrowDownToLine,BarChart3,FileText,History,Layers3,ShieldCheck} from 'lucide-react';
import type {LaboratoryContext} from '../../hooks/useLaboratory';
import {analyzeArchitecture,normalizeArchitecture,templates,type Family} from '../architectures/model';
import {displayDate,ownerEmail} from '../projects/model';
import {formatMetric} from '../evaluation/metrics';
import {reportPayload,trainingCSV,versionLabel} from './model';
import {stateLabel} from '../training/service';

export function ReportsPage({context}:{context:LaboratoryContext}){
 const [projectId,setProjectId]=useState(context.project);
 const [source,setSource]=useState('Todas');
 const project=context.projects.find(item=>item.id===projectId)??context.projects[0];
 const architecture=useMemo(()=>project?normalizeArchitecture(context.projectArchitectures[project.id]?.[project.family as Family]??templates[project.family as Family]):null,[context.projectArchitectures,project]);
 if(!project||!architecture)return <div className="empty">Crea un proyecto para generar reportes.</div>;
 const jobs=context.training.jobs.filter(job=>job.projectId===project.id);
 const runs=context.runs.filter(run=>run.projectId===project.id||(!run.projectId&&run.projectName===project.name));
 const models=context.training.models.filter(model=>model.projectId===project.id);
 const payload=reportPayload(project,architecture,jobs,runs,models);
 const trainings=source==='Real'?payload.trainings.filter(item=>item.source==='Real'):source==='Simulación'?payload.trainings.filter(item=>item.source==='Simulación'):payload.trainings;
 const analysis=analyzeArchitecture(architecture);
 const member=project.members?.find(item=>item.email.toLowerCase()===ownerEmail);
 const canExport=Boolean(member);
 async function pdf(){if(!canExport)return;try{await context.training.downloadReport(project.id,payload);context.setNotice('Reporte PDF generado desde la información actual del proyecto.')}catch{/* The service displays the error. */}}
 function csv(){if(!canExport)return;context.download(`historial-entrenamiento-${project.id}.csv`,trainingCSV(trainings),'text/csv;charset=utf-8')}
 return <div className="reports-page">
  <section className="concept-banner report-banner"><FileText size={35}/><div><h2>Tu investigación, documentada.</h2><p>Genera una ficha trazable con el proyecto, la arquitectura, los entrenamientos y los modelos reales registrados.</p></div></section>
  <section className="panel report-toolbar">
   <label>Proyecto<select aria-label="Proyecto del reporte" value={project.id} onChange={e=>setProjectId(Number(e.target.value))}>{context.projects.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
   <label>Historial incluido<select aria-label="Fuente del historial" value={source} onChange={e=>setSource(e.target.value)}>{['Todas','Real','Simulación'].map(item=><option key={item}>{item}</option>)}</select></label>
   <div className="report-permission"><ShieldCheck size={18}/><span><strong>{canExport?'Exportación autorizada':'Sin permiso de exportación'}</strong><small>{member?`${member.name} · ${member.role}`:'La sesión local no figura entre los miembros del proyecto.'}</small></span></div>
   <button className="secondary" disabled={!canExport||!trainings.length} onClick={csv}><ArrowDownToLine size={15}/> Historial CSV</button>
   <button className="primary" disabled={!canExport||context.training.busy} onClick={()=>void pdf()}><ArrowDownToLine size={15}/> {context.training.busy?'Generando…':'Reporte PDF'}</button>
  </section>
  {context.training.error&&<p role="alert" className="login-error">{context.training.error}</p>}
  <div className="report-summary-grid">
   <section className="panel report-card"><FileText size={20}/><span>Ficha del proyecto</span><h3>{project.name}</h3><p>{project.description}</p><dl><dt>Estado</dt><dd>{project.status}</dd><dt>Familia</dt><dd>{project.family}</dd><dt>Etiquetas</dt><dd>{project.tags?.join(', ')||'Sin etiquetas'}</dd><dt>Documentación</dt><dd>{project.documentation?'Incluida':'No registrada'}</dd></dl></section>
   <section className="panel report-card"><Layers3 size={20}/><span>Resumen de arquitectura</span><h3>{architecture.family}</h3><p>{architecture.layers.length} bloques editables y salida {architecture.outputUnits??'generativa'} · {architecture.outputActivation}.</p><dl><dt>Forma de entrada</dt><dd>{architecture.input?.join(' × ')}</dd><dt>Parámetros</dt><dd>{analysis.parameters.toLocaleString('es-PE')}</dd><dt>Validación</dt><dd>{analysis.errors[0]??'Arquitectura válida'}</dd><dt>Copias por ejecución</dt><dd>{jobs.length}</dd></dl></section>
   <section className="panel report-card"><History size={20}/><span>Historial de entrenamiento</span><h3>{trainings.length} ejecuciones</h3><p>{trainings.filter(item=>item.source==='Real').length} reales · {trainings.filter(item=>item.source==='Simulación').length} simulaciones identificadas.</p><dl><dt>Completadas</dt><dd>{trainings.filter(item=>['COMPLETED','Completado'].includes(item.state)).length}</dd><dt>Con métricas finales</dt><dd>{trainings.filter(item=>Object.keys(item.metrics).length).length}</dd><dt>Primera registrada</dt><dd>{displayDate(trainings.map(item=>item.createdAt).filter(Boolean).sort()[0]??undefined)}</dd></dl></section>
   <section className="panel report-card"><BarChart3 size={20}/><span>Registro de modelos</span><h3>{models.length} versiones reales</h3><p>Artefactos inmutables vinculados a ejecuciones completadas.</p><dl><dt>Aprobadas</dt><dd>{models.filter(model=>model.status==='Aprobado').length}</dd><dt>Revisadas</dt><dd>{models.filter(model=>model.status==='Revisado').length}</dd><dt>Retiradas</dt><dd>{models.filter(model=>model.status==='Retirado').length}</dd></dl></section>
  </div>
  <section className="panel report-history"><div className="section-title"><div><h3>Historial incluido</h3><p>El CSV respeta este filtro. El PDF conserva el historial completo y distingue la fuente.</p></div><span className="family">{trainings.length} filas</span></div>{trainings.length?<div className="table-wrap"><table><thead><tr><th>EJECUCIÓN</th><th>FUENTE</th><th>FAMILIA</th><th>DATASET</th><th>ESTADO</th><th>ÉPOCAS</th><th>MÉTRICAS FINALES</th><th>FECHA</th></tr></thead><tbody>{trainings.map(item=><tr key={`${item.source}-${item.id}`}><td><strong>{item.id.slice(0,12)}</strong></td><td><span className="family">{item.source}</span></td><td>{item.family}</td><td>{item.dataset}</td><td>{item.source==='Real'?stateLabel[item.state as keyof typeof stateLabel]??item.state:item.state}</td><td>{item.epochs}</td><td>{Object.entries(item.metrics).map(([key,value])=>`${key}: ${formatMetric(key,value)}`).join(' · ')||'—'}</td><td>{displayDate(item.createdAt??undefined)}</td></tr>)}</tbody></table></div>:<p className="empty">No hay ejecuciones para esta selección.</p>}</section>
  <section className="panel report-models"><div className="section-title"><div><h3>Modelos incluidos en el PDF</h3><p>Solo versiones reales persistidas en M08.</p></div><span className="family">{models.length} versiones</span></div>{models.length?<div className="table-wrap"><table><thead><tr><th>VERSIÓN</th><th>ESTADO</th><th>FAMILIA</th><th>DATASET</th><th>EJECUCIÓN</th><th>ARTEFACTOS</th></tr></thead><tbody>{models.map(model=><tr key={model.jobId}><td><strong>{versionLabel(model.version)}</strong></td><td>{model.status}</td><td>{model.family}</td><td>{model.dataset.name} v{model.dataset.version}</td><td>{model.jobId.slice(0,12)}</td><td>{model.artifacts.map(item=>item.name).join(', ')}</td></tr>)}</tbody></table></div>:<p className="empty">Este proyecto todavía no tiene modelos reales registrados.</p>}</section>
 </div>;
}
