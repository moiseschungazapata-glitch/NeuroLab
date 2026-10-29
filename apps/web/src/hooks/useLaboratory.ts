import {useDatasets} from '../features/datasets/useDatasets';
import {compatibility,type DatasetSnapshot} from '../features/datasets/model';
import {normalizeProject} from '../features/projects/model';
import { useEffect,useState,useMemo } from 'react';
import { families,profiles,templates,validArchitecture,normalizeBank,type Architecture,type Family } from '../features/architectures/model';
import { seeds } from '../features/projects/demo-projects';
import { stored } from '../lib/storage';
import type { ModelVersion,Project,Run,TrainingConfiguration } from '../types';
export function useLaboratory(){
const [collapsed,setCollapsed]=useState(()=>localStorage.getItem('nl-sidebar-collapsed')==='true');
const [isMobile,setIsMobile]=useState(()=>window.matchMedia('(max-width:700px)').matches);
useEffect(()=>{const mq=window.matchMedia('(max-width:700px)');const update=()=>setIsMobile(mq.matches);mq.addEventListener('change',update);return()=>mq.removeEventListener('change',update)},[]);
useEffect(()=>{localStorage.setItem('nl-sidebar-collapsed',String(collapsed))},[collapsed]);
function toggleSidebar(){if(isMobile)setMobile(v=>!v);else setCollapsed(v=>!v)}
const [page,setPage]=useState(0),[mobile,setMobile]=useState(false),[projects,setProjects]=useState<Project[]>(()=>stored<Project[]>('nl-projects',seeds).map(p=>normalizeProject({...p,family:families.includes(p.family as Family)?p.family:'CNN'}))),[project,setProject]=useState(()=>projects[0]?.id??1),[search,setSearch]=useState(''),[modal,setModal]=useState(false),[notice,setNotice]=useState(''),[family,setFamily]=useState<Family>('CNN'),[projectArchitectures,setProjectArchitectures]=useState<Record<string,Record<Family,Architecture>>>(()=>stored('nl-project-architectures-v3',Object.fromEntries(projects.map(p=>[p.id,normalizeBank(structuredClone(stored('nl-architectures-v2',templates)))])))),[epochs,setEpochs]=useState(20),[batch,setBatch]=useState(32),[optimizer,setOptimizer]=useState('Adam'),[progress,setProgress]=useState(0),[running,setRunning]=useState(false),[jobState,setJobState]=useState('Listo'),[runs,setRuns]=useState<Run[]>(()=>stored<Run[]>('nl-runs-v2',[{family:'CNN',dataset:'MNIST',projectName:'Clasificación de imágenes',architecture:templates.CNN,id:1042,name:'Experimento 024',accuracy:97.8,loss:.068,status:'Completado',epochs:20},{family:'CNN',dataset:'MNIST',projectName:'Clasificación de imágenes',architecture:templates.CNN,id:1041,name:'Experimento 023',accuracy:95.4,loss:.124,status:'Completado',epochs:15},{family:'CNN',dataset:'MNIST',projectName:'Clasificación de imágenes',architecture:templates.CNN,id:1040,name:'Experimento 022',accuracy:0,loss:0,status:'Cancelado',epochs:4}]).map(r=>({...r,projectId:r.projectId??projects.find(p=>p.name===r.projectName)?.id}))),[versions,setVersions]=useState<ModelVersion[]>(()=>stored<ModelVersion[]>('nl-versions-v2',[{runId:1042,name:'v1.0.0',status:'Revisado',accuracy:97.8,family:'CNN',dataset:'MNIST',architecture:templates.CNN}]).map(v=>({...v,projectId:v.projectId??runs.find(r=>r.id===v.runId)?.projectId}))),[compare,setCompare]=useState(false);
const [editingProject,setEditingProject]=useState<number|null>(null); const [projectDetail,setProjectDetail]=useState<number|null>(null);
const [dismissedAlerts,setDismissedAlerts]=useState<string[]>(()=>stored('nl-dismissed-alerts',[]));
const [alertFocus,setAlertFocus]=useState(0);
const [localBytes,setLocalBytes]=useState<number|null>(null);
function openAlerts(){go(0);setAlertFocus(n=>n+1)}
const architectures=useMemo(()=>normalizeBank(projectArchitectures[project]??templates),[projectArchitectures,project]);
function setArchitectures(bank:Record<Family,Architecture>){setProjectArchitectures(previous=>({...previous,[project]:normalizeBank(bank)}))}
const architecture=architectures[family];
const datasetState=useDatasets();
const [datasetSelections,setDatasetSelections]=useState<Record<string,string>>(()=>stored('nl-dataset-selection',{}));
const [reviewedDataset,setReviewedDataset]=useState('');
const [modelSeed,setModelSeed]=useState(42),[learningRate,setLearningRate]=useState(.001),[earlyStopping,setEarlyStopping]=useState(false),[patience,setPatience]=useState(5);
const datasetSelectionId=datasetSelections[`${project}-${family}`]??'__reference__';
const selectedDataset=datasetState.datasets.find(d=>d.id===datasetSelectionId&&d.projectId===project&&d.family===family);
const dataset=datasetSelectionId==='__reference__'?profiles[family].dataset:selectedDataset?selectedDataset.name+' · v'+selectedDataset.version:'Dataset no disponible';
function selectDataset(id:string,f:Family){chooseFamily(f);setDatasetSelections(previous=>({...previous,[`${project}-${f}`]:id}));setReviewedDataset('')}
useEffect(()=>localStorage.setItem('nl-dataset-selection',JSON.stringify(datasetSelections)),[datasetSelections]);
const [job,setJob]=useState<{datasetId?:string;datasetSnapshot?:DatasetSnapshot;trainingConfig?:TrainingConfiguration;projectId?:number;family:Family;dataset:string;projectName:string;architecture:Architecture}|null>(null);
const activeFamily=job?.family||family;
const latest=runs.find(r=>r.status==='Completado');
function chooseFamily(f:Family){setFamily(f);setProjects(ps=>ps.map(p=>p.id===project?{...p,family:f}:p));}
function openProject(id:number){setProject(id);const p=projects.find(p=>p.id===id);if(p)setFamily(p.family as Family);go(3)}
const current=projects.find(p=>p.id===project)||projects[0];
useEffect(()=>localStorage.setItem('nl-projects',JSON.stringify(projects)),[projects]);useEffect(()=>localStorage.setItem('nl-project-architectures-v3',JSON.stringify(projectArchitectures)),[projectArchitectures]);useEffect(()=>localStorage.setItem('nl-runs-v2',JSON.stringify(runs)),[runs]);useEffect(()=>localStorage.setItem('nl-versions-v2',JSON.stringify(versions)),[versions]);
useEffect(()=>{if(notice){const t=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(t)}},[notice]);
useEffect(()=>{if(!running)return;const t=setInterval(()=>setProgress(p=>{const next=Math.min(100,p+5);setJobState(next<15?'Preparando':next<100?'Ejecutando':'Completado');if(next===100){setRunning(false);setRuns(r=>[{...job!,id:Date.now(),name:`Experimento ${String(r.length+22).padStart(3,'0')}`,accuracy:profiles[job!.family].value,loss:job!.family==='GAN'?.53:.068,status:'Completado',epochs},...r]);setNotice('Simulación completada. Ya puedes guardar una versión.')}return next}),700);return()=>clearInterval(t)},[running,epochs,job]);
function go(n:number){setProjectDetail(null);setPage(n);setMobile(false);setSearch('')}
function download(name:string,body:string,type='application/json'){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);setNotice('Archivo exportado')}
function start(){if(!current){setNotice('Crea un proyecto antes de iniciar una simulación.');return}if(running){setNotice('Hay una simulación activa. Cancélala o espera a que termine.');go(5);return}const error=validArchitecture(architecture);if(error){setNotice(error);return}if(!Number.isInteger(epochs)||epochs<1||epochs>200||![16,32,64,128].includes(batch)||!['Adam','SGD','RMSprop'].includes(optimizer)||!Number.isInteger(modelSeed)||modelSeed<0||modelSeed>4294967295||!Number.isFinite(learningRate)||learningRate<.000001||learningRate>1||(earlyStopping&&(!Number.isInteger(patience)||patience<1||patience>epochs))){setNotice('Revisa épocas, batch, optimizador, semilla, tasa de aprendizaje y paciencia.');go(5);return}
if(datasetSelectionId!=='__reference__'){
 if(datasetState.datasetsLoading){setNotice('Espera a que terminen de cargar los datasets.');return}
 if(!selectedDataset){setNotice('La versión seleccionada no está disponible. Selecciona otra en Entrenamientos.');go(5);return}
 const issue=compatibility(selectedDataset,architecture);if(issue){setNotice(issue);go(5);return}
 if(!selectedDataset.permissionConfirmed||reviewedDataset!==selectedDataset.id){setNotice('Revisa y confirma los datos y sus advertencias antes de iniciar.');go(5);return}
}
setJob({datasetId:selectedDataset?.id,datasetSnapshot:selectedDataset?.prepared?structuredClone({id:selectedDataset.id,name:selectedDataset.name,version:selectedDataset.version,checksum:selectedDataset.checksum,prepared:selectedDataset.prepared}):undefined,trainingConfig:{epochs,batch,optimizer,modelSeed,learningRate,earlyStopping,patience},projectId:current.id,family,dataset,projectName:current.name,architecture:structuredClone(architecture)});setProgress(0);setJobState('En cola');setRunning(true);go(5)}
function saveVersion(){if(!latest){setNotice('Completa una simulación antes de guardar una versión.');return}setVersions(v=>[{name:'v1.'+v.length+'.0',status:'Borrador',datasetId:latest.datasetId,datasetSnapshot:latest.datasetSnapshot,trainingConfig:latest.trainingConfig,projectId:latest.projectId,runId:latest.id,accuracy:latest.accuracy,family:latest.family,dataset:latest.dataset,architecture:latest.architecture},...v]);setNotice('Versión demo guardada en este navegador');go(7)}
useEffect(()=>{
 localStorage.setItem('nl-dismissed-alerts',JSON.stringify(dismissedAlerts));
 try{let bytes=0;for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith('nl-'))bytes+=(key.length+(localStorage.getItem(key)?.length??0))*2}setLocalBytes(bytes)}catch{setLocalBytes(null)}
},[projects,architectures,runs,versions,dismissedAlerts]);
return {...datasetState,datasetSelections,datasetSelectionId,selectedDataset,selectDataset,reviewedDataset,setReviewedDataset,modelSeed,setModelSeed,learningRate,setLearningRate,earlyStopping,setEarlyStopping,patience,setPatience,editingProject,setEditingProject,projectDetail,setProjectDetail,dismissedAlerts,setDismissedAlerts,alertFocus,setAlertFocus,openAlerts,localBytes,collapsed,setCollapsed,isMobile,setIsMobile,page,setPage,mobile,setMobile,projects,setProjects,project,setProject,search,setSearch,modal,setModal,notice,setNotice,family,setFamily,projectArchitectures,architectures,setArchitectures,epochs,setEpochs,batch,setBatch,optimizer,setOptimizer,progress,setProgress,running,setRunning,jobState,setJobState,runs,setRuns,versions,setVersions,compare,setCompare,job,setJob,architecture,dataset,activeFamily,latest,current,toggleSidebar,chooseFamily,openProject,go,download,start,saveVersion};
}
export type LaboratoryContext=ReturnType<typeof useLaboratory>;








