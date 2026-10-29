// Run with NEUROLAB_PLAYWRIGHT pointing to your installed Playwright module.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.NEUROLAB_PLAYWRIGHT || 'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
// Login behavior has its own test; exercise this flow in an existing demo session.
await page.addInitScript(()=>sessionStorage.setItem('nl-session','moiseschungazapata@gmail.com'));
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5173/');
 await page.getByRole('button',{name:'Nuevo proyecto'}).click();
 await page.getByLabel('Nombre del proyecto').fill('Proyecto de prueba');
 await page.getByLabel('Problema a resolver').fill('Comprender el flujo de clasificación.');
 await page.getByRole('button',{name:'Crear proyecto'}).click();
 await page.getByRole('button',{name:'Agregar capa'}).click();
 await page.getByLabel('Unidades',{exact:true}).fill('0');
 await page.getByRole('button',{name:'Validar configuración'}).click();
 await page.getByRole('status').filter({hasText:'Revisa las capas'}).waitFor();
 await page.getByLabel('Unidades',{exact:true}).fill('32');
 await page.getByRole('button',{name:'Probar arquitectura'}).click();
 await page.getByRole('button',{name:'Cancelar',exact:true}).click();
 await page.getByRole('button',{name:'Iniciar simulación'}).click();
 await page.getByRole('button',{name:'Vista general',exact:true}).click();
 await page.getByRole('button',{name:'Entrenamientos',exact:true}).click();
 await page.getByRole('button',{name:'Guardar versión',exact:true}).waitFor({timeout:60000});
 await page.getByRole('button',{name:'Guardar versión',exact:true}).click();
 await page.getByText('v1.1.0',{exact:true}).waitFor();
 await page.reload();
 await page.getByRole('button',{name:'Proyectos',exact:false}).first().click();
 await page.getByRole('heading',{name:'Proyecto de prueba',exact:true}).waitFor();
 await page.getByRole('button',{name:'Registro de modelos',exact:true}).click();
 await page.getByText('v1.1.0',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Vista general',exact:true}).click();
 await page.screenshot({path:'preview-desktop.png',fullPage:true,animations:'disabled'});
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Mobile horizontal overflow');
 await page.screenshot({path:'preview-mobile.png',fullPage:true,animations:'disabled'});
 await page.getByRole('button',{name:'Abrir menú'}).click();
 await page.getByRole('button',{name:'Diseñador de redes',exact:true}).click();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Designer mobile overflow');
 await page.screenshot({path:'preview-designer-mobile.png',fullPage:true,animations:'disabled'});
 assert.deepEqual(errors,[]);
 console.log('PASS: create project, invalid units, cancellation, simulated completion, save version, navigation, persistence, mobile menu and layout; no runtime errors.');
}catch(error){await page.screenshot({path:'preview-test-error.png',fullPage:true});console.log(await page.locator('main').innerText());throw error}finally{await browser.close()}
