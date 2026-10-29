import assert from 'node:assert/strict';
const {chromium}=await import(process.env.NEUROLAB_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.addInitScript(()=>sessionStorage.setItem('nl-session','moiseschungazapata@gmail.com'));
const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function catalogue(){await page.getByRole('button',{name:'Datasets',exact:true}).click()}
async function register(name,family,buffer,filename){await page.getByRole('button',{name:'Registrar dataset',exact:true}).click();await page.getByLabel('Nombre del dataset',{exact:true}).fill(name);await page.getByLabel('Familia del dataset',{exact:true}).selectOption(family);await page.getByLabel('Archivo CSV o JSON',{exact:true}).setInputFiles({name:filename,mimeType:filename.endsWith('csv')?'text/csv':'application/json',buffer:Buffer.from(buffer)});await page.getByLabel('Licencia o procedencia autorizada',{exact:true}).fill('Datos sintéticos de prueba');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Registrar archivo',exact:true}).click();await page.getByRole('heading',{name:'Calidad y metadatos',exact:true}).waitFor()}
try{
 await page.goto('http://127.0.0.1:5173/');await catalogue();
 const csv='tiempo,valor,objetivo\n'+Array.from({length:240},(_,i)=>[i,i,i*2].join(',')).join('\n');
 await register('Serie de prueba','RNN',csv,'serie.csv');
 await page.getByRole('button',{name:'Crear versión preparada',exact:true}).click();
 const prepared=()=>page.locator('article.dataset').filter({hasText:'Serie de prueba'}).filter({hasText:'v2'});
 await prepared().getByRole('button',{name:'Inspeccionar y preparar'}).click();
 assert.equal(await page.locator('.prepared-counts strong').first().innerText(),'144');
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Exportar conjuntos preparados'}).click()]);
 const stream=await download.createReadStream();let text='';for await(const c of stream)text+=c;const exported=JSON.parse(text);assert.equal(exported.preparation.stats[0].mean,83.5);assert.equal(exported.splits.train.length,144);
 await page.getByRole('button',{name:'Seleccionar versión',exact:true}).click();
 await page.getByRole('button',{name:'Entrenamientos',exact:true}).click();
 await page.getByRole('button',{name:'Iniciar simulación',exact:true}).click();await page.getByRole('status').filter({hasText:'Revisa y confirma los datos'}).waitFor();
 await page.getByRole('checkbox',{name:/Revisé calidad/}).check();
 await page.getByRole('button',{name:'Iniciar simulación',exact:true}).click();await page.getByRole('button',{name:'Cancelar',exact:true}).click();
 const job=await page.evaluate(()=>JSON.parse(localStorage.getItem('nl-runs-v2'))[0]);assert.ok(job.datasetId);assert.equal(job.datasetSnapshot.version,2);assert.equal(job.trainingConfig.learningRate,.001);
 await catalogue();await prepared().getByRole('button',{name:'Inspeccionar y preparar'}).click();assert.ok(await page.getByRole('button',{name:'Enviar a papelera'}).isDisabled());
 await page.getByRole('button',{name:'Volver al catálogo'}).click();await page.reload();await catalogue();
 assert.equal(await page.locator('article.dataset').count(),2);
 await page.locator('article.dataset').filter({hasText:'v1'}).getByRole('button',{name:'Inspeccionar y preparar'}).click();
 await page.getByRole('button',{name:'Enviar a papelera'}).click();await page.getByRole('button',{name:'Confirmar papelera'}).click();
 await page.getByRole('button',{name:'Papelera',exact:true}).click();await page.getByRole('button',{name:'Restaurar versión'}).click();
 await page.getByRole('button',{name:'Volver al catálogo',exact:true}).click();
 await page.locator('article.dataset').filter({hasText:'v1'}).getByRole('button',{name:'Inspeccionar y preparar'}).click();
 await page.getByRole('button',{name:'Enviar a papelera'}).click();await page.getByRole('button',{name:'Confirmar papelera'}).click();
 await page.getByRole('button',{name:'Papelera',exact:true}).click();await page.getByRole('button',{name:'Eliminar definitivamente',exact:true}).click();
 await page.getByLabel('Confirmación de eliminación').fill('ELIMINAR');await page.getByRole('button',{name:'Eliminar versión',exact:true}).click();
 await page.getByText('La papelera está vacía.',{exact:true}).waitFor();await page.getByRole('button',{name:'Volver al catálogo',exact:true}).click();
 const images=JSON.stringify({shape:[2,2,1],samples:Array.from({length:72},(_,i)=>({pixels:[i,i*2,255-i,i*3],label:i%2?'B':'A',group:'sample-'+i}))});
 await register('Imágenes de prueba','CNN',images,'images.json');
 await page.getByRole('button',{name:'Ajustar entrada y salida al dataset'}).click();await page.getByRole('button',{name:'Crear versión preparada',exact:true}).click();
 await page.locator('article.dataset').filter({hasText:'Imágenes de prueba'}).filter({hasText:'v2'}).getByRole('button',{name:'Inspeccionar y preparar'}).click();
 await page.screenshot({path:'preview-datasets.png',fullPage:true,animations:'disabled'});
 await page.getByRole('button',{name:'Activar modo oscuro'}).click();await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'preview-datasets-mobile.png',fullPage:true,animations:'disabled'});
 assert.deepEqual(errors,[]);console.log('PASS: local imports, real preparation/export, IndexedDB persistence, version selection/review gate, training snapshots, reference-protected deletion, trash/restore, CNN shape alignment, dark/mobile layout.');
}catch(e){await page.screenshot({path:'preview-datasets-error.png',fullPage:true,animations:'disabled'});throw e}finally{await browser.close()}
