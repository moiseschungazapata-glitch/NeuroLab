import type {Architecture} from '../architectures/model';
import {analyzeArchitecture,normalizeArchitecture,shapeLabel} from '../architectures/model';
import type {Project,Run} from '../../types';
import type {RealJob,RegisteredModel} from '../training/service';

export type ReportTraining={id:string;source:'Real'|'Simulación';family:string;dataset:string;state:string;createdAt:string|null;endedAt:string|null;epochs:number;batch:number|null;optimizer:string|null;metrics:Record<string,number>};
export type ReportPayload={generatedAt:string;project:{id:number;name:string;description:string;family:string;status:string;documentation:string;tags:string[]};architecture:{family:string;input:number[];output:string;parameters:number;layers:Architecture['layers']};trainings:ReportTraining[];models:{version:string;status:string;family:string;dataset:string;jobId:string;artifacts:RegisteredModel['artifacts']}[]};

export function versionLabel(version:number){return `v1.${version-1}.0`}

export function reportPayload(project:Project,architecture:Architecture,jobs:RealJob[],runs:Run[],models:RegisteredModel[]):ReportPayload{
 const analysis=analyzeArchitecture(architecture),a=normalizeArchitecture(architecture);
 const output=a.family==='GAN'?`${shapeLabel(a.input!)} · ${a.outputActivation}`:`${a.outputUnits} · ${a.outputActivation}`;
 const real:ReportTraining[]=jobs.map(job=>({id:job.id,source:'Real',family:job.family,dataset:`${job.dataset.name} v${job.dataset.version}`,state:job.state,createdAt:job.createdAt??null,endedAt:job.endedAt??null,epochs:job.epoch,batch:job.config.batch,optimizer:job.config.optimizer,metrics:job.testMetrics??{}}));
 const simulated:ReportTraining[]=runs.map(run=>({id:String(run.id),source:'Simulación',family:run.family,dataset:run.dataset,state:run.status,createdAt:null,endedAt:null,epochs:run.epochs,batch:run.trainingConfig?.batch??null,optimizer:run.trainingConfig?.optimizer??null,metrics:run.status==='Completado'?{accuracy:run.accuracy/100,loss:run.loss}:{} as Record<string,number>}));
 return {generatedAt:new Date().toISOString(),project:{id:project.id,name:project.name,description:project.description,family:project.family,status:project.status,documentation:project.documentation??'',tags:project.tags??[]},architecture:{family:a.family,input:a.input!,output,parameters:analysis.parameters,layers:a.layers},trainings:[...real,...simulated],models:models.map(model=>({version:versionLabel(model.version),status:model.status,family:model.family,dataset:`${model.dataset.name} v${model.dataset.version}`,jobId:model.jobId,artifacts:model.artifacts}))};
}

function csvCell(value:unknown){const text=String(value??'');return /[",\r\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text}

export function trainingCSV(trainings:ReportTraining[]){
 const rows=[['Ejecución','Fuente','Familia','Dataset','Estado','Creado','Finalizado','Épocas','Batch','Optimizador','Métricas finales'],...trainings.map(item=>[item.id,item.source,item.family,item.dataset,item.state,item.createdAt??'',item.endedAt??'',item.epochs,item.batch??'',item.optimizer??'',Object.entries(item.metrics).map(([key,value])=>`${key}=${value}`).join(' | ')])];
 return '\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
