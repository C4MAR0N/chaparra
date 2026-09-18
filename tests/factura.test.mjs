import assert from 'node:assert/strict';
import test from 'node:test';
import { interpretarFactura, numeroEspanol } from '../src/lib/factura.ts';

const HOY = '2026-09-17';

test('lee importes en formato español y anglosajón', () => {
  assert.equal(numeroEspanol('1.234,56'), 1234.56);
  assert.equal(numeroEspanol('1,234.56'), 1234.56);
  assert.equal(numeroEspanol('412,50 €'), 412.5);
  assert.equal(numeroEspanol('€ 89.90'), 89.9);
  assert.equal(numeroEspanol('45'), 45);
  assert.equal(numeroEspanol('sin cifras'), null);
});

test('saca importe, fecha, proveedor y categoría de una factura de pienso', () => {
  const s = interpretarFactura(
    `PIENSOS DEL TAJO S.L.
     CIF B45123456
     Ctra. de Oropesa km 3 - 45560 Toledo

     FACTURA Nº 2026/1184
     Fecha: 12/09/2026
     Cliente: La Cerquilla del Chaparral S.L.

     Concepto                Cantidad   Precio    Importe
     Pienso vacuno nodriza      2.000     0,32     640,00
     Corrector mineral            100     1,10     110,00

     Base imponible                               750,00
     IVA 10%                                       75,00
     TOTAL A PAGAR                                825,00 €`,
    HOY
  );
  assert.equal(s.importeTotalEuro, 825);
  assert.equal(s.fecha, '2026-09-12');
  assert.equal(s.proveedor, 'PIENSOS DEL TAJO S.L.');
  assert.equal(s.categoria, 'Pienso/Alimentación');
  assert.equal(s.tipo, 'Compra / Gasto');
  assert.equal(s.nif, 'B45123456');
  assert.equal(s.titulo, 'Factura de PIENSOS DEL TAJO S.L.');
});

test('no confunde la base imponible ni el porcentaje de IVA con el total', () => {
  const s = interpretarFactura(
    `Base imponible 1.000,00
     IVA 21% 210,00
     Total factura 1.210,00`,
    HOY
  );
  assert.equal(s.importeTotalEuro, 1210);
});

test('coge el importe de la línea siguiente cuando el total va solo en su fila', () => {
  const s = interpretarFactura(`TOTAL\n   347,20 €`, HOY);
  assert.equal(s.importeTotalEuro, 347.2);
});

test('sin una palabra que diga «total» no se propone importe', () => {
  /*
   * Antes se cogía la cantidad más alta. Con facturas de verdad eso falla: si
   * el lector se come la palabra TOTAL, la mayor pasa a ser una línea de
   * artículo o la base imponible, y se propone un número equivocado con toda la
   * pinta de ser bueno. Mejor que lo teclee la persona.
   */
  const s = interpretarFactura(`Vacunación 40,00\nDesplazamiento 15,00\n55,00`, HOY);
  assert.equal(s.importeTotalEuro, undefined);
  assert.ok(!s.encontrados.includes('el importe'));
});

test('prefiere la fecha de emisión y descarta la de vencimiento', () => {
  const s = interpretarFactura(
    `Fecha de emisión: 03/04/2026
     Fecha de vencimiento: 03/05/2026`,
    HOY
  );
  assert.equal(s.fecha, '2026-04-03');
});

test('entiende la fecha escrita con letras', () => {
  assert.equal(interpretarFactura('Oropesa, a 5 de marzo de 2026', HOY).fecha, '2026-03-05');
  assert.equal(interpretarFactura('12 de septiembre de 2025', HOY).fecha, '2025-09-12');
});

test('descarta fechas imposibles o futuras', () => {
  assert.equal(interpretarFactura('Fecha: 31/02/2026', HOY).fecha, undefined);
  assert.equal(interpretarFactura('Fecha: 45/13/2026', HOY).fecha, undefined);
  assert.equal(
    interpretarFactura('Fecha: 20/12/2027', HOY).fecha,
    undefined,
    'una factura no es de dentro de un año'
  );
});

test('reconoce la venta al matadero como ingreso', () => {
  const s = interpretarFactura(
    `MATADERO COMARCAL DE TALAVERA S.A.
     Liquidación de canal
     Fecha 01/09/2026
     Total a pagar 2.480,00 €`,
    HOY
  );
  assert.equal(s.tipo, 'Venta');
  assert.equal(s.categoria, 'Venta Ganado');
  assert.equal(s.importeTotalEuro, 2480);
});

test('clasifica al veterinario aunque el membrete sea un nombre de persona', () => {
  const s = interpretarFactura(
    `Luis Ramos Prieto
     Veterinario colegiado nº 1180
     NIF 04512874P
     Saneamiento y vacunación de 40 reses
     Fecha: 22/08/2026
     Importe total: 360,00`,
    HOY
  );
  assert.equal(s.categoria, 'Veterinario/Sanidad');
  assert.equal(s.proveedor, 'Luis Ramos Prieto');
  assert.equal(s.importeTotalEuro, 360);
  assert.equal(s.nif, '04512874P');
});

test('el gasóleo va a maquinaria y combustible', () => {
  const s = interpretarFactura('Suministro de gasóleo B 500 litros\nTOTAL 412,50', HOY);
  assert.equal(s.categoria, 'Maquinaria/Combustible');
});

test('un texto ilegible no inventa datos', () => {
  const s = interpretarFactura('   \n  \n ', HOY);
  assert.deepEqual(s, { encontrados: [] });
  const ruido = interpretarFactura('#### ???? ~~~~', HOY);
  assert.equal(ruido.importeTotalEuro, undefined);
  assert.equal(ruido.fecha, undefined);
  assert.deepEqual(ruido.encontrados, []);
});

test('enumera lo que ha encontrado para poder decir qué falta', () => {
  const completa = interpretarFactura(
    'PIENSOS DEL TAJO S.L.\nFecha: 12/09/2026\nTOTAL A PAGAR 825,00',
    HOY
  );
  assert.deepEqual(completa.encontrados, [
    'el importe',
    'la fecha',
    'el proveedor',
    'la categoría'
  ]);
  const suelta = interpretarFactura('TOTAL 30,00', HOY);
  assert.ok(suelta.encontrados.includes('el importe'));
  assert.ok(!suelta.encontrados.includes('la fecha'));
});

test('dos lecturas seguidas dan el mismo resultado', () => {
  const texto = 'GANADERA DEL OESTE S.L.\nCIF B45999888\nFecha: 01/07/2026\nTOTAL 120,00';
  assert.deepEqual(interpretarFactura(texto, HOY), interpretarFactura(texto, HOY));
});

test('los puntos de millar sin coma no se confunden con decimales', () => {
  // «1.451» son mil cuatrocientos cincuenta y uno; «89.90», ochenta y nueve noventa.
  assert.equal(numeroEspanol('1.451'), 1451);
  assert.equal(numeroEspanol('1.284.500'), 1284500);
  assert.equal(numeroEspanol('89.90'), 89.9);
  assert.equal(numeroEspanol('1.234,56'), 1234.56);
});
