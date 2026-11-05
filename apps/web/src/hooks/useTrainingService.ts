import {useCallback,useEffect,useRef,useState} from 'react';
import {stored} from '../lib/storage';
import {terminal,type RealJob} from '../features/training/service';

export function useTrainingService(){
 const [jobs,setJobs]=useState<RealJob[]>([]),[selected,setSelected]=useState(()=>{const id=stored<unknown>('nl-real-job',null);return typeof id==='string'?id:''}),[error,setError]=useState(''),[online,setOnline]=useState(false),[engineReady,setEngineReady]=useState(false),[streamState,setStreamState]=useState('Sin trabajo seleccionado'),[busy,setBusy]=useState(false);
 const capability=useRef(''),sessionPromise=useRef<Promise<string>|null>(null),selectedRef=useRef(selected);selectedRef.current=selected;
 const pendingSubmission=useRef<{body:string;key:string}|null>(null);
 const session=useCallback(async()=>{
  if(capability.current)return capability.current;
  if(!sessionPromise.current)sessionPromise.current=(async()=>{const response=await fetch('/api/v1/training/session',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('La API de entrenamiento no está disponible.');const data=await response.json();if(typeof data.token!=='string')throw Error('Respuesta de sesión inválida.');capability.current=data.token;setEngineReady(data.engineReady===true);return data.token})().finally(()=>{sessionPromise.current=null});
  return sessionPromise.current;
 },[]);
 const request=useCallback(async(path:string,init:RequestInit={})=>{
  for(let attempt=0;attempt<2;attempt++){
   const token=await session();const response=await fetch('/api/v1'+path,{...init,cache:'no-store',headers:{...init.headers,Authorization:'Bearer '+token},signal:init.signal??AbortSignal.timeout(15000)});
   if(response.status===401&&attempt===0){capability.current='';continue}
   if(!response.ok){let message='No se pudo completar la operación de entrenamiento.';try{const data=await response.json();if(typeof data.detail==='string')message=data.detail}catch{/* No sensitive response body is displayed. */}throw Object.assign(Error(message),{status:response.status})}
   setOnline(true);return response;
  }throw Error('Actualiza la sesión de entrenamiento.');
 },[session]);
 const upsert=useCallback((job:RealJob)=>setJobs(previous=>{const old=previous.find(j=>j.id===job.id);if(old&&old.eventId>job.eventId)return previous;return [job,...previous.filter(j=>j.id!==job.id)].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))}),[]);
 const refresh=useCallback(async()=>{try{const response=await request('/training-jobs'),data:RealJob[]=await response.json();setJobs(previous=>data.map(job=>{const old=previous.find(j=>j.id===job.id);return old&&old.eventId>job.eventId?old:job}));setError('');if(!selectedRef.current&&data.length)setSelected(data[0].id)}catch{setOnline(false);setError('No se pudo consultar la API de entrenamiento. Los datos anteriores pueden estar desactualizados.')}},[request]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),5000);return()=>clearInterval(timer)},[refresh]);
 useEffect(()=>{try{localStorage.setItem('nl-real-job',JSON.stringify(selected))}catch{/* Selection does not affect the server job. */}},[selected]);
 useEffect(()=>{if(!jobs.length)return;try{const saved=stored<unknown>('nl-real-job-references',[]),ids=Array.isArray(saved)?saved.filter((id):id is string=>typeof id==='string'):[];localStorage.setItem('nl-real-job-references',JSON.stringify([...new Set([...ids,...jobs.map(j=>j.dataset.id)])]))}catch{/* References remain available in memory. */}},[jobs]);
 useEffect(()=>{
  if(!selected){setStreamState('Sin trabajo seleccionado');return}
  let stopped=false;let controller:AbortController|undefined;let watchdog:ReturnType<typeof setTimeout>|undefined;
  const pause=()=>new Promise<void>(resolve=>setTimeout(resolve,1200));
  async function watch(){
   while(!stopped){
    try{
     const snapshot:RealJob=await(await request('/training-jobs/'+selected)).json();if(stopped)return;upsert(snapshot);if(terminal(snapshot.state)){setStreamState('Trabajo finalizado · estado recuperado desde API');return}
     controller=new AbortController();setStreamState('Conectando eventos…');
     const response=await request('/training-jobs/'+selected+'/events',{signal:controller.signal,headers:{'Last-Event-ID':String(snapshot.eventId)}});if(!response.body)throw Error('Sin canal de eventos.');
     const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',finished=false;setStreamState('Eventos conectados');
     try{while(!stopped){clearTimeout(watchdog);watchdog=setTimeout(()=>controller?.abort(),25000);const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true});const frames=buffer.split('\n\n');buffer=frames.pop()??'';for(const frame of frames){const data=frame.split('\n').find(line=>line.startsWith('data: '));if(data){const job:RealJob=JSON.parse(data.slice(6));if(job.id===selected){upsert(job);finished=terminal(job.state)}}}if(finished)break}}finally{clearTimeout(watchdog);await reader.cancel().catch(()=>{});controller.abort()}
     if(finished){if(!stopped)setStreamState('Trabajo finalizado · eventos confirmados');return}
    }catch(e){if(!stopped){if((e as {status?:number}).status===404){setSelected('');setStreamState('El trabajo no está disponible en este servidor.');return}setOnline(false);setStreamState('Reconectando · se recuperará el estado desde API')}}
    if(!stopped)await pause();
   }
  }void watch();return()=>{stopped=true;controller?.abort();clearTimeout(watchdog)};
 },[selected,request,upsert]);
 async function submit(projectId:number,payload:unknown){setBusy(true);setError('');const body=JSON.stringify(payload);if(pendingSubmission.current?.body!==body)pendingSubmission.current={body,key:crypto.randomUUID()};const submission=pendingSubmission.current;try{const job:RealJob=await(await request('/projects/'+projectId+'/training-jobs',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':submission.key},body})).json();pendingSubmission.current=null;upsert(job);setSelected(job.id);return job}catch(e){const message=e instanceof TypeError?'La conexión se interrumpió. Reintenta con la misma configuración para recuperar el envío sin duplicarlo.':e instanceof Error?e.message:'No se pudo enviar el trabajo.';setError(message);throw Error(message)}finally{setBusy(false)}}
 async function action(id:string,action:'cancel'|'retry'){setBusy(true);setError('');try{const job:RealJob=await(await request('/training-jobs/'+id+'/'+action,{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()}})).json();upsert(job);setSelected(job.id)}catch(e){setError(e instanceof Error?e.message:'No se pudo completar la acción.')}finally{setBusy(false)}}
 async function download(job:RealJob,name:string){try{const response=await request('/training-jobs/'+job.id+'/artifacts/'+encodeURIComponent(name));const url=URL.createObjectURL(await response.blob()),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){setError(e instanceof Error?e.message:'No se pudo descargar el modelo.')}}
 return {jobs,job:jobs.find(j=>j.id===selected),selected,setSelected,error,online,engineReady,streamState,busy,refresh,submit,action,download};
}
