import assert from 'node:assert/strict';
import test from 'node:test';
import { interpretarFactura } from '../src/lib/factura.ts';

/*
 * Batería de formatos reales.
 *
 * `factura.test.mjs` prueba las piezas sueltas. Esto prueba facturas enteras,
 * escritas como las escriben de verdad la cooperativa, el veterinario, la
 * gasolinera y el matadero: cada una con su manera de decir «total», su formato
 * de fecha y su forma de colocar el membrete.
 *
 * Una factura aquí es un caso que se ha visto o que es verosímil. Si alguna
 * falla, el intérprete no está listo para el campo.
 */

const HOY = '2026-09-18';

const casos = [
  {
    nombre: 'cooperativa, total al final y fecha con barras',
    texto: `COOPERATIVA AGRÍCOLA SAN ISIDRO S.COOP.
CIF F45001122
Avda. de la Estación 14 · 45600 Talavera de la Reina

FACTURA SIMPLIFICADA        Nº 2026/04417
Fecha: 03/09/2026

Ref.      Descripción                 Uds    Precio    Importe
1140      Pienso vacuno nodriza 25kg    80     14,20   1.136,00
2210      Corrector mineral bloque       6     23,50     141,00

                         BASE IMPONIBLE   1.277,00
                         IVA 10%            127,70
                         TOTAL FACTURA    1.404,70 €`,
    espera: {
      importeTotalEuro: 1404.7,
      fecha: '2026-09-03',
      categoria: 'Pienso/Alimentación',
      tipo: 'Compra / Gasto'
    },
    proveedorContiene: 'SAN ISIDRO'
  },
  {
    nombre: 'gasolinera, fecha con guiones y total con el euro delante',
    texto: `ESTACIÓN DE SERVICIO LA DEHESA S.L.
B10223344
Ctra. N-V km 148

Fecha 12-08-2026   Hora 08:14
Surtidor 3  GASÓLEO B AGRÍCOLA
Litros 620,00   Precio/L 0,899

Base        557,38
IVA 21%     117,05
TOTAL     € 674,43`,
    espera: {
      importeTotalEuro: 674.43,
      fecha: '2026-08-12',
      categoria: 'Maquinaria/Combustible'
    }
  },
  {
    nombre: 'veterinario, persona física y fecha con puntos',
    texto: `Luis Ramos Prieto
Veterinario colegiado nº 1180
N.I.F. 04512874P

Fecha: 22.07.2026

Saneamiento y vacunación de 40 reses
Desplazamiento

Importe total: 360,00 €`,
    espera: {
      importeTotalEuro: 360,
      fecha: '2026-07-22',
      categoria: 'Veterinario/Sanidad',
      nif: '04512874P'
    },
    proveedorContiene: 'Luis Ramos Prieto'
  },
  {
    nombre: 'matadero, liquidación de canal como ingreso',
    texto: `MATADERO COMARCAL DEL OESTE S.A.
A45778899

LIQUIDACIÓN DE CANALES
Fecha de emisión: 01/07/2026

4 canales de añojo, 1.284,50 kg
Precio medio 4,85 €/kg

Total a pagar al ganadero      6.229,83`,
    espera: {
      importeTotalEuro: 6229.83,
      fecha: '2026-07-01',
      categoria: 'Venta Ganado',
      tipo: 'Venta'
    }
  },
  {
    nombre: 'central lechera, venta de leche del mes',
    texto: `CENTRAL LECHERA CASTELLANA S.L.
Fecha 31/05/2026
Recogida de leche de mayo: 18.420 litros a 0,52 €/litro
TOTAL A ABONAR 9.578,40`,
    espera: {
      importeTotalEuro: 9578.4,
      fecha: '2026-05-31',
      categoria: 'Venta Leche',
      tipo: 'Venta'
    }
  },
  {
    nombre: 'fecha escrita con letras y total sin decimales marcados',
    texto: `SUMINISTROS GANADEROS EL ENCINAR S.L.
Talavera, a 9 de junio de 2026

Alambre de espino y postes
TOTAL: 245,00`,
    espera: { importeTotalEuro: 245, fecha: '2026-06-09' }
  },
  {
    nombre: 'fecha en formato internacional, que escriben los programas',
    texto: `AGROSERVICIOS DEL TAJO S.L.
Fecha de emisión: 2026-04-17
Pienso de cebo
TOTAL A PAGAR 812,90`,
    espera: { importeTotalEuro: 812.9, fecha: '2026-04-17' }
  },
  {
    nombre: 'el total va en la línea de abajo, como en las facturas en columnas',
    texto: `PIENSOS DEL TAJO S.L.
Fecha: 15/03/2026
Base imponible
1.000,00
IVA 10%
100,00
TOTAL FACTURA
1.100,00`,
    espera: { importeTotalEuro: 1100, fecha: '2026-03-15' }
  },
  {
    nombre: 'vencimiento posterior que no debe confundirse con la emisión',
    texto: `COOPERATIVA DEL CAMPO S.COOP.
Fecha factura: 04/02/2026
Vencimiento: 04/04/2026
Paja de cebada
Total a pagar 430,00`,
    espera: { importeTotalEuro: 430, fecha: '2026-02-04' }
  },
  {
    nombre: 'membrete debajo del concepto, que pasa en los albaranes',
    texto: `ALBARÁN DE ENTREGA Nº 771
Fecha: 20/01/2026

Alfalfa en rama, 12 pacas

Expedido por TRANSPORTES Y FORRAJES DEL SUR S.L.
CIF B41556677
Total 528,00 €`,
    espera: { importeTotalEuro: 528, fecha: '2026-01-20', categoria: 'Pienso/Alimentación' },
    proveedorContiene: 'FORRAJES DEL SUR'
  },
  {
    nombre: 'importe de cuatro cifras con punto de millar y varias cantidades sueltas',
    texto: `GANADERA DEL OESTE S.L.
Fecha: 11/12/2025
Crotales auriculares 500 uds     0,42      210,00
Aplicador                        35,00      35,00
Base imponible                             245,00
IVA 21%                                     51,45
TOTAL FACTURA                              296,45`,
    espera: { importeTotalEuro: 296.45, fecha: '2025-12-11', categoria: 'Veterinario/Sanidad' }
  },
  {
    nombre: 'todo en mayúsculas y sin acentos, como sale de muchas impresoras',
    texto: `PIENSOS COMPUESTOS LA MANCHA SL
CIF B13445566
FECHA 07/11/2025
PIENSO OVINO CEBO 1000 KG
TOTAL A PAGAR 452,30 EUR`,
    espera: {
      importeTotalEuro: 452.3,
      fecha: '2025-11-07',
      categoria: 'Pienso/Alimentación'
    }
  }
];

for (const caso of casos) {
  test(`lee la factura: ${caso.nombre}`, () => {
    const s = interpretarFactura(caso.texto, HOY);
    for (const [campo, valor] of Object.entries(caso.espera)) {
      assert.equal(s[campo], valor, `${campo}: esperaba ${valor} y ha leído ${s[campo]}`);
    }
    if (caso.proveedorContiene) {
      assert.ok(
        (s.proveedor ?? '').includes(caso.proveedorContiene),
        `proveedor: esperaba algo con «${caso.proveedorContiene}» y ha leído «${s.proveedor}»`
      );
    }
  });
}

test('resumen: el importe y la fecha se leen en todas las facturas de la batería', () => {
  const fallos = casos
    .map(c => ({ nombre: c.nombre, s: interpretarFactura(c.texto, HOY) }))
    .filter(({ s }) => s.importeTotalEuro === undefined || !s.fecha)
    .map(({ nombre }) => nombre);
  assert.deepEqual(fallos, [], 'facturas sin importe o sin fecha');
});

test('no se inventa un proveedor cuando el texto no lo tiene', () => {
  const s = interpretarFactura('TOTAL 30,00\nIVA 21%', HOY);
  assert.equal(s.importeTotalEuro, 30);
  assert.equal(s.proveedor, undefined, 'sin membrete no hay proveedor que valga');
});

test('una foto ilegible no rellena nada', () => {
  for (const ruido of ['', '   ', '### ~~~ ???', 'aaaa bbbb cccc']) {
    const s = interpretarFactura(ruido, HOY);
    assert.equal(s.importeTotalEuro, undefined, `ruido «${ruido}» no debería dar importe`);
    assert.equal(s.fecha, undefined);
  }
});

test('las líneas de artículo no se leen como un importe gigante', () => {
  /*
   * Encontrado probando facturas reales bajadas de internet. Admitir el espacio
   * como separador de miles hacía que «Producto 1 2 100 200,00» se leyera como
   * cien mil doscientos euros, y «4 150 600,00» como cuatro millones. En una
   * factura con líneas de artículo, que son casi todas, pasaba siempre.
   */
  const s = interpretarFactura(
    [
      'COMERCIAL DE EJEMPLO S.L.',
      'Fecha de factura: 17/04/2024',
      'Producto 1 2 100 200,00',
      'Producto 2 4 150 600,00',
      'Producto 3 7 93 651,00',
      'BASE IMPONIBLE: 1.451 €',
      'IVA (21%) : 304,71 €',
      'TOTAL: 1.755,71 €'
    ].join('\n'),
    HOY
  );
  assert.equal(s.importeTotalEuro, 1755.71);
});

test('un importe de miles sin decimales y con euro se lee entero', () => {
  // «1.451 €» son mil cuatrocientos cincuenta y uno, no uno con cuarenta y cinco.
  const s = interpretarFactura('PROVEEDOR S.L.\nFecha: 17/04/2024\nTOTAL: 1.451 €', HOY);
  assert.equal(s.importeTotalEuro, 1451);
});

test('las columnas separadas por varios espacios no se juntan en un importe', () => {
  // «80     14,20» son dos cantidades de una tabla, no «8014,20».
  const s = interpretarFactura(
    'PIENSOS S.L.\nFecha: 03/09/2026\nPienso   80     14,20   1.136,00\nTOTAL FACTURA 1.136,00',
    HOY
  );
  assert.equal(s.importeTotalEuro, 1136);
});

test('un total menor que la base no se propone: la lectura está rota', () => {
  /*
   * Caso real de una foto movida: el OCR leyó «1.404,70» como «1,40» y el
   * intérprete lo daba por bueno porque estaba junto a TOTAL. Un importe falso
   * que parece verosímil se cuela en las cuentas sin que nadie lo note.
   */
  const s = interpretarFactura(
    'COOPERATIVA S.COOP.\nFecha: 03/09/2026\nBASE IMPONIBLE 1.277,00\nTOTAL FACTURA 1,40',
    HOY
  );
  assert.equal(s.importeTotalEuro, undefined);
  assert.ok(!s.encontrados.includes('el importe'));
});

test('el total sigue valiendo cuando es la cantidad mayor, como debe ser', () => {
  const s = interpretarFactura(
    'COOPERATIVA S.COOP.\nFecha: 03/09/2026\nBASE IMPONIBLE 1.277,00\nIVA 10% 127,70\nTOTAL FACTURA 1.404,70',
    HOY
  );
  assert.equal(s.importeTotalEuro, 1404.7);
});

test('«Número de factura» no se toma por el nombre del proveedor', () => {
  // Salía como proveedor en dos de las facturas reales bajadas de internet.
  const s = interpretarFactura(
    ['Factura', 'Número de factura: 2024-0001', 'COMERCIAL DE EJEMPLO S.L.', 'TOTAL: 120,00'].join(
      '\n'
    ),
    HOY
  );
  assert.equal(s.proveedor, 'COMERCIAL DE EJEMPLO S.L.');
});
