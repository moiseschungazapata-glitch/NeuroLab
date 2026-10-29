import type {LaboratoryContext} from '../../hooks/useLaboratory';
import {families, validArchitecture, type Family} from '../architectures/model';

export type DashboardAlert={id:string;title:string;description:string;action:string;page:number;family?:Family;kind:'warning'|'info';save?:boolean;create?:boolean};
type DashboardData=Pick<LaboratoryContext,'projects'|'runs'|'versions'|'architectures'|'running'|'job'|'dismissedAlerts'>;
export function dashboardSummary(data:DashboardData){
 const completed=data.runs.filter(r=>r.status==='Completado');
 const cancelled=data.runs.filter(r=>r.status==='Cancelado');
 const failed=data.runs.filter(r=>r.status==='Fallido');
 const valid=families.filter(f=>!validArchitecture(data.architectures[f]));
 const alerts:DashboardAlert[]=[];
 if(!data.projects.length)alerts.push({id:'no-projects',kind:'info',title:'Crea tu primer proyecto',description:'Necesitas un proyecto para comenzar un experimento.',action:'Crear proyecto',page:1,create:true});
 for(const f of families){const error=validArchitecture(data.architectures[f]);if(error)alerts.push({id:`architecture-${f}-${JSON.stringify(data.architectures[f])}`,kind:'warning',title:`Revisa tu arquitectura ${f}`,description:error,action:'Corregir arquitectura',page:3,family:f});}
 const interrupted=data.runs.find(r=>r.status==='Cancelado'||r.status==='Fallido');
 if(interrupted)alerts.push({id:`interrupted-${interrupted.id}`,kind:'warning',title:interrupted.status==='Fallido'?'Hay un experimento fallido':'Hay una simulación cancelada',description:`${interrupted.name} · ${interrupted.projectName}. Revisa el historial antes de iniciar otro experimento.`,action:'Ver entrenamientos',page:5,family:interrupted.family});
 const latest=completed[0];
 if(latest&&!data.versions.some(v=>v.runId===latest.id))alerts.push({id:`version-${latest.id}`,kind:'info',title:'Resultado sin versión vinculada',description:`${latest.name} (${latest.family}) terminó. Puedes conservar su configuración como versión local.`,action:'Guardar versión',page:7,save:true});
 return {completed:completed.length,cancelled:cancelled.length,failed:failed.length,validArchitectures:valid.length,active:data.running?1:0,total:data.runs.length+(data.running?1:0),completionRate:data.runs.length?Math.round(completed.length/data.runs.length*100):null,alerts,visibleAlerts:alerts.filter(a=>!data.dismissedAlerts.includes(a.id))};
}
