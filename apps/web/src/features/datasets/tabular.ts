import type {Architecture} from '../architectures/model';
import type {RawData,Preparation,Prepared} from './model';

export function prepareTabular(raw:Extract<RawData,{kind:'csv'}>,config:Preparation,a:Architecture){
 const warnings:string[]=[],task=config.task??'regression';
 if(!['regression','binary','multiclass'].includes(task))throw Error('Selecciona una tarea tabular válida.');
 if(!config.features.length||new Set(config.features).size!==config.features.length||config.features.some(f=>!raw.columns.includes(f)))throw Error('Selecciona columnas de entrada válidas y distintas.');
 if(!raw.columns.includes(config.target)||config.features.includes(config.target))throw Error('El objetivo debe existir y ser distinto de las entradas.');
 if(config.features.length!==a.input![0])throw Error('La cantidad de columnas debe coincidir con las características de entrada Feedforward.');
 if(!['none','standard','minmax'].includes(config.normalization))throw Error('Selecciona una normalización numérica para Feedforward.');
 const featureIds=config.features.map(f=>raw.columns.indexOf(f)),targetId=raw.columns.indexOf(config.target);
 const groupId=config.group?raw.columns.indexOf(config.group):-1;
 if(config.group&&(groupId<0||config.features.includes(config.group)||config.group===config.target))throw Error('El grupo debe ser una columna distinta de las entradas y el objetivo.');
 const matrix=raw.rows.map(row=>featureIds.map(i=>{const value=Number(row[i]);if(!row[i].trim()||!Number.isFinite(value)||Math.abs(value)>1e12)throw Error('Las entradas deben ser numéricas, sin valores faltantes y entre −10¹² y 10¹².');return value}));
 const labels=raw.rows.map(r=>r[targetId]);let classes:string[]=[];
 if(task==='regression'){
  if(a.outputUnits!==1||a.outputActivation!=='Lineal')throw Error('Regresión Feedforward necesita una salida Lineal.');
  if(labels.some(v=>!v.trim()||!Number.isFinite(Number(v))||Math.abs(Number(v))>1e12))throw Error('El objetivo de regresión debe ser numérico y no contener valores faltantes.');
 }else{
  if(labels.some(v=>!v.trim()||v.length>80))throw Error('Cada fila necesita una etiqueta de hasta 80 caracteres.');
  classes=[...new Set(labels)].sort();
  if(task==='binary'&&(classes.length!==2||a.outputUnits!==1||a.outputActivation!=='Sigmoid'))throw Error('Clasificación binaria necesita dos clases y una salida Sigmoid.');
  if(task==='multiclass'&&(classes.length<2||a.outputUnits!==classes.length||a.outputActivation!=='Softmax'))throw Error('Clasificación multiclase necesita Softmax con una salida por clase.');
 }
 const parent=raw.rows.map((_,i)=>i),find=(i:number):number=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i};
 const keys=new Map<string,number>(),groups=new Map<string,number>();let duplicates=0;
 matrix.forEach((values,i)=>{
  const key=JSON.stringify(values),prior=keys.get(key);
  if(prior!==undefined){duplicates++;if(task!=='regression'&&labels[prior]!==labels[i])throw Error('Hay entradas idénticas con etiquetas contradictorias.');parent[find(i)]=find(prior)}else keys.set(key,i);
  if(groupId>=0){const group=raw.rows[i][groupId];if(!group.trim())throw Error('La columna de grupo no puede tener valores vacíos.');const before=groups.get(group);if(before!==undefined)parent[find(i)]=find(before);else groups.set(group,i)}
 });
 const buckets=new Map<number,number[]>();raw.rows.forEach((_,i)=>{const key=find(i);const bucket=buckets.get(key)??[];bucket.push(i);buckets.set(key,bucket)});
 const shuffled=[...buckets.values()];let state=config.seed>>>0;
 for(let i=shuffled.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=Math.floor(state/4294967296*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]}
 if(shuffled.length<3)throw Error('Se necesitan al menos tres grupos independientes para separar los datos.');
 const first=Math.min(shuffled.length-2,Math.max(1,Math.floor(shuffled.length*config.train/100))),second=Math.min(shuffled.length-1,Math.max(first+1,first+Math.floor(shuffled.length*config.validation/100)));
 const indices:Prepared['indices']={train:shuffled.slice(0,first).flat(),validation:shuffled.slice(first,second).flat(),test:shuffled.slice(second).flat()};
 if(task!=='regression'){
  const counts=classes.map(c=>labels.filter(v=>v===c).length);if(Math.max(...counts)>3*Math.min(...counts))warnings.push('Las clases tienen un desbalance superior a 3:1.');
  for(const [split,ids] of Object.entries(indices)){if(new Set(ids.map(i=>labels[i])).size<classes.length){if(split==='train')throw Error('Entrenamiento no contiene todas las clases. Revisa la semilla, los grupos o los datos.');warnings.push(`Faltan clases en ${split==='validation'?'validación':'prueba'}.`)}}
 }
 if(duplicates)warnings.push('Las entradas duplicadas se mantienen juntas para evitar filtración entre conjuntos.');
 warnings.push('Separación determinista por grupos; los porcentajes efectivos de filas pueden variar. Declara sujetos relacionados mediante la columna de grupo. No se garantiza estratificación.');
 return {matrix,classes,indices,warnings};
}
