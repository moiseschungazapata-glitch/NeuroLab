import assert from 'node:assert/strict';
const {chromium}=await import(process.env.NEUROLAB_PLAYWRIGHT||'playwright');
if(!process.env.NEUROLAB_DEMO_PASSWORD)throw Error('Set NEUROLAB_DEMO_PASSWORD for the local login test.');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function login(){
 await page.getByLabel('Correo electrónico',{exact:true}).fill('moiseschungazapata@gmail.com');
 await page.getByLabel('Contraseña',{exact:true}).fill(process.env.NEUROLAB_DEMO_PASSWORD);
 await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
 await page.getByRole('heading',{name:'Tu laboratorio, en perspectiva.'}).waitFor();
}
try{
 await page.goto('http://127.0.0.1:5173/');
 assert.equal(await page.locator('.sidebar').count(),0);
 await page.screenshot({path:'preview-login.png',fullPage:true,animations:'disabled'});
 await page.getByLabel('Correo electrónico',{exact:true}).fill('moiseschungazapata@gmail.com');
 await page.getByLabel('Contraseña',{exact:true}).fill('incorrecta');
 await page.getByRole('button',{name:'Mostrar contraseña'}).click();
 assert.equal(await page.getByLabel('Contraseña',{exact:true}).getAttribute('type'),'text');
 await page.getByRole('button',{name:'Ocultar contraseña'}).click();
 await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
 await page.getByRole('alert').waitFor();
 assert.equal(await page.locator('.sidebar').count(),0);
 await login();
 await page.getByRole('button',{name:'Activar modo oscuro'}).click();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 for(const section of ['Proyectos','Fundamentos','Diseñador de redes','Datasets','Entrenamientos','Evaluación','Registro de modelos','Reportes','Administración']){
  await page.locator('nav').getByRole('button',{name:section,exact:false}).click();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  await page.getByRole('button',{name:'Activar modo claro'}).waitFor();
 }
 await page.getByRole('button',{name:'Ocultar menú'}).click();
 assert.equal(await page.locator('.main').evaluate(e=>Math.round(e.getBoundingClientRect().left)),0);
 await page.reload();
 await page.getByRole('button',{name:'Abrir menú'}).waitFor();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.getByRole('button',{name:'Abrir menú'}).click();
 await page.getByRole('button',{name:'Diseñador de redes',exact:true}).click();
 await page.screenshot({path:'preview-workspace-dark.png',fullPage:true,animations:'disabled'});
 await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();
 await page.getByRole('button',{name:'Iniciar sesión',exact:true}).waitFor();
 assert.equal(await page.locator('main').count(),0);
 await page.reload();
 assert.equal(await page.locator('main').count(),0);
 await page.screenshot({path:'preview-login-dark.png',fullPage:true,animations:'disabled'});
 await login();
 await page.getByRole('button',{name:'Activar modo claro'}).click();
 await page.getByRole('button',{name:'Proyectos',exact:false}).first().click();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.getByRole('button',{name:'Abrir menú'}).click();
 await page.screenshot({path:'preview-menu-mobile.png',fullPage:true,animations:'disabled'});
 await page.getByRole('button',{name:'Cerrar menú',exact:true}).click({position:{x:350,y:150}});
 await page.getByRole('button',{name:'Abrir menú'}).click();
 await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();
 await page.getByRole('button',{name:'Iniciar sesión',exact:true}).waitFor();
 await page.screenshot({path:'preview-login-mobile.png',fullPage:true,animations:'disabled'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);
 console.log('PASS: login, rejected credentials, password visibility, session reload, logout, 10 sections, theme persistence, sidebar collapse, mobile menu and layout.');
}catch(e){await page.screenshot({path:'preview-access-error.png',fullPage:true,animations:'disabled'});throw e}finally{await browser.close()}
