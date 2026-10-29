import assert from 'node:assert/strict';
const {chromium}=await import(process.env.NEUROLAB_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
// Login behavior has its own test; exercise this flow in an existing demo session.
await page.addInitScript(()=>sessionStorage.setItem('nl-session','moiseschungazapata@gmail.com'));
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5173/');
 await page.evaluate(()=>localStorage.setItem('nl-projects',JSON.stringify([{id:1,name:'Proyecto conservado',description:'Prueba de migración',family:'Feedforward',status:'En desarrollo'}])));
 await page.reload();
 assert.ok(!(await page.locator('main').innerText()).includes('Feedforward'));
 await page.getByRole('button',{name:'Fundamentos',exact:true}).click();
 assert.equal(await page.locator('.families article').count(),3);
 await page.getByRole('button',{name:'Diseñador de redes',exact:true}).click();
 for(const family of ['CNN','RNN','GAN']){
  await page.locator('.family-tabs button').filter({has:page.getByText(family,{exact:true})}).click();
  assert.ok((await page.locator('.layer-panel h3').innerText()).includes(family));
  assert.ok((await page.locator('.canvas').innerText()).includes(family==='CNN'?'Conv2D':family==='RNN'?'SimpleRNN':'Discriminador'));
  await page.getByRole('button',{name:'Validar configuración',exact:true}).click();
  await page.getByRole('status').filter({hasText:`Configuración ${family} válida`}).waitFor();
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Exportar JSON',exact:true}).click()]);
  const stream=await download.createReadStream();let body='';for await(const chunk of stream)body+=chunk;assert.equal(JSON.parse(body).family,family);
  await page.screenshot({path:`preview-${family.toLowerCase()}.png`,fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Probar arquitectura'}).click();
  assert.equal(await page.getByLabel('Dataset de ejemplo').inputValue(),family==='RNN'?'Secuencias demo':'MNIST');
  await page.getByRole('button',{name:'Guardar versión',exact:true}).waitFor({timeout:60000});
  await page.getByRole('button',{name:'Guardar versión',exact:true}).click();
  assert.ok((await page.locator('tbody tr').first().innerText()).includes(family));
  if(family!=='CNN')assert.ok(!(await page.locator('tbody tr').first().innerText()).includes('%'));
  await page.getByRole('button',{name:'Evaluación',exact:true}).click();
  assert.ok((await page.locator('.evaluation-stats').innerText()).includes(family==='RNN'?'MAE':family==='CNN'?'Precisión':'Pérdida G'));
  await page.getByRole('button',{name:'Diseñador de redes',exact:true}).click();
 }
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'preview-gan-mobile.png',fullPage:true,animations:'disabled'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.getByRole('button',{name:'Quitar capa'}).click();
 await page.getByRole('button',{name:'Validar configuración'}).click();
 await page.getByRole('status').filter({hasText:'GAN necesita capas'}).waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS: migration, 3 families, diagrams, validation, exports, datasets, simulations, versions, evaluation metrics, GAN branch validation and mobile layout.');
}catch(e){await page.screenshot({path:'preview-test-error.png',fullPage:true,animations:'disabled'});console.log(await page.locator('main').innerText());throw e}finally{await browser.close()}
