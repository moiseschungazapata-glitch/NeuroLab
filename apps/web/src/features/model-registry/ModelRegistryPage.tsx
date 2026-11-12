import {useEffect,useMemo,useState} from 'react';
import {ArrowDownToLine,Box,FileJson,Plus,RefreshCw,ShieldCheck} from 'lucide-react';
import type {LaboratoryContext} from '../../hooks/useLaboratory';
import {profiles} from '../architectures/model';
import {displayDate,searchText} from '../projects/model';
import {formatMetric} from '../evaluation/metrics';
import type {ModelStatus,RegisteredModel} from '../training/service';

const nextStatus:Partial<Record<ModelStatus,ModelStatus>>={Borrador:'Revisado',Revisado:'Aprobado',Aprobado:'Retirado'};
const actionLabel:Partial<Record<ModelStatus,string>>={Borrador:'Marcar como revisado',Revisado:'Aprobar versión',Aprobado:'Retirar versión'};
const versionLabel=(version:number)=>`v1.${version-1}.0`;

export function ModelRegistryPage({context}:{context:LaboratoryContext}){
 const [demo,setDemo]=useState(false);
 return <><div className="registry-modes" role="group" aria-label="Fuente del registro"><button className={!demo?'primary':'secondary'} onClick={()=>setDemo(false)}>Registro real</button><button className={demo?'primary':'secondary'} onClick={()=>setDemo(true)}>Demostración educativa</button></div>{demo?<DemoRegistry context={context}/>:<RealRegistry context={context}/>}</>;
}

function RealRegistry({context}:{context:LaboratoryContext}){
 const {training,project,projects,setNotice}=context;
 const [projectFilter,setProjectFilter]=useState(String(project));
 const [status,setStatus]=useState('Todos');
 const [family,setFamily]=useState('Todas');
 const [query,setQuery]=useState('');
 const [candidate,setCandidate]=useState('');
 const [selected,setSelected]=useState('');
 useEffect(()=>{void training.refreshModels()},[training.refreshModels]);
 const registeredIds=useMemo(()=>new Set(training.models.map(m=>m.jobId)),[training.models]);
 const candidates=training.jobs.filter(job=>job.state==='COMPLETED'&&job.artifacts.length&&job.projectId===Number(projectFilter)&&!registeredIds.has(job.id));
 const models=training.models.filter(model=>(projectFilter==='all'||model.projectId===Number(projectFilter))&&(status==='Todos'||model.status===status)&&(family==='Todas'||model.family===family)&&(!query||searchText(`${versionLabel(model.version)} ${model.projectName} ${model.dataset.name} ${model.jobId}`).includes(searchText(query))));
 const model=training.models.find(item=>item.jobId===selected)??models[0];
 useEffect(()=>{if(candidate&&!candidates.some(job=>job.id===candidate))setCandidate('')},[candidate,candidates]);
 async function register(){if(!candidate)return;try{const saved=await training.registerModel(candidate);setSelected(saved.jobId);setCandidate('');setNotice(`${versionLabel(saved.version)} registrada como versión inmutable.`)}catch{/* The service exposes the error. */}}
 async function advance(item:RegisteredModel){const next=nextStatus[item.status];if(!next)return;try{await training.changeModelStatus(item.jobId,next,item.revision);setNotice(`Estado actualizado a ${next}.`)}catch{/* The service exposes the error. */}}
 return <div className="real-registry">
  <section className="panel registry-create">
   <div><ShieldCheck size={20}/><span><strong>Registrar una ejecución completada</strong><small>Se congela la arquitectura, el dataset, la configuración, las métricas y las huellas de los artefactos.</small></span></div>
   <label><span className="sr-only">Ejecución completada sin registrar</span><select aria-label="Ejecución completada sin registrar" value={candidate} onChange={e=>setCandidate(e.target.value)}><option value="">{candidates.length?'Seleccionar ejecución…':'No hay ejecuciones pendientes'}</option>{candidates.map(job=><option key={job.id} value={job.id}>{job.family} · {job.dataset.name} · {job.id.slice(0,8)}</option>)}</select></label>
   <button className="primary" disabled={!candidate||training.busy} onClick={register}><Plus size={15}/> Registrar versión</button>
  </section>
  <section className="panel registry-filters">
   <label>Proyecto<select value={projectFilter} onChange={e=>{setProjectFilter(e.target.value);setSelected('');setCandidate('')}}><option value="all">Todos los proyectos</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   <label>Estado<select value={status} onChange={e=>setStatus(e.target.value)}>{['Todos','Borrador','Revisado','Aprobado','Retirado'].map(value=><option key={value}>{value}</option>)}</select></label>
   <label>Familia<select value={family} onChange={e=>setFamily(e.target.value)}>{['Todas','Feedforward','RNN','CNN','GAN'].map(value=><option key={value}>{value}</option>)}</select></label>
   <label>Buscar<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Versión, dataset o ID"/></label>
   <button className="secondary" disabled={training.busy} onClick={()=>void training.refreshModels()}><RefreshCw size={14}/> Actualizar</button>
  </section>
  {training.error&&<p className="login-error" role="alert">{training.error}</p>}
  <div className="registry-layout">
   <section className="panel registry-list"><div className="section-title"><div><h3>Versiones inmutables</h3><p>{models.length} resultado{models.length===1?'':'s'} · historial persistente</p></div><Box size={19}/></div>
    {models.length?<div className="registry-cards">{models.map(item=><button className={item.jobId===model?.jobId?'registry-card selected':'registry-card'} key={item.jobId} onClick={()=>setSelected(item.jobId)}><span><strong>{versionLabel(item.version)}</strong><i className={`registry-status status-${item.status.toLowerCase()}`}>{item.status}</i></span><small>{item.family} · {item.dataset.name} v{item.dataset.version}</small><small>{item.projectName}</small><code>{item.jobId.slice(0,8)}</code></button>)}</div>:<div className="empty">No hay versiones para estos filtros.</div>}
   </section>
   {model?<ModelDetail model={model} context={context} onAdvance={()=>void advance(model)}/>:<section className="panel registry-detail empty">Selecciona una ejecución completada para crear la primera versión.</section>}
  </div>
 </div>;
}

function ModelDetail({model,context,onAdvance}:{model:RegisteredModel;context:LaboratoryContext;onAdvance:()=>void}){
 const job=context.training.jobs.find(item=>item.id===model.jobId);
 const metrics=Object.entries(model.testMetrics);
 return <section className="panel registry-detail">
  <div className="registry-detail-head"><div><span className="family">{model.family}</span><h2>{versionLabel(model.version)}</h2><p>{model.projectName}</p></div><span className={`registry-status status-${model.status.toLowerCase()}`}>{model.status}</span></div>
  <dl className="registry-facts"><div><dt>Dataset inmutable</dt><dd>{model.dataset.name} · v{model.dataset.version}</dd></div><div><dt>Entrenamiento</dt><dd>{model.config.epochs} épocas · batch {model.config.batch}</dd></div><div><dt>Optimizador</dt><dd>{model.config.optimizer} · {model.config.learningRate}</dd></div><div><dt>TensorFlow</dt><dd>{model.tensorflowVersion??'No informado'}</dd></div><div><dt>Registrado</dt><dd>{displayDate(model.createdAt)}</dd></div><div><dt>Ejecución</dt><dd>{model.jobId.slice(0,8)}</dd></div></dl>
  <h3>Métricas finales de prueba</h3>{metrics.length?<div className="registry-metrics">{metrics.map(([key,value])=><div key={key}><span>{key.replaceAll('_',' ')}</span><strong>{formatMetric(key,value)}</strong></div>)}</div>:<p className="muted">La ejecución no registró métricas finales.</p>}
  <details><summary>Integridad y trazabilidad</summary><dl className="registry-integrity"><dt>Dataset preparado SHA-256</dt><dd><code>{model.dataset.preparedChecksum}</code></dd>{model.artifacts.map(artifact=><div key={artifact.name}><dt>{artifact.name} · {(artifact.bytes/1024).toFixed(1)} KB</dt><dd><code>{artifact.sha256}</code></dd></div>)}</dl></details>
  <div className="registry-actions"><button className="primary" disabled={!nextStatus[model.status]||context.training.busy} onClick={onAdvance}>{actionLabel[model.status]??'Ciclo finalizado'}</button><button className="secondary" onClick={()=>void context.training.downloadManifest(model)}><FileJson size={15}/> Exportar ficha JSON</button>{model.artifacts.map(artifact=><button className="secondary" key={artifact.name} disabled={!job} onClick={()=>job&&void context.training.download(job,artifact.name)}><ArrowDownToLine size={15}/> {artifact.name}</button>)}</div>
  <p className="registry-auth-note"><ShieldCheck size={14}/> Descargas protegidas por la sesión local autorizada. El historial y los metadatos registrados no se sobrescriben.</p>
 </section>;
}

function DemoRegistry({context}:{context:LaboratoryContext}){
 const {setNotice,versions,setVersions,download}=context;
 return <section className="panel"><div className="section-title"><div><h3>Versiones de demostración</h3><p>Fichas ilustrativas conservadas en este navegador.</p></div><Box size={20}/></div><div className="table-wrap"><table><thead><tr><th>VERSIÓN</th><th>FAMILIA</th><th>MÉTRICA DEMO</th><th>ESTADO</th><th>ACCIONES</th></tr></thead><tbody>{versions.map((v,i)=><tr key={v.name}><td><strong>{v.name}</strong><small>{v.dataset} · {v.family}</small></td><td><span className="family">{v.family}</span></td><td>{profiles[v.family].metric}: {v.accuracy}{profiles[v.family].unit}</td><td><span className="badge green">{v.status}</span></td><td><button className="text-btn" onClick={()=>{setVersions(versions.map((a,n)=>n===i?{...a,status:a.status==='Borrador'?'Revisado':a.status==='Revisado'?'Aprobado':'Retirado'}:a));setNotice('Estado demo actualizado localmente')}}>Cambiar estado</button><button className="icon-btn" aria-label={'Exportar '+v.name} onClick={()=>download(v.name+'.json',JSON.stringify({...v,simulated:true},null,2))}><ArrowDownToLine size={16}/></button></td></tr>)}</tbody></table></div><div className="panel-foot">Esta vista exporta una ficha simulada y no contiene pesos entrenados.</div></section>;
}
