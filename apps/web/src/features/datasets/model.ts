import type {Architecture,Family} from '../architectures/model';
import {normalizeArchitecture} from '../architectures/model';
export type RawData={kind:'csv';columns:string[];rows:string[][]}|{kind:'images';shape:number[];samples:{pixels:number[];label?:string;group?:string}[]};
export type Preparation={train:number;validation:number;test:number;seed:number;normalization:'none'|'standard'|'minmax'|'pixels01'|'pixels11';target:string;time:string;features:string[];ordered:boolean};
export type Prepared={config:Preparation;indices:{train:number[];validation:number[];test:number[]};counts:{train:number;validation:number;test:number};stats:{mean:number;std:number;min:number;max:number}[];classes:string[];warnings:string[];architecture:Architecture};
export type Dataset={id:string;rootId:string;projectId:number;name:string;description:string;family:Family;version:number;date:string;filename:string;checksum:string;license:string;permissionConfirmed:boolean;access?:'owner'|'project';raw:RawData;prepared?:Prepared;deleted?:boolean};
export type DatasetSnapshot={id:string;name:string;version:number;checksum:string;prepared:Prepared};
export const MAX_BYTES=2*1024*1024;
export function parseCSV(text:string):RawData{
 const source=text.replace(/^\uFEFF/,'');const delimiter=source.split(/\r?\n/,1)[0].split(';').length>source.split(/\r?\n/,1)[0].split(',').length?';':',';
 const records:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false;
 for(let i=0;i<=source.length;i++){const c=source[i]??'\n';if(quoted){if(c==='"'){if(source[i+1]==='"'){cell+='"';i++}else{quoted=false;closed=true}}else cell+=c;continue}if(c==='"'&&!cell&&!closed){quoted=true;continue}if(c===delimiter||c==='\n'||c==='\r'){row.push(cell.trim());cell='';closed=false;if(c!==delimiter){if(c==='\r'&&source[i+1]==='\n')i++;if(row.some(v=>v!==''))records.push(row);row=[];if(records.length>10001)throw Error('Máximo 10.000 filas de datos.')}continue}if(closed&&!/\s/.test(c))throw Error('CSV inválido: hay caracteres después de una comilla de cierre.');cell+=c;}
 if(quoted)throw Error('CSV inválido: hay comillas sin cerrar.');
 const columns=records.shift()??[];if(!columns.length||columns.some(c=>!c)||new Set(columns).size!==columns.length)throw Error('El CSV necesita encabezados únicos y no vacíos.');if(columns.length>50)throw Error('Máximo 50 columnas.');if(!records.length)throw Error('El archivo no contiene filas de datos.');if(records.some(r=>r.length!==columns.length))throw Error('Todas las filas deben tener la misma cantidad de columnas que el encabezado.');
 return {kind:'csv',columns,rows:records};
}
export async function readDataset(file:File,family:Family):Promise<{raw:RawData;checksum:string}>{
 if(!file.size||file.size>MAX_BYTES)throw Error('Selecciona un archivo no vacío de hasta 2 MB.');
 const extension=file.name.split('.').pop()?.toLowerCase();if(!['csv','json'].includes(extension??''))throw Error('Solo se admiten CSV de series y JSON de imágenes numéricas.');
 const bytes=await file.arrayBuffer(),text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);let raw:RawData;
 if(extension==='csv'){if(family!=='RNN')throw Error('Los CSV se usan para RNN. Para CNN o GAN usa el formato JSON de imágenes.');raw=parseCSV(text)}else{
  if(family==='RNN')throw Error('RNN utiliza un CSV de una serie temporal.');
  let value;try{value=JSON.parse(text)}catch{throw Error('El archivo JSON no tiene una sintaxis válida.')}
  if(!Array.isArray(value?.shape)||value.shape.length!==3||value.shape.some((n:number,i:number)=>!Number.isInteger(n)||n<1||n>(i===2?4:64)))throw Error('shape debe indicar [alto, ancho, canales], con lados de 1–64 y canales de 1–4.');
  const size=value.shape.reduce((a:number,b:number)=>a*b,1);if(!Array.isArray(value.samples)||!value.samples.length||value.samples.length>10000||value.samples.length*size>1000000)throw Error('Se requieren 1–10.000 muestras y como máximo un millón de valores de píxel.');
  if(value.samples.some((s:any)=>!Array.isArray(s?.pixels)||s.pixels.length!==size||s.pixels.some((n:unknown)=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>255)||(s.label!==undefined&&(typeof s.label!=='string'||!s.label.trim()||s.label.length>80))||(s.group!==undefined&&(typeof s.group!=='string'||!s.group.trim()||s.group.length>80))))throw Error('Cada muestra debe tener pixels con la longitud indicada y valores de 0 a 255. label y group, si existen, deben ser textos no vacíos de hasta 80 caracteres.');
  raw={kind:'images',shape:value.shape,samples:value.samples.map((s:any)=>({pixels:s.pixels,...(s.label!==undefined?{label:s.label.trim()}:{}),...(s.group!==undefined?{group:s.group.trim()}:{} )}))};
 }
 const checksum=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');return {raw,checksum};
}
export function quality(raw:RawData){
 const keys=raw.kind==='csv'?raw.rows.map(r=>JSON.stringify(r)):raw.samples.map(s=>JSON.stringify(s.pixels));
 const histogram=new Map<string,number>();if(raw.kind==='images')for(const s of raw.samples){const label=s.label??'Sin etiqueta';histogram.set(label,(histogram.get(label)??0)+1)}
 return {rows:keys.length,duplicates:keys.length-new Set(keys).size,missing:raw.kind==='csv'?raw.rows.reduce((n,r)=>n+r.filter(v=>v==='').length,0):0,classes:Object.fromEntries(histogram)};
}
function shuffle<T>(values:T[],seed:number){const copy=[...values];let state=seed>>>0;for(let i=copy.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=Math.floor(state/4294967296*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}return copy}
export function prepareDataset(dataset:Dataset,config:Preparation,architecture:Architecture):Prepared{
 const a=normalizeArchitecture(architecture),raw=dataset.raw,warnings:string[]=[];
 if(dataset.family!==a.family)throw Error('La familia del dataset no coincide con la arquitectura.');
 if(![config.train,config.validation,config.test].every(n=>Number.isInteger(n)&&n>0)||config.train+config.validation+config.test!==100)throw Error('Los tres porcentajes deben ser enteros positivos y sumar 100.');
 if(!Number.isInteger(config.seed)||config.seed<0||config.seed>4294967295)throw Error('La semilla debe ser un entero de 0 a 4294967295.');
 const indices:Prepared['indices']={train:[],validation:[],test:[]};let matrix:number[][]=[],classes:string[]=[];
 if(raw.kind==='csv'){
  if(a.family!=='RNN')throw Error('El CSV requiere una arquitectura RNN.');
  if(!config.features.length||new Set(config.features).size!==config.features.length||config.features.some(f=>!raw.columns.includes(f)))throw Error('Selecciona al menos una columna de entrada válida.');
  if(!raw.columns.includes(config.target))throw Error('Selecciona una columna objetivo.');
  if(config.features.includes(config.target))throw Error('La columna objetivo no puede ser también una característica.');
  if(config.features.length!==a.input![1]||a.outputUnits!==1||a.outputActivation!=='Lineal')throw Error('El CSV de regresión necesita tantas características como la entrada RNN, una salida y activación Lineal.');
  const featureIds=config.features.map(f=>raw.columns.indexOf(f)),targetId=raw.columns.indexOf(config.target);
  const used=[...featureIds,targetId];if(raw.rows.some(row=>used.some(i=>row[i]===''||!Number.isFinite(Number(row[i]))||Math.abs(Number(row[i]))>1e12)))throw Error('Entradas y objetivo deben ser numéricos entre −10¹² y 10¹² y no contener valores faltantes. Corrige el archivo y crea una versión nueva.');
  let order=raw.rows.map((_,i)=>i);
  if(config.time){const t=raw.columns.indexOf(config.time);if(t<0||config.features.includes(config.time)||config.target===config.time)throw Error('La columna temporal debe ser válida y distinta de entradas y objetivo.');const values=raw.rows.map(r=>{if(!r[t])return NaN;const n=Number(r[t]);return Number.isFinite(n)?n:/^\d{4}-\d{2}-\d{2}T/.test(r[t])?Date.parse(r[t]):NaN});if(values.some(n=>!Number.isFinite(n))||new Set(values).size!==values.length)throw Error('Los tiempos deben ser únicos y numéricos o fechas ISO con hora.');order.sort((i,j)=>values[i]-values[j])}else if(!config.ordered)throw Error('Confirma el orden cronológico de la única serie del archivo, o selecciona una columna temporal.');
  const first=Math.floor(order.length*config.train/100),second=first+Math.floor(order.length*config.validation/100);
  indices.train=order.slice(0,first);indices.validation=order.slice(first,second);indices.test=order.slice(second);
  matrix=raw.rows.map(r=>featureIds.map(i=>Number(r[i])));
  if(!['none','standard','minmax'].includes(config.normalization))throw Error('Selecciona una normalización numérica para RNN.');
  if(quality(raw).duplicates)warnings.push('Hay filas idénticas. Se conservan porque una serie temporal puede repetir valores; revisa su procedencia.');
 }else{
  if(a.family==='RNN'||raw.shape.some((n,i)=>n!==a.input![i]))throw Error('La forma de las imágenes no coincide con la entrada/imagen objetivo del diseñador.');
  if(!['none','pixels01','pixels11'].includes(config.normalization))throw Error('Selecciona una escala de píxeles válida.');
  if(a.family==='GAN'&&config.normalization!==(a.outputActivation==='Tanh'?'pixels11':'pixels01'))throw Error('GAN requiere escala −1 a 1 para Tanh, o 0 a 1 para Sigmoid.');
  if(a.family==='CNN'){
   if(raw.samples.some(s=>!s.label))throw Error('CNN necesita una etiqueta en cada muestra.');
   classes=[...new Set(raw.samples.map(s=>s.label!))].sort();if(classes.length<2)throw Error('CNN necesita al menos dos clases.');
   if(!((a.outputActivation==='Softmax'&&a.outputUnits===classes.length)||(a.outputActivation==='Sigmoid'&&a.outputUnits===1&&classes.length===2)))throw Error('CNN necesita Softmax con una salida por clase, o una salida Sigmoid para dos clases.');
  }
  // Union exact duplicates and declared groups before assigning partitions.
  const parent=raw.samples.map((_,i)=>i);const find=(i:number):number=>{let r=i;while(parent[r]!==r)r=parent[r];while(parent[i]!==i){const next=parent[i];parent[i]=r;i=next}return r};
  const pixelMap=new Map<string,number>(),groupMap=new Map<string,number>(),labelMap=new Map<string,string>();
  raw.samples.forEach((s,i)=>{const key=JSON.stringify(s.pixels);if(a.family==='CNN'&&labelMap.has(key)&&labelMap.get(key)!==s.label)throw Error('Hay imágenes idénticas con etiquetas contradictorias.');labelMap.set(key,s.label??'');for(const [map,k] of [[pixelMap,key],[groupMap,s.group]] as const){if(!k)continue;const prior=map.get(k);if(prior!==undefined)parent[find(i)]=find(prior);else map.set(k,i)}});
  const buckets=new Map<number,number[]>();raw.samples.forEach((_,i)=>{const key=find(i);buckets.set(key,[...buckets.get(key)??[],i])});
  const groups=shuffle([...buckets.values()],config.seed);if(groups.length<3)throw Error('Se necesitan al menos tres grupos independientes para separar entrenamiento, validación y prueba.');
  const first=Math.min(groups.length-2,Math.max(1,Math.floor(groups.length*config.train/100))),second=Math.min(groups.length-1,Math.max(first+1,first+Math.floor(groups.length*config.validation/100)));
  indices.train=groups.slice(0,first).flat();indices.validation=groups.slice(first,second).flat();indices.test=groups.slice(second).flat();
  warnings.push('Los porcentajes se aplican a grupos independientes; la proporción de muestras puede variar. Los grupos deben representar sujetos u objetos relacionados.');
  if(a.family==='CNN'){for(const [split,ids] of Object.entries(indices)){const present=new Set(ids.map(i=>raw.samples[i].label));if(present.size<classes.length){if(split==='train')throw Error('Entrenamiento no contiene todas las clases. Cambia la semilla, la distribución o añade datos.');warnings.push(`${split==='validation'?'Validación':'Prueba'} no contiene todas las clases; sus métricas no serán representativas.`)}}const frequencies=Object.values(quality(raw).classes);if(Math.max(...frequencies)>3*Math.min(...frequencies))warnings.push('Se detectó desbalance de clases superior a 3:1. Considera métricas por clase y revisa el muestreo.');}
 }
 const stats=config.normalization==='standard'||config.normalization==='minmax'?config.features.map((_,j)=>{const values=indices.train.map(i=>matrix[i][j]),mean=values.reduce((a,b)=>a+b,0)/values.length;return {mean,std:Math.sqrt(values.reduce((s,v)=>s+(v-mean)**2,0)/values.length),min:Math.min(...values),max:Math.max(...values)}}):[];
 const counts={train:indices.train.length,validation:indices.validation.length,test:indices.test.length};
 if(raw.kind==='csv')for(const key of Object.keys(counts) as (keyof typeof counts)[])counts[key]-=a.input![0];
 if(Object.values(counts).some(n=>n<1))throw Error(raw.kind==='csv'?'Cada conjunto necesita más filas que pasos temporales. Reduce la ventana o aumenta los datos/porcentajes.':'Cada conjunto necesita al menos una muestra.');
 if(raw.kind==='csv'&&Object.values(counts).reduce((a,b)=>a+b,0)*a.input![0]*config.features.length>1000000)throw Error('La preparación supera un millón de valores en ventanas. Reduce los pasos, columnas o filas para trabajar en el navegador.');
 if(raw.kind==='csv'&&stats.some(s=>s.std===0))warnings.push('Alguna entrada es constante en entrenamiento; se transforma a cero cuando corresponda.');
 return {config,indices,counts,stats,classes,warnings,architecture:a};
}
export function compatibility(dataset:Dataset,architecture:Architecture){if(dataset.deleted)return 'El dataset está en la papelera.';if(!dataset.prepared)return 'Prepara y valida una versión antes de seleccionarla.';try{const next=prepareDataset(dataset,dataset.prepared.config,architecture);if(JSON.stringify(next.counts)!==JSON.stringify(dataset.prepared.counts))return 'La arquitectura cambió; prepara una versión nueva con la ventana actual.';return ''}catch(e){return e instanceof Error?e.message:'Dataset incompatible.'}}
export function processedData(dataset:Dataset){
 const p=dataset.prepared;if(!p)throw Error('Primero prepara una versión.');const raw=dataset.raw;
 const transform=(value:number,j:number)=>{const s=p.stats[j];switch(p.config.normalization){case 'standard':return s.std?(value-s.mean)/s.std:0;case 'minmax':return s.max!==s.min?(value-s.min)/(s.max-s.min):0;case 'pixels01':return value/255;case 'pixels11':return value/127.5-1;default:return value}};
 return Object.fromEntries(Object.entries(p.indices).map(([split,ids])=>[split,raw.kind==='images'?ids.map(i=>({sourceIndex:i,input:raw.samples[i].pixels.map(v=>transform(v,0)),label:raw.samples[i].label,shape:raw.shape})):ids.slice(p.architecture.input![0]).map((targetIndex,end)=>({sourceIndex:targetIndex,input:ids.slice(end,end+p.architecture.input![0]).map(i=>p.config.features.map((f,j)=>transform(Number(raw.rows[i][raw.columns.indexOf(f)]),j))),target:Number(raw.rows[targetIndex][raw.columns.indexOf(p.config.target)])}))]));
}
