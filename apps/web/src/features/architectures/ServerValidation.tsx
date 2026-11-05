import {useEffect,useRef,useState} from 'react';
import {analyzeArchitecture,type Architecture} from './model';

export function ServerValidation({architecture}:{architecture:Architecture}){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
 const controller=useRef<AbortController|null>(null),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort()}},[]);
 async function validate(){
  const analysis=analyzeArchitecture(architecture);if(analysis.errors.length)return;
  setBusy(true);setFailed(false);setMessage('Validando en servidor…');controller.current=new AbortController();
  const timer=setTimeout(()=>controller.current?.abort(),5000);
  try{
   const response=await fetch('/api/v1/architectures/validate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(analysis.architecture),signal:controller.current.signal});
   if(!response.ok)throw Error('No se pudo validar en el servidor. Comprueba que la API esté disponible.');
   const data=await response.json();
   if(data.valid!==true||data.engine!=='analytic'||data.parameters!==analysis.parameters)throw Error('El servidor no confirmó el diseño y su conteo. Revisa la configuración o la versión de la API.');
   if(mounted.current)setMessage('Servidor: diseño válido · '+data.parameters.toLocaleString('es-PE')+' parámetros. Validación analítica; no se ha construido ni entrenado TensorFlow.');
  }catch(e){if(mounted.current){setFailed(true);setMessage(e instanceof Error&&e.name!=='AbortError'?e.message:'No se pudo conectar con la API. Puedes reintentar.')}}finally{clearTimeout(timer);if(mounted.current)setBusy(false)}
 }
 return <section className="panel server-validation"><button className="secondary" disabled={busy||!!analyzeArchitecture(architecture).errors.length} onClick={()=>void validate()}>Validar en servidor</button><p role={failed?'alert':'status'}>{message||'Comprobación independiente de formas y parámetros mediante la API Python local.'}</p></section>;
}
