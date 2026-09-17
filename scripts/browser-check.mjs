import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import path from 'node:path';
import {preview} from 'vite';
import config from '../vite.config.ts';
const out=path.resolve('artifacts/browser');
await mkdir(out,{recursive:true});
const browserPath=process.env.CHAPARRA_BROWSER||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
await access(browserPath);
const server=await preview({...config,configFile:false,preview:{host:'127.0.0.1',port:5180,strictPort:true}});
const profile=path.join(out,'profile-'+Date.now());
await mkdir(profile,{recursive:true});
const child=spawn(browserPath,['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws,session,sequence=0;const pending=new Map(),messages=[],checks=[];
async function call(method,params={},sessionId=session){
 const id=++sequence;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},15000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
}
async function evaluate(expression){const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text+': '+result.exceptionDetails.exception?.description);return result.result.value;}
const rootCode="const dialogs=[...document.querySelectorAll('dialog[open]')];const root=dialogs.at(-1)||document;const visible=el=>el.getClientRects().length>0;";
async function click(text){await evaluate(`(()=>{${rootCode}const el=[...root.querySelectorAll('button,a')].find(el=>visible(el)&&el.textContent.trim()===${JSON.stringify(text)});if(!el)throw Error('Botón no encontrado: '+${JSON.stringify(text)});el.focus();el.click();})()`);await pause(100);}
async function fill(label,value){await evaluate(`(()=>{${rootCode}const l=[...root.querySelectorAll('label')].find(el=>visible(el)&&el.textContent.trim()===${JSON.stringify(label)});if(!l)throw Error('Etiqueta no encontrada: '+${JSON.stringify(label)});const input=document.getElementById(l.htmlFor);if(!input)throw Error('Sin control asociado');input.focus();const proto=input instanceof HTMLSelectElement?HTMLSelectElement.prototype:input instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(input,${JSON.stringify(String(value))});input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`);await pause(60);}
async function checkbox(id){await evaluate(`document.getElementById(${JSON.stringify(id)}).click()`);await pause(60);}
async function text(){return evaluate('document.body.innerText');}
async function waitFor(needle){for(let i=0;i<80;i++){if((await text()).includes(needle))return;await pause(100);}throw new Error('No aparece: '+needle+'\n'+await text());}
async function viewport(width){await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await pause(200);}
async function snapshot(name){await pause(200);const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(path.join(out,name+'.png'),Buffer.from(shot.data,'base64'));}
async function layout(name){const result=await evaluate(`(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,bottom:[...document.querySelectorAll('nav')].filter(el=>getComputedStyle(el).display!=='none').map(el=>el.getAttribute('aria-label')),small:[...document.querySelectorAll('p,label,button,span')].filter(el=>el.getClientRects().length&&parseFloat(getComputedStyle(el).fontSize)<13).length,unlabelled:[...document.querySelectorAll('input,select,textarea')].filter(el=>el.getClientRects().length&&!el.labels?.length&&!el.getAttribute('aria-label')).length}))()`);
 assert.ok(result.scroll<=result.width,JSON.stringify({name,...result}));assert.equal(result.small,0);assert.equal(result.unlabelled,0);checks.push({name,...result});}
async function noMilk(){assert.ok(!/ordeño|litros|lácte|\/litro|Venta Leche/i.test(await text()),'Aparece contenido de leche en perfil de carne');}
async function noMeat(){assert.ok(!/canal|GMD|kg en vivo|valor estimado de carne/i.test(await text()),'Aparece contenido cárnico en perfil de leche');}
async function storageData(){return evaluate("JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([key])=>key.includes(':u:'))))");}
async function file(label,filename){
 const id=await evaluate(`(()=>{${rootCode}const l=[...root.querySelectorAll('label')].find(el=>visible(el)&&el.textContent.trim()===${JSON.stringify(label)});if(!l)throw Error('Campo de archivo ausente');return l.htmlFor;})()`);
 const {root}=await call('DOM.getDocument',{depth:-1,pierce:true});const {nodeId}=await call('DOM.querySelector',{nodeId:root.nodeId,selector:'[id="'+id+'"]'});await call('DOM.setFileInputFiles',{nodeId,files:[filename]});await pause(250);
}
try{
 let endpoint;
 for(let i=0;i<100;i++){try{const [port,route]=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).trim().split(/\r?\n/);endpoint='ws://127.0.0.1:'+port+route;break;}catch{await pause(100);}}
 if(!endpoint)throw new Error('No se pudo iniciar Chrome de pruebas.');
 ws=new WebSocket(endpoint);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 ws.onmessage=event=>{const value=JSON.parse(event.data);if(value.id){const p=pending.get(value.id);pending.delete(value.id);if(value.error)p?.reject(new Error(JSON.stringify(value.error)));else p?.resolve(value.result);}else if(value.method==='Runtime.exceptionThrown')messages.push(value.params.exceptionDetails);else if(value.method==='Runtime.consoleAPICalled'&&['error','warning'].includes(value.params.type))messages.push(value.params);};
 const {targetId}=await call('Target.createTarget',{url:'about:blank'},null);session=(await call('Target.attachToTarget',{targetId,flatten:true},null)).sessionId;
 await call('Page.enable');await call('Runtime.enable');await call('DOM.enable');await call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:out},null);
 await viewport(375);await call('Page.navigate',{url:'http://127.0.0.1:5180'});await waitFor('Iniciar sesión');await layout('acceso-375');await snapshot('01-acceso-375');
 const secret=crypto.randomUUID()+crypto.randomUUID(),replacement=crypto.randomUUID()+crypto.randomUUID();
 await click('Crear una cuenta local');await fill('Nombre y apellidos','Titular de pruebas');await fill('Correo electrónico','campo@example.es');await fill('Contraseña',secret);await fill('Repetir contraseña',secret);await checkbox('accept');await click('Crear cuenta');
 await waitFor('Paso 1 de 4');await fill('Nombre de la ganadería','Ganadería de comprobación');await click('Continuar');await click('Ovino');await click('Continuar');await click('Carne');await click('Continuar');await noMilk();await snapshot('02-encuesta-carne-375');await click('Entrar en mi explotación');await waitFor('Dar de alta el primer animal');
 await layout('vacio-carne-375');await noMilk();await snapshot('03-rebano-vacio-375');
 await click('Dar de alta el primer animal');assert.deepEqual(await evaluate("[...document.querySelectorAll('dialog select')][0].options.length"),2);
 await fill('Crotal','ES123456789012');await fill('Raza','Merina');await fill('Fecha de nacimiento','2023-02-10');await fill('Ubicación','Parcela norte');await layout('alta-animal-375');await noMilk();await click('Guardar animal');await waitFor('ES123456789012');await snapshot('04-rebano-375');
 await viewport(1440);await layout('rebano-1440');await snapshot('05-rebano-1440');await click('ES123456789012');await waitFor('Historial sanitario');await noMilk();await layout('detalle-1440');
 const modal=await evaluate("({role:document.querySelector('dialog').getAttribute('role'),modal:document.querySelector('dialog').getAttribute('aria-modal'),overflow:document.body.style.overflow})");assert.deepEqual(modal,{role:'dialog',modal:'true',overflow:'hidden'});
 await click('Añadir actuación');await fill('Tratamiento u observaciones','Revisión anotada');await fill('Coste de la actuación (€)','25');await click('Guardar actuación');await waitFor('Revisión anotada');
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await pause(100);assert.equal(await evaluate("document.querySelectorAll('dialog[open]').length"),0);
 await click('Producción');await noMilk();await fill('Fecha de pesada','2025-01-01');await fill('Peso vivo (kg)','100');await click('Guardar pesada');await fill('Fecha de pesada','2025-01-11');await fill('Peso vivo (kg)','120');await click('Guardar pesada');await waitFor('2 kg/día');await layout('produccion-carne-1440');await snapshot('06-produccion-carne-1440');
 await click('Facturas');await click('Añadir registro');await fill('Concepto','Compra de alimento');await fill('Proveedor','Proveedor de prueba');await fill('Importe total (€)','50');await click('Guardar registro');await waitFor('Compra de alimento');await noMilk();
 await click('Documento de venta');for(const [label,value] of [['Número de factura o recibo','T-001'],['Nombre o razón social del ganadero','Titular de pruebas'],['NIF del ganadero','12345678Z'],['Domicilio del ganadero','Domicilio de prueba'],['Nombre o razón social del cliente','Cliente de prueba'],['NIF del cliente','87654321X'],['Domicilio del cliente','Domicilio cliente'],['Lugar de la operación','Cercado']])await fill(label,value);
 await click('Añadir concepto');await fill('Concepto 1','Venta de un lote');await fill('Cantidad','2');await fill('Precio unitario (€)','500');await click('Guardar documento y registrar ingreso');await waitFor('Documento guardado');assert.ok((await text()).includes('1085')||(await text()).includes('1.085'));
 await call('Emulation.setEmulatedMedia',{media:'print'});const pdf=await call('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});await writeFile(path.join(out,'factura-prueba.pdf'),Buffer.from(pdf.data,'base64'));await call('Emulation.setEmulatedMedia',{media:''});
 await click('Informes');await noMilk();await layout('informes-1440');await snapshot('07-informes-1440');
 await viewport(375);await layout('informes-375');await snapshot('08-informes-375');
 await evaluate("[...document.querySelectorAll('button')].find(el=>el.getAttribute('aria-label')==='Ajustes y cuenta').click()");await waitFor('Cambiar contraseña');
 await fill('Contraseña actual',secret);await fill('Nueva contraseña',replacement);await fill('Repetir nueva contraseña',replacement);await click('Cambiar contraseña');await waitFor('Contraseña actualizada');await noMilk();await snapshot('09-ajustes-375');
 const before=await storageData();await click('Cerrar sesión');await waitFor('Iniciar sesión');await fill('Correo electrónico','campo@example.es');await fill('Contraseña',replacement);await click('Entrar');await waitFor('ES123456789012');assert.equal(await storageData(),before);
 const raw=await evaluate('JSON.stringify({...localStorage})');assert.ok(!raw.includes(secret)&&!raw.includes(replacement));checks.push({name:'sesion-hash-aislamiento',passwordPlain:false,reloginIdentical:true});
 await viewport(1440);await click('Cerrar sesión');await click('Crear una cuenta local');await fill('Nombre y apellidos','Segunda titular');await fill('Correo electrónico','segunda@example.es');await fill('Contraseña',secret);await fill('Repetir contraseña',secret);await checkbox('accept');await click('Crear cuenta');await waitFor('Paso 1 de 4');
 await fill('Nombre de la ganadería','Segunda explotación');await click('Continuar');await click('Caprino');await click('Continuar');await click('Leche');await click('Continuar');await noMeat();await click('Entrar en mi explotación');await waitFor('Dar de alta el primer animal');assert.ok(!(await text()).includes('ES123456789012'));
 await click('Facturas');await waitFor('Tus cuentas, desde el primer registro');await click('Producción');await fill('Litros','20');await click('Guardar ordeño');await waitFor('20 L');await noMeat();await layout('produccion-leche-1440');await snapshot('10-produccion-leche-1440');await click('Informes');await noMeat();await layout('informes-leche-1440');
 await click('Ajustes y cuenta');await click('Exportar copia de seguridad');await pause(500);
 const {readdir}=await import('node:fs/promises');const backupName=(await readdir(out)).find(name=>name.startsWith('Chaparra_copia_')&&name.endsWith('.json'));assert.ok(backupName);const backupFile=path.join(out,backupName);const backup=JSON.parse(await readFile(backupFile,'utf8'));assert.equal(backup.data.milkRecords.length,1);assert.equal(backup.data.animals.length,0);
 const invalid=path.join(out,'invalid.json');await writeFile(invalid,'{"format":"incorrecto"}');const beforeImport=await storageData();await file('Importar una copia JSON',invalid);await waitFor('La copia no es válida');assert.equal(await storageData(),beforeImport);
 await file('Importar una copia JSON',backupFile);await waitFor('Sustituir los datos de esta cuenta');await click('Importar y sustituir');await waitFor('Copia importada');assert.equal(await storageData(),beforeImport);
 await click('Ajustes y cuenta');await click('Rehacer encuesta');await waitFor('Paso 1 de 4');await click('Continuar');await click('Ovino');await click('Continuar');await evaluate(`(()=>{const fieldsets=[...document.querySelectorAll('fieldset')];const f=fieldsets.find(f=>f.querySelector('legend')?.textContent==='Ovino');[...f.querySelectorAll('button')].find(b=>b.textContent==='Mixto').click();})()`);await click('Continuar');assert.ok((await text()).includes('Precio estimado de carne'));await click('Guardar cambios');await waitFor('Tu rebaño');await click('Producción');assert.ok((await text()).includes('Tipo de producción'));
 await viewport(375);await layout('mixto-375');await snapshot('11-mixto-375');
 assert.equal(messages.length,0,JSON.stringify(messages));await writeFile(path.join(out,'results.json'),JSON.stringify({passed:true,checks,consoleErrors:messages},null,2));console.log(JSON.stringify({passed:true,checks:checks.length,consoleErrors:messages.length,artifacts:out},null,2));
}catch(error){
 try{await snapshot('error');await writeFile(path.join(out,'error-state.txt'),await text());await writeFile(path.join(out,'console.json'),JSON.stringify(messages,null,2));}catch{}
 console.error(error);process.exitCode=1;
}finally{
 try{if(ws?.readyState===1)await call('Browser.close',{},null);}catch{}
 ws?.close();child.kill();await new Promise(resolve=>server.httpServer.close(resolve));
}
