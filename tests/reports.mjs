import assert from 'node:assert/strict';
const {chromium}=await import(process.env.NEUROLAB_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.addInitScript(()=>sessionStorage.setItem('nl-session','moiseschungazapata@gmail.com'));
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto('http://127.0.0.1:5173/');
 await page.getByRole('button',{name:'Reportes',exact:true}).click();
 await page.getByRole('heading',{name:'Tu investigación, documentada.'}).waitFor();
 assert.ok((await page.locator('.report-summary-grid').innerText()).toLocaleLowerCase('es').includes('ficha del proyecto'));
 const [csv]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Historial CSV'}).click()]);
 const csvStream=await csv.createReadStream();let csvBody='';for await(const chunk of csvStream)csvBody+=chunk;
 assert.ok(csvBody.startsWith('\ufeffEjecución,Fuente,Familia'));
 const [pdf]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Reporte PDF'}).click()]);
 const pdfStream=await pdf.createReadStream();let signature=Buffer.alloc(0);for await(const chunk of pdfStream){signature=Buffer.concat([signature,chunk]);if(signature.length>=5)break}
 assert.equal(signature.subarray(0,5).toString(),'%PDF-');
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Mobile horizontal overflow');
 assert.deepEqual(errors,[]);
 console.log('PASS: project report preview, authorized CSV/PDF downloads, PDF signature and mobile layout.');
}catch(error){console.log(await page.locator('main').innerText());throw error}finally{await browser.close()}
