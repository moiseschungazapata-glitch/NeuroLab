import type {RealJob} from './service';
import {stateLabel,terminal} from './service';
export function RealJobList({jobs,onSelect}:{jobs:RealJob[];onSelect:(id:string)=>void}){
 return jobs.length?<div className="table-wrap"><table><thead><tr><th>Trabajo</th><th>Familia</th><th>Estado</th><th>Épocas</th><th>Progreso</th><th></th></tr></thead><tbody>{jobs.map(j=><tr key={j.id}><td><strong>{j.projectName}</strong><small>{j.id.slice(0,8)} · {j.dataset.name} v{j.dataset.version}</small></td><td>{j.family}</td><td><span className={'badge '+(j.state==='COMPLETED'?'green':terminal(j.state)?'gray':'amber')}>{stateLabel[j.state]}{j.cancelRequested&&!terminal(j.state)?' · cancelando':''}</span></td><td>{j.epoch}/{j.config.epochs}</td><td>{j.progress}%</td><td><button className="text-btn" onClick={()=>onSelect(j.id)}>Ver trabajo {j.id.slice(0,8)}</button></td></tr>)}</tbody></table></div>:<p className="real-empty">Aún no hay entrenamientos reales registrados en este servidor.</p>;
}
