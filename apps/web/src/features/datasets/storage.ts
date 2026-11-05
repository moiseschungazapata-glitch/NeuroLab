import type {Dataset} from './model';
function database(){return new Promise<IDBDatabase>((resolve,reject)=>{let blocked=false;const request=indexedDB.open('neurolab-datasets',1);request.onupgradeneeded=()=>request.result.createObjectStore('datasets',{keyPath:'id'});request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();if(blocked)request.result.close();else resolve(request.result)};request.onerror=()=>reject(request.error);request.onblocked=()=>{blocked=true;reject(Error('Cierra las otras pestañas para actualizar el almacenamiento.'))}})}
function assertUnreferenced(id:string){
 try{const real=JSON.parse(localStorage.getItem('nl-real-job-references')??'[]');if(!Array.isArray(real))throw Error('Referencias de trabajos reales inválidas.');if(real.includes(id))throw Error('La versión está vinculada a un entrenamiento real y se conserva para trazabilidad.');const runs=JSON.parse(localStorage.getItem('nl-runs-v2')??'[]'),models=JSON.parse(localStorage.getItem('nl-versions-v2')??'[]'),selections=JSON.parse(localStorage.getItem('nl-dataset-selection')??'{}');if(!Array.isArray(runs)||!Array.isArray(models)||!selections||typeof selections!=='object')throw Error('Registros locales inválidos.');if([...runs,...models].some(r=>r.datasetId===id||r.datasetSnapshot?.id===id)||Object.values(selections).includes(id))throw Error('La versión está seleccionada o vinculada a un experimento/modelo y no se puede borrar.')}catch(e){throw e instanceof Error?e:Error('No se pudieron comprobar las referencias locales.')}
}
export async function listDatasets(){const db=await database();try{return await new Promise<Dataset[]>((resolve,reject)=>{const tx=db.transaction('datasets','readonly'),request=tx.objectStore('datasets').getAll();tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}finally{db.close()}}
export async function writeDataset(value:Dataset){
 const db=await database();try{return await new Promise<Dataset>((resolve,reject)=>{
  const tx=db.transaction('datasets','readwrite'),store=tx.objectStore('datasets'),request=store.getAll();let saved=value;
  request.onsuccess=()=>{try{
   const all=request.result as Dataset[],existing=all.find(d=>d.id===value.id);
   if(existing){const {deleted:before,...original}=existing,{deleted:after,...next}=value;if(JSON.stringify(original)!==JSON.stringify(next))throw Error('Las versiones son inmutables. Crea una versión nueva para cambiar sus datos o preparación.');if(value.deleted&&!existing.deleted)assertUnreferenced(value.id);store.put(value)}else{
    if(all.length>=20)throw Error('Límite local: 20 versiones, incluida la papelera.');
    const lineage=all.filter(d=>d.rootId===value.rootId);
    if(lineage.some(d=>d.projectId!==value.projectId||d.family!==value.family))throw Error('El linaje no pertenece al mismo proyecto y familia.');
    if(!lineage.length&&value.rootId!==value.id)throw Error('El linaje de origen ya no está disponible. Registra el archivo como un dataset nuevo.');
    if(value.parentId&&!lineage.some(d=>d.id===value.parentId&&!d.deleted))throw Error('La versión de origen no está disponible. Actualiza el catálogo.');
    saved={...value,version:lineage.length?Math.max(...lineage.map(d=>d.version))+1:1};store.add(saved);
   }
  }catch(e){reject(e);tx.abort()}};
  tx.oncomplete=()=>resolve(saved);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??Error('No se pudo guardar el dataset.'));
 })}finally{db.close()}
}
export async function purgeDataset(id:string){const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('datasets','readwrite'),store=tx.objectStore('datasets'),request=store.get(id);request.onsuccess=()=>{try{if(!request.result?.deleted)throw Error('Solo se pueden eliminar definitivamente versiones en papelera.');assertUnreferenced(id);store.delete(id)}catch(e){reject(e);tx.abort()}};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??Error('No se pudo eliminar la versión.'))})}finally{db.close()}}
