import type { Architecture,Family } from '../features/architectures/model';
import type {DatasetSnapshot} from '../features/datasets/model';
export type TrainingConfiguration={epochs:number;batch:number;optimizer:string;modelSeed:number;learningRate:number;earlyStopping:boolean;patience:number};
export type ProjectRole='Administrador'|'Responsable de proyecto'|'Ingeniero/analista de IA'|'Revisor'|'Lector';
export type ProjectMember={id:string;name:string;email:string;role:ProjectRole};
export type ProjectEvent={id:string;date:string;description:string};
export type Project={id:number;name:string;description:string;family:string;status:string;tags?:string[];documentation?:string;members?:ProjectMember[];history?:ProjectEvent[];createdAt?:string;updatedAt?:string};
export type Run={datasetId?:string;datasetSnapshot?:DatasetSnapshot;trainingConfig?:TrainingConfiguration;projectId?:number;family:Family;dataset:string;projectName:string;architecture:Architecture;id:number;name:string;accuracy:number;loss:number;status:string;epochs:number};
export type ModelVersion={datasetId?:string;datasetSnapshot?:DatasetSnapshot;trainingConfig?:TrainingConfiguration;projectId?:number;name:string;status:string;accuracy:number;family:Family;dataset:string;architecture:Architecture;runId?:number};
