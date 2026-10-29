import { ArrowDownToLine,FolderKanban,Network } from 'lucide-react';
import type { LaboratoryContext } from '../../hooks/useLaboratory';
import { ArchitectureEditor } from '../architectures/ArchitectureEditor';
import { families,analyzeArchitecture } from '../architectures/model';
import {DesignVersions} from './DesignVersions';

export function ArchitecturesPage({context}:{context:LaboratoryContext}){
const {projects,project,notice,setNotice,family,architectures,setArchitectures,architecture,dataset,current,chooseFamily,openProject,download}=context;
if(!current)return <div className="empty">Crea un proyecto para diseñar una arquitectura.</div>;
const result=analyzeArchitecture(architecture);
const change=(a:typeof architecture)=>setArchitectures({...architectures,[family]:a});
return (<><div className="project-strip"><FolderKanban size={17}/><select aria-label="Proyecto actual" value={project} onChange={e=>openProject(Number(e.target.value))}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><span className="badge green">Autoguardado local</span><button disabled={!!result.errors.length} className="text-btn" onClick={()=>download('arquitectura.json',JSON.stringify({schemaVersion:3,projectId:current.id,project:current.name,...architecture,dataset,summary:{parameters:result.parameters,rows:result.rows},recurrentOptions:{gruResetAfter:false},simulated:true},null,2))}><ArrowDownToLine size={15}/> Exportar JSON</button></div><div className="family-tabs" aria-label="Familia de red">{families.map(f=><button key={f} className={family===f?'selected':''} onClick={()=>chooseFamily(f)}><Network size={17}/><strong>{f}</strong><span>{f==='RNN'?'Secuencias':f==='CNN'?'Imágenes':'Generación'}</span></button>)}</div><ArchitectureEditor key={project+'-'+family} architecture={architecture} onChange={change} notice={setNotice}/><DesignVersions key={'revisions-'+project+'-'+family} projectId={project} architecture={architecture} onRestore={change} notice={setNotice}/></>);
}
