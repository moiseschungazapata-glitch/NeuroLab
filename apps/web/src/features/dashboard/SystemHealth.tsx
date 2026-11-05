import {useEffect,useState} from 'react';
type Resource={usedBytes:number;totalBytes:number;percent:number};
type Snapshot={sampledAt:string;uptimeSeconds:number;cpuPercent:number;memory:Resource;disk:Resource;services:{api:string;database:string;trainingWorker:string;gpu:string}};
const percent=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
export function validSnapshot(value:unknown):value is Snapshot{
 const s=value as Snapshot|null;
 return !!s&&Number.isFinite(Date.parse(s.sampledAt))&&Number.isFinite(s.uptimeSeconds)&&s.uptimeSeconds>=0&&percent(s.cpuPercent)&&[s.memory,s.disk].every(m=>m&&percent(m.percent)&&Number.isFinite(m.usedBytes)&&Number.isFinite(m.totalBytes)&&m.usedBytes>=0&&m.totalBytes>0&&m.usedBytes<=m.totalBytes)&&s.services?.api==='available'&&s.services.database==='not_configured'&&s.services.trainingWorker==='not_configured'&&s.services.gpu==='not_measured';
}
const bytes=(n:number)=>(n/1024**3).toFixed(1)+' GiB';
export function SystemHealth(){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[state,setState]=useState<'loading'|'online'|'offline'>('loading'),[refresh,setRefresh]=useState(0);
 useEffect(()=>{
  let disposed=false,pending=false;let controller:AbortController|undefined;
  async function load(){
   if(document.hidden||pending)return;
   pending=true;controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),5000);
   try{const response=await fetch('/api/v1/dashboard/system',{signal:controller.signal,cache:'no-store'});if(!response.ok)throw Error('unavailable');const data:unknown=await response.json();if(!validSnapshot(data))throw Error('invalid');if(!disposed){setSnapshot(data);setState('online')}}catch{if(!disposed)setState('offline')}finally{clearTimeout(timeout);pending=false}
  }
  void load();const timer=setInterval(()=>void load(),15000);const visible=()=>{if(!document.hidden)void load()};document.addEventListener('visibilitychange',visible);
  return()=>{disposed=true;controller?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible)};
 },[refresh]);
 return <section className="panel system-health" aria-labelledby="system-health-title"><div className="section-title"><div><h3 id="system-health-title">Estado del sistema</h3><p>Recursos del equipo de la API de monitoreo.</p></div><button className="secondary" onClick={()=>setRefresh(n=>n+1)}>Actualizar estado</button></div><p className="system-status" role="status">{state==='loading'?'Consultando API…':state==='online'?'API de monitoreo disponible':'API de monitoreo sin conexión. Estado del servidor sin confirmar.'}</p>{snapshot&&<><p className="usage-caption">{state==='offline'?'Última lectura conservada, sin actualizar':'Última lectura'}: {new Date(snapshot.sampledAt).toLocaleString('es-PE',{timeZone:'America/Lima'})} · Actualización cada 15 s</p><div className={'resource-grid '+(state==='offline'?'stale':'')}>{[['CPU',snapshot.cpuPercent,'Uso total del procesador'],['Memoria',snapshot.memory.percent,bytes(snapshot.memory.usedBytes)+' / '+bytes(snapshot.memory.totalBytes)],['Disco',snapshot.disk.percent,bytes(snapshot.disk.usedBytes)+' / '+bytes(snapshot.disk.totalBytes)]].map(([label,value,detail])=><article key={String(label)}><span>{label}</span><strong>{Number(value).toFixed(1)}%</strong><p>{detail}</p>{state==='online'&&Number(value)>=90&&<p className="resource-warning">Uso elevado: revisa los recursos disponibles.</p>}</article>)}</div></>}<dl className="service-list"><div><dt>Base de datos</dt><dd>Sin configurar</dd></div><div><dt>Worker de entrenamiento</dt><dd>Sin configurar</dd></div><div><dt>GPU</dt><dd>Sin medición</dd></div></dl><p className="usage-caption">Proyectos y experimentos: registros de este navegador. El monitoreo no ejecuta entrenamientos. No confirma servicios todavía no implementados.</p></section>;
}
