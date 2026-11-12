import type {Architecture,DesignFamily} from '../architectures/model';
import type {TrainingConfiguration} from '../../types';
export type JobState='QUEUED'|'PREPARING'|'RUNNING'|'COMPLETED'|'FAILED'|'CANCELLED';
export type JobEvaluation = { observations: string; limitations: string; revision: number; updatedAt: string | null };
export type RealJob={id:string;eventId:number;state:JobState;projectId:number;projectName:string;family:DesignFamily;architecture:Architecture;config:TrainingConfiguration;dataset:{id:string;name:string;version:number;checksum:string;preparedChecksum:string;classes:string[];task:string;counts:Record<string,number>};createdAt:string;updatedAt:string;startedAt?:string;endedAt?:string;epoch:number;progress:number;metrics:({epoch:number}&Record<string,number>)[];testMetrics?:Record<string,number>;logs:string[];cancelRequested:boolean;error?:string;artifacts:{name:string;bytes:number;sha256:string}[];stoppedEarly?:boolean;weightsChanged?:boolean;tensorflowVersion?:string;retryOf?:string};
export type ModelStatus='Borrador'|'Revisado'|'Aprobado'|'Retirado';
export type RegisteredModel={jobId:string;projectId:number;projectName:string;version:number;status:ModelStatus;revision:number;createdAt:string;updatedAt:string;family:DesignFamily;architecture:Architecture;config:TrainingConfiguration;dataset:RealJob['dataset'];testMetrics:Record<string,number>;artifacts:RealJob['artifacts'];startedAt?:string;endedAt?:string;tensorflowVersion?:string;stoppedEarly:boolean;weightsChanged:boolean};
export const terminal=(state:JobState)=>['COMPLETED','FAILED','CANCELLED'].includes(state);
export const stateLabel:Record<JobState,string>={QUEUED:'En cola',PREPARING:'Preparando',RUNNING:'Ejecutando',COMPLETED:'Completado',FAILED:'Fallido',CANCELLED:'Cancelado'};
