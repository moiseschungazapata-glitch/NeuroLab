import { ArrowDownToLine,ArrowRight } from 'lucide-react';
import type { LaboratoryContext } from '../../hooks/useLaboratory';
import { profiles } from '../architectures/model';

export function ReportsPage({context}:{context:LaboratoryContext}){
const {project,family,epochs,runs,versions,architecture,dataset,current,download}=context;
return (<><section className="concept-banner"><ArrowDownToLine size={35}/><div><h2>Tu investigación, documentada.</h2><p>Exporta la arquitectura y el historial de tus experimentos para acompañar la entrega académica.</p></div></section><div className="project-grid">{[['Ficha del proyecto','Contexto, familia y configuración de capas.','JSON'],['Historial de entrenamiento','Estados, épocas y métricas de referencia.','CSV'],['Resumen para impresión','Informe de tu espacio de trabajo.','Imprimir']].map(([a,b,c],i)=><article className="panel concept" key={a}><ArrowDownToLine size={23}/><h3>{a}</h3><p>{b}</p><button className="secondary" onClick={()=>i===0?download('proyecto-neurolab.json',JSON.stringify({project:current,architecture,versions,simulated:true},null,2)):i===1?download('experimentos.csv','Experimento,Familia,Dataset,Estado,Epocas,Metrica,Valor,Perdida\n'+runs.map(r=>[r.name,r.family,r.dataset,r.status,r.epochs,profiles[r.family].metric,r.accuracy,r.loss].join(',')).join('\n'),'text/csv;charset=utf-8'):window.print()}>Exportar {c} <ArrowRight size={14}/></button></article>)}</div></>);
}
