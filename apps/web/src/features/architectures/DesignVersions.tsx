import {useState,useEffect} from 'react';
import {History,Save,RotateCcw} from 'lucide-react';
import type {Architecture} from './model';
import {validArchitecture} from './model';
import {stored} from '../../lib/storage';
type Revision={id:string;date:string;architecture:Architecture};
export function DesignVersions({projectId,architecture,onRestore,notice}:{projectId:number;architecture:Architecture;onRestore:(a:Architecture)=>void;notice:(s:string)=>void}){
 const key=`nl-design-revisions-${projectId}-${architecture.family}`;
 const [revisions,setRevisions]=useState<Revision[]>(()=>stored(key,[])),[selected,setSelected]=useState(''),[confirm,setConfirm]=useState(false);
 useEffect(()=>localStorage.setItem(key,JSON.stringify(revisions)),[key,revisions]);
 return <section className="panel design-versions"><div><History size={19}/><span><strong>Revisiones del diseño</strong><small>Copias locales independientes de los modelos entrenados.</small></span></div><div className="revision-controls"><button className="secondary" disabled={!!validArchitecture(architecture)} onClick={()=>{const id=crypto.randomUUID();setRevisions(rs=>[{id,date:new Date().toISOString(),architecture:structuredClone(architecture)},...rs]);setSelected(id);notice('Revisión del diseño guardada.')}}><Save size={14}/> Guardar revisión</button><select aria-label="Revisión guardada" value={selected} onChange={e=>{setSelected(e.target.value);setConfirm(false)}}><option value="">Seleccionar revisión…</option>{revisions.map((r,i)=><option key={r.id} value={r.id}>Revisión {revisions.length-i} · {new Intl.DateTimeFormat('es-CO',{dateStyle:'short',timeStyle:'short',timeZone:'America/Bogota'}).format(new Date(r.date))}</option>)}</select><button className="secondary" disabled={!selected} onClick={()=>setConfirm(true)}><RotateCcw size={14}/> Recuperar</button></div>{confirm&&<div className="restore-confirm" role="alert"><span>La revisión seleccionada reemplazará el borrador actual. Guarda una revisión si deseas conservarlo.</span><button className="secondary" onClick={()=>setConfirm(false)}>Cancelar recuperación</button><button className="primary" onClick={()=>{const revision=revisions.find(r=>r.id===selected);if(revision){onRestore(structuredClone(revision.architecture));notice('Revisión recuperada en el borrador.')}setConfirm(false)}}>Confirmar recuperación</button></div>}</section>
}
