import {useEffect,useState} from 'react';
import type {Dataset} from './model';
import {listDatasets,writeDataset,purgeDataset} from './storage';
export function useDatasets(){
 const [datasets,setDatasets]=useState<Dataset[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 async function refresh(){setLoading(true);try{setDatasets(await listDatasets());setError('')}catch{setError('No se pudo abrir el almacenamiento de datasets. Comprueba que el navegador permita IndexedDB.')}finally{setLoading(false)}}
 useEffect(()=>{void refresh()},[]);
 async function persist(dataset:Dataset){try{const saved=await writeDataset(dataset);setDatasets(all=>[...all.filter(d=>d.id!==saved.id),saved]);setError('')}catch(e){throw Error(e instanceof Error?e.message:'No se pudo guardar el dataset. Comprueba el espacio disponible en el navegador.')}}
 async function purge(id:string){await purgeDataset(id);setDatasets(all=>all.filter(d=>d.id!==id))}
 return {datasets,datasetsLoading:loading,datasetsError:error,persistDataset:persist,purgeDataset:purge,refreshDatasets:refresh};
}
