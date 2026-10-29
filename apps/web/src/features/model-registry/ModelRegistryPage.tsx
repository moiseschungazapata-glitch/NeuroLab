import { ArrowDownToLine,Box } from 'lucide-react';
import type { LaboratoryContext } from '../../hooks/useLaboratory';
import { profiles } from '../architectures/model';

export function ModelRegistryPage({context}:{context:LaboratoryContext}){
const {setNotice,family,versions,setVersions,dataset,download}=context;
return (<section className="panel"><div className="section-title"><div><h3>Versiones del modelo</h3><p>Configuraciones y resultados demo conservados en este navegador.</p></div><Box size={20}/></div><div className="table-wrap"><table><thead><tr><th>VERSIÓN</th><th>FAMILIA</th><th>MÉTRICA DEMO</th><th>ESTADO</th><th>ACCIONES</th></tr></thead><tbody>{versions.map((v,i)=><tr key={v.name}><td><strong>{v.name}</strong><small>{v.dataset} · {v.family}</small></td><td><span className="family">{v.family}</span></td><td>{profiles[v.family].metric}: {v.accuracy}{profiles[v.family].unit}</td><td><span className="badge green">{v.status}</span></td><td><button className="text-btn" onClick={()=>{setVersions(versions.map((a,n)=>n===i?{...a,status:a.status==='Borrador'?'Revisado':a.status==='Revisado'?'Aprobado':'Retirado'}:a));setNotice('Estado actualizado localmente')}}>Cambiar estado</button><button className="icon-btn" aria-label={'Exportar '+v.name} onClick={()=>download(v.name+'.json',JSON.stringify({...v,simulated:true},null,2))}><ArrowDownToLine size={16}/></button></td></tr>)}</tbody></table></div><div className="panel-foot">Se exporta la ficha de configuración. No contiene pesos ni un modelo entrenado.</div></section>);
}
