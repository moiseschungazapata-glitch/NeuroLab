import assert from 'node:assert/strict';
const {chromium}=await import(process.env.NEUROLAB_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.addInitScript(()=>sessionStorage.setItem('nl-session','moiseschungazapata@gmail.com'));
const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function open(){await page.getByRole('button',{name:'Fundamentos',exact:true}).click()}
try{
 await page.goto('http://127.0.0.1:5173/');await open();
 assert.equal(await page.getByTestId('neuron-output').innerText(),'0.600');
 await page.getByRole('slider',{name:'Entrada x',exact:true}).press('Home');
 assert.equal(await page.getByTestId('neuron-z').innerText(),'-1.800');
 assert.equal(await page.getByTestId('neuron-output').innerText(),'0.000');
 await page.getByLabel('Función de activación',{exact:true}).selectOption('Sigmoid');
 assert.equal(await page.getByTestId('neuron-output').innerText(),(1/(1+Math.exp(1.8))).toFixed(3));
 await page.getByRole('button',{name:'Restablecer neurona'}).click();
 assert.equal(await page.getByTestId('neuron-output').innerText(),'0.600');
 await page.getByLabel('Buscar en el glosario').fill('Softmax');
 assert.equal(await page.locator('.glossary-grid details').count(),1);
 await page.locator('.glossary-grid summary').click();assert.ok((await page.locator('.glossary-grid').innerText()).includes('suma es 1'));
 await page.getByLabel('Buscar en el glosario').fill('epoca');assert.ok((await page.locator('.glossary-grid').innerText()).includes('Época'));
 await page.getByLabel('Categoría del glosario',{exact:true}).selectOption('GAN');
 await page.getByText('No hay términos que coincidan con tu búsqueda.').waitFor();
 await page.getByRole('button',{name:'Limpiar búsqueda'}).click();
 assert.equal(await page.locator('.glossary-grid details').count(),27);
 for(const [family,index] of [['RNN',0],['CNN',1],['GAN',2]]){
  await page.getByRole('button',{name:family,exact:true}).click();
  if(family==='RNN'){
   const values=await page.locator('.sequence-visual output').allTextContents();
   assert.equal(values[0],Math.tanh(.8).toFixed(3));
   await page.getByRole('slider',{name:'Peso de memoria',exact:true}).press('Home');
   assert.equal(await page.locator('.sequence-visual output').nth(1).innerText(),'0.000');
  }
  if(family==='CNN'){
   await page.getByRole('button',{name:'Inspeccionar salida fila 2, columna 1',exact:true}).click();
   assert.ok((await page.locator('.guide-visual>code').innerText()).endsWith('= -1'));
   assert.equal(await page.locator('.pixel-active').count(),4);
  }
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'Siguiente',exact:true}).click();
  await page.getByRole('radio').nth((index+1)%3).check();
  await page.getByRole('button',{name:'Comprobar respuesta'}).click();
  await page.getByText('Revisa tu respuesta e inténtalo de nuevo.',{exact:true}).waitFor();
  await page.getByRole('radio').nth(index).check();await page.getByRole('button',{name:'Comprobar respuesta'}).click();
  await page.getByText('Correcto. Recorrido completado.',{exact:true}).waitFor();
  if(family==='GAN')assert.ok((await page.locator('.guide-visual').innerText()).includes('Alternar actualizaciones'));
 }
 await page.reload();await open();await page.getByText('3/3 completados',{exact:true}).waitFor();
 await page.getByRole('button',{name:'CNN',exact:true}).click();
 await page.locator('.guided-examples').screenshot({path:'preview-fundamentals-guide.png',animations:'disabled'});
 await page.locator('.neuron-lab').screenshot({path:'preview-fundamentals-neuron.png',animations:'disabled'});
 await page.getByRole('button',{name:'Activar modo oscuro'}).click();
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('.guided-examples').screenshot({path:'preview-fundamentals-mobile.png',animations:'disabled'});
 assert.deepEqual(errors,[]);
 console.log('PASS: neuron math/activation/keyboard, glossary search/category/empty states, RNN recurrence, CNN local products, GAN walkthrough, quiz feedback, saved learning progress, dark mode and mobile layout.');
}catch(e){await page.screenshot({path:'preview-fundamentals-error.png',fullPage:true,animations:'disabled'});throw e}finally{await browser.close()}
