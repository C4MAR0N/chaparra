import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
globalThis.crypto ??= webcrypto;
class MemoryStorage {
  values=new Map(); fail=false;
  getItem(key){return this.values.get(key)??null;}
  setItem(key,value){if(this.fail)throw new Error('QuotaExceededError');this.values.set(key,String(value));}
  removeItem(key){if(this.fail)throw new Error('SecurityError');this.values.delete(key);}
}
globalThis.window={localStorage:new MemoryStorage(),sessionStorage:new MemoryStorage()};
const auth=await import('../src/services/auth.ts');
const db=await import('../src/services/db.ts');
const storage=await import('../src/services/storage.ts');
const {createBackup}=await import('../src/services/backup.ts');
const {parseBackup}=await import('../src/lib/validation.ts');
const {age,hasMeat,hasMilk,saleTotals,weightStats,milkSeries}=await import('../src/lib/domain.ts');
const secret=crypto.randomUUID()+crypto.randomUUID();
const farm={nombreExplotacion:'Explotación de prueba',titular:'Titular de prueba',especies:['Ovino'],orientacionPorEspecie:{Ovino:'Carne'},precioKgCarneEuro:3,moneda:'EUR'};
let first,second;
test('elimina las cuatro claves anteriores sin precargar datos',()=>{
 for(const key of ['chaparra_animals_v1','chaparra_farm_config_v1','chaparra_invoices_v1','chaparra_sale_template_v1'])window.localStorage.setItem(key,'[]');
 storage.initializeStorage();assert.equal(window.localStorage.getItem('chaparra_animals_v1'),null);
 assert.deepEqual(db.loadData('unregistered').animals,[]);assert.deepEqual(db.loadData('unregistered').invoices,[]);assert.equal(db.loadData('unregistered').farm,null);assert.deepEqual(db.loadData('unregistered').saleTemplate.items,[]);
});
test('registro normaliza el correo y genera PBKDF2 con sal de 16 bytes y hash de 32',async()=>{
 first=await auth.register('Titular Uno','  UNO @ EXAMPLE.ES ',secret,true);
 assert.equal(first.email,'uno@example.es');assert.equal(first.iterations,150000);assert.equal(first.algo,'PBKDF2-SHA-256');
 assert.equal(Buffer.from(first.salt,'base64').length,16);assert.equal(Buffer.from(first.passwordHash,'base64').length,32);
 assert.ok(await auth.verifyPassword(first,secret));assert.equal(auth.currentUser().id,first.id);
 assert.ok(!JSON.stringify([...window.localStorage.values]).includes(secret));
 const saved=JSON.parse(window.localStorage.getItem(auth.USERS_KEY))[0];assert.deepEqual(Object.keys(saved).sort(),['algo','createdAt','email','id','iterations','nombre','passwordHash','salt'].sort());
});
test('rechaza duplicados, correo inválido y claves demasiado cortas',async()=>{
 await assert.rejects(()=>auth.register('Duplicado',' UNO@example.es ',secret,true),/Ya existe/);
 await assert.rejects(()=>auth.register('Titular','incorrecto',secret,true),/correo válido/);
 await assert.rejects(()=>auth.register('Titular','short@example.es',secret.slice(0,7),true),/8 caracteres/);
});
test('segunda cuenta vacía y completamente independiente',async()=>{
 db.saveData(first.id,'farm',farm);
 const animal={id:crypto.randomUUID(),crotal:'ES123456789012',especie:'Ovino',orientacion:'Carne',ubicacion:'Parcela 1',numeroPartos:0,fechaNacimiento:'2023-02-10',criasAsociadas:[],estadoSanitario:'Sano',raza:'Merina',sexo:'Hembra',activo:true,fechaAlta:'2025-01-01',historialSanitario:[]};
 db.saveData(first.id,'animals',[animal]);
 second=await auth.register('Titular Dos','dos@example.es',secret,false);
 assert.notEqual(second.salt,first.salt);assert.notEqual(second.passwordHash,first.passwordHash);
 assert.equal(window.localStorage.getItem(auth.SESSION_KEY),null);assert.ok(window.sessionStorage.getItem(auth.SESSION_KEY));
 assert.deepEqual(db.loadData(second.id).animals,[]);assert.equal(db.loadData(second.id).farm,null);
 assert.equal(db.loadData(first.id).animals[0].id,animal.id);
});
test('cerrar y volver a entrar recupera exactamente los datos',async()=>{
 const before=db.loadData(first.id);auth.logout();assert.equal(auth.currentUser(),null);
 await auth.login('UNO@example.es',secret,true);assert.deepEqual(db.loadData(first.id),before);
 await assert.rejects(()=>auth.login('uno@example.es',crypto.randomUUID(),true),/Correo o contraseña incorrectos/);
 await assert.rejects(()=>auth.login('missing@example.es',secret,true),/Correo o contraseña incorrectos/);
});
test('sesión caduca tras 30 días y se elimina',()=>{
 const session=JSON.parse(window.localStorage.getItem(auth.SESSION_KEY));assert.ok(Math.abs(session.expiresAt-Date.now()-30*86400000)<5000);
 storage.writeJson(auth.SESSION_KEY,{userId:first.id,expiresAt:Date.now()-1});assert.equal(auth.currentUser(),null);
 assert.equal(window.localStorage.getItem(auth.SESSION_KEY),null);
});
test('cambio de contraseña exige la actual y rota la sal',async()=>{
 const replacement=crypto.randomUUID()+crypto.randomUUID();
 await assert.rejects(()=>auth.changePassword(first.id,crypto.randomUUID(),replacement),/actual/);
 await auth.changePassword(first.id,secret,replacement);
 const updated=auth.getUsers().find(u=>u.id===first.id);assert.notEqual(updated.salt,first.salt);
 assert.ok(await auth.verifyPassword(updated,replacement));assert.equal(await auth.verifyPassword(updated,secret),false);
 assert.ok(!JSON.stringify([...window.localStorage.values]).includes(replacement));
 await auth.changePassword(first.id,replacement,secret);
});
test('encuesta determina las capacidades globales',()=>{
 assert.equal(hasMeat(farm),true);assert.equal(hasMilk(farm),false);
 const dairy={...farm,orientacionPorEspecie:{Ovino:'Leche'}};assert.equal(hasMilk(dairy),true);assert.equal(hasMeat(dairy),false);
 const mixed={...farm,orientacionPorEspecie:{Ovino:'Mixto'}};assert.ok(hasMilk(mixed)&&hasMeat(mixed));
});
test('cálculos de edad, GMD, extrapolación y medias usan datos reales',()=>{
 assert.equal(age('2024-04-20','2026-04-19'),'1 año y 11 meses');
 const animal=db.loadData(first.id).animals[0];
 const rows=[{id:'w1',animalId:animal.id,fecha:'2025-01-01',pesoKg:100},{id:'w2',animalId:animal.id,fecha:'2025-01-11',pesoKg:120}];
 assert.equal(weightStats(animal,rows,'2025-01-16').gmd,2);assert.equal(weightStats(animal,rows,'2025-01-16').current,130);
 assert.equal(weightStats(animal,rows.slice(0,1),'2025-01-16').gmd,null);
 assert.equal(milkSeries([{id:'m1',fecha:'2025-01-07',litros:70}],7,'2025-01-07').reduce((s,r)=>s+r.value,0)/7,10);
});
test('factura calcula base, compensación o IVA y retención con redondeo',()=>{
 const template={...db.emptySaleTemplate(farm),items:[{id:'line',descripcion:'Producto',cantidad:2,precioUnitarioEuro:500,subtotalEuro:1000}]};
 assert.deepEqual(saleTotals(template),{base:1000,tax:105,withholding:20,total:1085});
 assert.deepEqual(saleTotals({...template,regimen:'General',ivaPorcentaje:10,irpfPorcentaje:1}),{base:1000,tax:100,withholding:10,total:1090});
 assert.equal(saleTotals({...template,items:[{...template.items[0],cantidad:3,precioUnitarioEuro:0.1}]}).base,0.3);
});
test('exporta todos los datos sin credenciales y valida la copia',()=>{
 const backup=createBackup(first,db.loadData(first.id));assert.ok(!JSON.stringify(backup).includes('passwordHash'));assert.ok(!JSON.stringify(backup).includes(first.salt));assert.equal(parseBackup(backup).data.animals.length,1);
 db.replaceData(second.id,parseBackup(backup).data);assert.deepEqual(db.loadData(first.id),db.loadData(second.id));
});
test('rechaza copias truncadas, relaciones rotas, duplicados e importes inválidos',()=>{
 const backup=createBackup(first,db.loadData(first.id));
 const mutate=fn=>{const copy=structuredClone(backup);fn(copy);assert.throws(()=>parseBackup(copy),/no es válida/);};
 mutate(x=>x.version=1);mutate(x=>x.data.animals[0].fechaNacimiento='2099-01-01');mutate(x=>x.data.animals[0].costeAcumuladoEuro=-1);
 mutate(x=>x.data.animals.push({...x.data.animals[0],id:'different'}));mutate(x=>x.data.animals[0].criasAsociadas=['missing']);
 mutate(x=>x.data.weightRecords=[{id:'w',animalId:'missing',fecha:'2025-01-01',pesoKg:2}]);
 mutate(x=>x.data.milkRecords=[{id:'a',fecha:'2025-01-01',litros:20,ordeno:1},{id:'b',fecha:'2025-01-01',litros:10,ordeno:1,animalId:x.data.animals[0].id}]);
 mutate(x=>x.data.invoices=[{id:'i',tipo:'Venta',titulo:'x',fecha:'2025-01-01',proveedorOCliente:'',importeTotalEuro:1,categoria:'Otros',imagenUrl:'javascript:bad'}]);
});
test('borrar una cuenta elimina sus seis claves y conserva la otra',()=>{
 const original=db.loadData(first.id);auth.deleteUser(second.id);
 for(const kind of ['farm','animals','invoices','saleTemplate','milkRecords','weightRecords'])assert.equal(window.localStorage.getItem(db.dataKey(second.id,kind)),null);
 assert.deepEqual(db.loadData(first.id),original);assert.ok(auth.getUsers().some(u=>u.id===first.id));
});
test('cuota llena mantiene cambios en memoria, avisa y permite exportar',()=>{
 const original=db.loadData(first.id);window.localStorage.fail=true;
 const next={...original,farm:{...farm,nombreExplotacion:'Cambio en memoria'}};
 assert.equal(db.replaceData(first.id,next),false);assert.equal(db.loadData(first.id).farm.nombreExplotacion,'Cambio en memoria');assert.ok(storage.getStorageWarning().includes('memoria'));
 assert.equal(createBackup(first,db.loadData(first.id)).data.farm.nombreExplotacion,'Cambio en memoria');
 window.localStorage.fail=false;db.replaceData(first.id,original);
});
