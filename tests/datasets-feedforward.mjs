import assert from 'node:assert/strict';
const {chromium}=await import(process.env.NEUROLAB_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.addInitScript(()=>sessionStorage.setItem('nl-session','moiseschungazapata@gmail.com'));
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const csv='grupo,x,y,objetivo\n'+Array.from({length:72},(_,i)=>['s'+Math.floor(i/2),i,i*2,i%2?'B':'A'].join(',')).join('\n');
const catalogue=()=>page.getByRole('button',{name:'Datasets',exact:true}).click();
try{
 await page.goto('http://127.0.0.1:5173/');await catalogue();
 await page.getByRole('button',{name:'Registrar dataset',exact:true}).click();await page.keyboard.press('Escape');assert.ok(await page.getByRole('button',{name:'Registrar dataset',exact:true}).evaluate(e=>e===document.activeElement));await page.getByRole('button',{name:'Registrar dataset',exact:true}).click();
 await page.getByLabel('Nombre del dataset',{exact:true}).fill('Tabla clínica');await page.getByLabel('Familia del dataset',{exact:true}).selectOption('Feedforward');
 await page.getByLabel('Archivo CSV o JSON',{exact:true}).setInputFiles({name:'tabla.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
 await page.getByLabel('Licencia o procedencia autorizada').fill('Datos sintéticos');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Registrar archivo',exact:true}).click();
 await page.getByRole('heading',{name:'Calidad y metadatos',exact:true}).waitFor();
 assert.equal(await page.getByLabel('Tarea tabular').inputValue(),'binary');assert.equal(await page.getByLabel('Columna de grupo').inputValue(),'grupo');
 await page.getByRole('button',{name:'Ajustar entrada y salida al dataset'}).click();await page.getByRole('button',{name:'Crear versión preparada',exact:true}).click();
 await page.locator('article.dataset').filter({hasText:'v2'}).getByRole('button',{name:'Inspeccionar y preparar'}).click();
 assert.equal(await page.locator('.prepared-counts strong').evaluateAll(nodes=>nodes.reduce((n,node)=>n+Number(node.textContent),0)),72);
 await page.getByText('Codificación de clases',{exact:true}).click();await page.getByText('A → 0',{exact:true}).waitFor();
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Exportar conjuntos preparados'}).click()]);const stream=await download.createReadStream();let text='';for await(const c of stream)text+=c;const exportData=JSON.parse(text);assert.equal(exportData.splits.train[0].input.length,2);assert.ok([0,1].includes(exportData.splits.train[0].target));
 const groups=Object.values(exportData.splits).map(split=>new Set(split.map(row=>'s'+Math.floor(row.sourceIndex/2))));for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert.ok(![...groups[i]].some(v=>groups[j].has(v)));
 await page.getByRole('button',{name:'Seleccionar versión',exact:true}).click();assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('nl-dataset-selection'))['1-Feedforward']));
 await page.getByRole('button',{name:'Inspeccionar v1',exact:true}).click();await page.getByRole('button',{name:'Inspeccionar v2',exact:true}).click();
 await page.reload();await catalogue();await page.getByLabel('Filtrar datasets por familia').selectOption('Feedforward');await page.getByLabel('Estado de preparación').selectOption('Preparadas');await page.getByLabel('Buscar datasets').fill('CLINICA');assert.equal(await page.locator('article.dataset').count(),1);
 await page.locator('article.dataset').getByRole('button',{name:'Inspeccionar y preparar'}).click();assert.ok(await page.getByRole('button',{name:'Enviar a papelera'}).isDisabled());
 await page.getByRole('button',{name:'Activar modo oscuro'}).click();await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'preview-dataset-feedforward-mobile.png',fullPage:true,animations:'disabled'});await page.setViewportSize({width:320,height:800});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const integrity=await page.evaluate(async()=>{
  const store=await import('/src/features/datasets/storage.ts'),all=await store.listDatasets(),base=all.find(d=>d.prepared),original=all.find(d=>!d.prepared);
  const versions=await Promise.all([1,2].map(()=>store.writeDataset({...base,id:crypto.randomUUID(),parentId:base.id,date:new Date().toISOString()})));
  let immutable=false,referenced=false,trashOnly=false;
  try{await store.writeDataset({...base,name:'Cambio indebido'})}catch{immutable=true}
  try{await store.writeDataset({...base,deleted:true})}catch{referenced=true}
  try{await store.purgeDataset(original.id)}catch{trashOnly=true}
  const now=await store.listDatasets();for(let i=now.length;i<20;i++){const id=crypto.randomUUID();await store.writeDataset({...original,id,rootId:id,parentId:undefined})}
  const attempts=await Promise.allSettled([1,2].map(()=>{const id=crypto.randomUUID();return store.writeDataset({...original,id,rootId:id,parentId:undefined})}));
  return {versions:versions.map(d=>d.version).sort(),immutable,referenced,trashOnly,count:(await store.listDatasets()).length,blocked:attempts.every(a=>a.status==='rejected')};
 });
 assert.deepEqual(integrity,{versions:[3,4],immutable:true,referenced:true,trashOnly:true,count:20,blocked:true});
 assert.deepEqual(errors,[]);console.log('PASS: Feedforward import/preparation/encoding/export, no group overlap, selection, lineage, search, persistence, immutable atomic versions, reference protections, capacity, dark/mobile 390/320.');
}finally{await browser.close()}
