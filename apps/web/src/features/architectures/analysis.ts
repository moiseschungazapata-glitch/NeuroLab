import type {Architecture,Family} from './model';
export type ShapeRow={id:string;layerId?:number;name:string;input:number[];output:number[];parameters:number;branch:string};
const recurrent=['SimpleRNN','LSTM','GRU'];
export const shapeLabel=(shape:number[])=>shape.join(' × ');
export function normalizeArchitecture(a:Architecture):Architecture{return {...a,input:a.input??(a.family==='RNN'?[24,1]:[28,28,1]),outputUnits:a.outputUnits??(a.family==='CNN'?10:1),outputActivation:a.outputActivation??(a.family==='CNN'?'Softmax':a.family==='GAN'?'Tanh':'Lineal'),layers:a.layers.map(l=>({...l,...(l.kind==='Conv2D'?{stride:l.stride??1,padding:l.padding??'same'}:l.kind==='MaxPooling2D'?{stride:l.stride??l.units,padding:l.padding??'valid'}:{})}))}}
export function normalizeBank(bank:Record<Family,Architecture>){return Object.fromEntries(Object.entries(bank).map(([f,a])=>[f,normalizeArchitecture(a)])) as Record<Family,Architecture>}
const integer=(n:number,min:number,max:number)=>Number.isInteger(n)&&n>=min&&n<=max;
const size=(shape:number[])=>shape.reduce((a,b)=>a*b,1);
export function analyzeArchitecture(raw:Architecture){
 const a=normalizeArchitecture(raw),errors:string[]=[],rows:ShapeRow[]=[];
 const add=(name:string,input:number[],output:number[],parameters=0,branch='Modelo',layerId?:number)=>rows.push({id:branch+'-'+rows.length,layerId,name,input:[...input],output:[...output],parameters,branch});
 const input=a.input!;
 if(input.length!==(a.family==='RNN'?2:3)||input.some((n,i)=>!integer(n,1,i===2?4:512)))errors.push(a.family==='RNN'?'La entrada RNN necesita pasos y características enteros entre 1 y 512.':'La imagen necesita alto y ancho entre 1 y 512, y entre 1 y 4 canales.');
 if(!a.layers.length)errors.push('Agrega al menos una capa.');
 if(a.layers.length>30)errors.push('El diseñador admite como máximo 30 bloques editables.');
 if(new Set(a.layers.map(l=>l.id)).size!==a.layers.length)errors.push('Cada bloque debe tener un identificador único.');
 if(a.layers.some(l=>!integer(l.units,1,1024)))errors.push('Revisa las capas: los valores deben ser enteros entre 1 y 1024.');
 const acts=['ReLU','Tanh','Sigmoid','LeakyReLU'];
 if(a.layers.some(l=>l.kind!=='MaxPooling2D'&&!acts.includes(l.activation)))errors.push('Hay una activación de capa no admitida.');
 if(a.family==='GAN'){
  if(!integer(a.latent,2,512))errors.push('El vector latente debe tener entre 2 y 512 dimensiones.');
  if(!['Tanh','Sigmoid'].includes(a.outputActivation!))errors.push('La salida del generador debe usar Tanh o Sigmoid.');
  if(!a.layers.some(l=>l.kind==='Generador · Dense')||!a.layers.some(l=>l.kind==='Discriminador · Dense'))errors.push('GAN necesita capas en el generador y en el discriminador.');
  if(a.layers.some(l=>!['Generador · Dense','Discriminador · Dense'].includes(l.kind)))errors.push('GAN solo admite bloques Dense de generador o discriminador.');
 }else{
  if(!integer(a.outputUnits!,1,1024))errors.push('La salida necesita entre 1 y 1024 unidades enteras.');
  if(!['Lineal','ReLU','Tanh','Sigmoid','Softmax'].includes(a.outputActivation!))errors.push('Selecciona una activación de salida válida.');
  if(a.outputActivation==='Softmax'&&a.outputUnits!<2)errors.push('Softmax necesita al menos 2 unidades de salida.');
 }
 if(a.family==='RNN'){
  if(!a.layers.some(l=>recurrent.includes(l.kind)))errors.push('RNN necesita al menos una capa recurrente.');
  let dense=false;for(const l of a.layers){if(l.kind==='Dense')dense=true;else if(!recurrent.includes(l.kind))errors.push('Bloque no compatible con RNN.');else if(dense)errors.push('Coloca las capas recurrentes antes de los bloques Dense.');}
 }else if(a.family==='CNN'){
  if(!a.layers.some(l=>l.kind==='Conv2D'))errors.push('CNN necesita al menos una capa Conv2D.');
  let dense=false;for(const l of a.layers){if(l.kind==='Dense')dense=true;else if(!['Conv2D','MaxPooling2D'].includes(l.kind))errors.push('Bloque no compatible con CNN.');else if(dense)errors.push('No puede haber convolución ni pooling después de Dense.');if(['Conv2D','MaxPooling2D'].includes(l.kind)){if(!integer(l.stride!,1,8))errors.push('El stride debe ser entero entre 1 y 8.');if(!['same','valid'].includes(l.padding!))errors.push('Padding debe ser same o valid.');if(l.kind==='Conv2D'&&![1,3,5,7].includes(l.kernel??0))errors.push('El kernel debe ser de 1, 3, 5 o 7.');if(l.kind==='MaxPooling2D'&&!integer(l.units,1,8))errors.push('El tamaño de pooling debe estar entre 1 y 8.');}}
 }
 if(errors.length)return {architecture:a,rows,errors:[...new Set(errors)],parameters:0,generatorParameters:0,discriminatorParameters:0};
 if(a.family==='GAN'){
  let current=[a.latent];for(const l of a.layers.filter(l=>l.kind==='Generador · Dense')){add(l.kind,current,[l.units],(size(current)+1)*l.units,'Generador',l.id);current=[l.units]}
  add('Dense de salida · '+a.outputActivation,current,[size(input)],(size(current)+1)*size(input),'Generador');add('Reshape',[size(input)],input,0,'Generador');
  add('Flatten',input,[size(input)],0,'Discriminador');current=[size(input)];for(const l of a.layers.filter(l=>l.kind==='Discriminador · Dense')){add(l.kind,current,[l.units],(size(current)+1)*l.units,'Discriminador',l.id);current=[l.units]}
  add('Dense de salida · Sigmoid',current,[1],size(current)+1,'Discriminador');
 }else{
  let current=[...input];
  for(let i=0;i<a.layers.length;i++){
   const l=a.layers[i];
   if(recurrent.includes(l.kind)){
    const d=current[1],u=l.units,gates=l.kind==='LSTM'?4:l.kind==='GRU'?3:1;
    const more=a.layers.slice(i+1).some(next=>recurrent.includes(next.kind));
    const next=more?[input[0],u]:[u];add(l.kind+(more?' · secuencias':''),current,next,gates*u*(d+u+1),'Modelo',l.id);current=next;
   }else if(l.kind==='Conv2D'||l.kind==='MaxPooling2D'){
    const k=l.kind==='Conv2D'?l.kernel!:l.units,s=l.stride!;
    const dimension=(n:number)=>l.padding==='same'?Math.ceil(n/s):Math.floor((n-k)/s)+1;
    const next=[dimension(current[0]),dimension(current[1]),l.kind==='Conv2D'?l.units:current[2]];
    if(next.some(n=>n<1)){errors.push(`El bloque ${i+1} reduce la imagen a una dimensión no válida.`);break}
    add(l.kind,current,next,l.kind==='Conv2D'?(k*k*current[2]+1)*l.units:0,'Modelo',l.id);current=next;
   }else if(l.kind==='Dense'){
    if(current.length>1){add('Flatten',current,[size(current)]);current=[size(current)]}
    add('Dense',current,[l.units],(size(current)+1)*l.units,'Modelo',l.id);current=[l.units];
   }
  }
  if(!errors.length){if(current.length>1){add('Flatten',current,[size(current)]);current=[size(current)]}add('Dense de salida · '+a.outputActivation,current,[a.outputUnits!],(size(current)+1)*a.outputUnits!)}
 }
 return {architecture:a,rows,errors,parameters:errors.length?0:rows.reduce((n,r)=>n+r.parameters,0),generatorParameters:rows.filter(r=>r.branch==='Generador').reduce((n,r)=>n+r.parameters,0),discriminatorParameters:rows.filter(r=>r.branch==='Discriminador').reduce((n,r)=>n+r.parameters,0)};
}
