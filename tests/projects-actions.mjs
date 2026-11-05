import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.NEUROLAB_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.addInitScript(()=>sessionStorage.setItem('nl-session','moiseschungazapata@gmail.com'));
page.on('dialog',d=>d.accept());
const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function open(name){await page.getByRole('button',{name:'Proyectos',exact:false}).first().click();await page.locator('.project-card').filter({has:page.getByRole('heading',{name,exact:true})}).click()}
try{
 await page.goto('http://127.0.0.1:5173/');await open('Clasificación de imágenes');
 await page.getByLabel('Documento del proyecto').fill('Borrador recuperable del proyecto.');
 await page.getByRole('button',{name:'Vista general',exact:true}).click();await open('Clasificación de imágenes');
 assert.equal(await page.getByLabel('Documento del proyecto').inputValue(),'Borrador recuperable del proyecto.');
 await page.reload();await open('Clasificación de imágenes');
 assert.equal(await page.getByLabel('Documento del proyecto').inputValue(),'Borrador recuperable del proyecto.');
 await page.getByRole('button',{name:'Descartar borrador'}).click();assert.equal(await page.getByLabel('Documento del proyecto').inputValue(),'');
 await page.getByRole('button',{name:'Editar proyecto',exact:true}).click();
 await page.getByLabel('Justificación de la familia').fill('Las convoluciones aprovechan la estructura espacial.');
 await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
 await page.getByLabel('Documento del proyecto').fill('Documento definitivo de visión.');await page.getByRole('button',{name:'Guardar documentación'}).click();
 await page.getByRole('button',{name:'Archivar proyecto',exact:true}).click();await page.getByRole('button',{name:'Conservar activo'}).click();
 await page.getByRole('button',{name:'Archivar proyecto',exact:true}).click();await page.getByRole('button',{name:'Confirmar archivado'}).click();
 await page.getByRole('tab',{name:'Arquitectura',exact:true}).click();await page.getByRole('button',{name:'Abrir diseñador',exact:true}).click();
 await page.getByRole('button',{name:'Probar arquitectura'}).click();await page.getByRole('status').filter({hasText:'Reactiva el proyecto'}).waitFor();
 await open('Clasificación de imágenes');await page.getByRole('button',{name:'Reactivar proyecto',exact:true}).click();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar proyecto JSON'}).click();
 const download=await downloadPromise;const exported=JSON.parse(await fs.readFile(await download.path(),'utf8'));
 assert.equal(exported.project.id,1);assert.equal(exported.project.documentation,'Documento definitivo de visión.');assert.equal(exported.runs.length,3);assert.ok(exported.runs.every(r=>r.projectId===1));assert.equal(exported.project.status,'En desarrollo');
 await page.getByRole('button',{name:'Duplicar proyecto'}).click();await page.getByLabel('Nombre de la copia').fill('Predicción de demanda');await page.getByRole('button',{name:'Crear copia'}).click();await page.getByRole('alert').filter({hasText:'Ya existe'}).waitFor();
 await page.getByLabel('Nombre de la copia').fill('Visión independiente');await page.getByRole('button',{name:'Crear copia'}).click();
 await page.getByRole('heading',{name:'Visión independiente',exact:true}).waitFor();
 assert.equal(await page.getByLabel('Documento del proyecto').inputValue(),'Documento definitivo de visión.');
 const copy=await page.evaluate(()=>JSON.parse(localStorage.getItem('nl-projects')).find(p=>p.name==='Visión independiente'));
 assert.equal(copy.members.length,1);assert.equal(copy.status,'Exploración');assert.equal(copy.history.length,1);
 await page.getByRole('tab',{name:'Entrenamientos',exact:true}).click();await page.getByText('Aún no hay ejecuciones vinculadas a este proyecto.',{exact:true}).waitFor();
 await page.getByRole('tab',{name:'Arquitectura',exact:true}).click();await page.getByRole('button',{name:'Abrir diseñador',exact:true}).click();
 await page.getByRole('button',{name:'Agregar capa'}).click();
 const bank=await page.evaluate(()=>JSON.parse(localStorage.getItem('nl-project-architectures-v3')));assert.notDeepEqual(bank[copy.id].CNN,bank[1].CNN);
 // Simulate a browser quota failure only for project persistence.
 await open('Visión independiente');await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='nl-projects')throw new DOMException('full','QuotaExceededError');return original.call(this,k,v)}});
 await page.getByLabel('Documento del proyecto').fill('Cambio en memoria');await page.getByRole('button',{name:'Guardar documentación'}).click();await page.getByRole('alert').filter({hasText:'No se pudieron guardar'}).waitFor();
 await page.reload();await open('Visión independiente');assert.equal(await page.getByLabel('Documento del proyecto').inputValue(),'Cambio en memoria');await page.getByRole('button',{name:'Guardar documentación'}).click();
 await page.getByRole('button',{name:'Activar modo oscuro'}).click();await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'preview-project-actions-mobile.png',fullPage:true,animations:'disabled'});
 assert.deepEqual(errors,[]);
 console.log('PASS: draft navigation/reload/discard, family justification, archive confirmation, training guard, reactivation, scoped export, duplicate validation/isolation, quota error, dark/mobile.');
}finally{await browser.close()}
