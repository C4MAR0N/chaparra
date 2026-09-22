import assert from 'node:assert/strict';
import test from 'node:test';
import { webcrypto } from 'node:crypto';
globalThis.crypto ??= webcrypto;

const { fusionarCopia, describirFusion } = await import('../src/services/fusionarCopia.ts');
const { isFarmData } = await import('../src/lib/validation.ts');

/*
 * La fusión no solo tiene que añadir lo que falta: tiene que dejar la
 * explotación en un estado que la validación acepte. Si no, al recargar la
 * aplicación la descarta entera y el ganadero se queda sin nada. Por eso casi
 * todas las pruebas terminan comprobando `isFarmData`.
 */

const animal = (crotal, extra = {}) => ({
  id: 'id-' + crotal,
  crotal,
  especie: 'Vacuno',
  orientacion: 'Carne',
  ubicacion: 'Pantano',
  numeroPartos: 0,
  fechaNacimiento: '2022-03-01',
  criasAsociadas: [],
  estadoSanitario: 'Sano',
  raza: 'Avileña',
  sexo: 'Hembra',
  categoria: 'Activo',
  fechaAlta: '2022-03-01',
  historialSanitario: [],
  ...extra
});

const PLANTILLA = {
  numeroFactura: '',
  fechaEmision: '2026-01-01',
  nombreGanadero: 'Titular',
  nifCif: '',
  codigoRega: '',
  direccion: '',
  telefono: '',
  email: '',
  clienteNombre: '',
  clienteNif: '',
  clienteDireccion: '',
  items: [],
  regimen: 'REAGP',
  ivaPorcentaje: 10,
  irpfPorcentaje: 2,
  compensacionPorcentaje: 10.5,
  lugarOperacion: '',
  fechaOperacion: '2026-01-01',
  notasPie: ''
};

const EXPLOTACION = {
  nombreExplotacion: 'La Cerquilla',
  titular: 'Javier',
  especies: ['Vacuno'],
  orientacionPorEspecie: { Vacuno: 'Carne' },
  moneda: 'EUR'
};

const datos = (extra = {}) => ({
  farm: EXPLOTACION,
  animals: [],
  invoices: [],
  saleTemplate: PLANTILLA,
  milkRecords: [],
  weightRecords: [],
  lotes: [],
  ...extra
});

test('añade los animales nuevos y respeta los crotales que ya estaban', () => {
  const actual = datos({ animals: [animal('ES1', { ubicacion: 'Virgen', raza: 'Retinta' })] });
  const entrante = datos({
    animals: [animal('ES1', { ubicacion: 'Pantano', raza: 'Avileña' }), animal('ES2')]
  });
  const { datos: fusion, resumen } = fusionarCopia(actual, entrante);

  assert.equal(resumen.animalesAnadidos, 1);
  assert.equal(resumen.animalesYaEstaban, 1);
  assert.equal(fusion.animals.length, 2);
  const yaEstaba = fusion.animals.find(a => a.crotal === 'ES1');
  assert.equal(yaEstaba.ubicacion, 'Virgen', 'la ficha del ganadero manda sobre la de la copia');
  assert.equal(yaEstaba.raza, 'Retinta');
  assert.ok(isFarmData(fusion));
});

test('el crotal se compara sin espacios ni mayúsculas', () => {
  const actual = datos({ animals: [animal('ES1')] });
  const entrante = datos({ animals: [animal(' es1 ')] });
  const { resumen } = fusionarCopia(actual, entrante);
  assert.equal(resumen.animalesYaEstaban, 1);
  assert.equal(resumen.animalesAnadidos, 0);
});

test('las crías de la copia se reenganchan a los animales que resultan', () => {
  const madre = animal('ES1', { criasAsociadas: ['id-ES2'] });
  const entrante = datos({ animals: [madre, animal('ES2')] });
  const { datos: fusion } = fusionarCopia(datos(), entrante);

  const guardada = fusion.animals.find(a => a.crotal === 'ES1');
  const cria = fusion.animals.find(a => a.crotal === 'ES2');
  assert.deepEqual(guardada.criasAsociadas, [cria.id]);
  assert.ok(isFarmData(fusion));
});

test('una madre que ya estaba recibe las crías nuevas de la copia', () => {
  const actual = datos({ animals: [animal('ES1')] });
  const entrante = datos({
    animals: [animal('ES1', { criasAsociadas: ['id-ES2'] }), animal('ES2')]
  });
  const { datos: fusion } = fusionarCopia(actual, entrante);

  const madre = fusion.animals.find(a => a.crotal === 'ES1');
  const cria = fusion.animals.find(a => a.crotal === 'ES2');
  assert.deepEqual(madre.criasAsociadas, [cria.id], 'la relación no se pierde por ya existir');
  assert.ok(isFarmData(fusion));
});

test('una cría que ya tiene madre no se la roba la copia', () => {
  const actual = datos({
    animals: [animal('ES1', { criasAsociadas: ['id-ES3'] }), animal('ES3')]
  });
  const entrante = datos({
    animals: [animal('ES2', { criasAsociadas: ['id-ES3'] }), animal('ES3')]
  });
  const { datos: fusion } = fusionarCopia(actual, entrante);

  const madres = fusion.animals.filter(a => a.criasAsociadas.length);
  assert.equal(madres.length, 1, 'sigue habiendo una sola madre');
  assert.equal(madres[0].crotal, 'ES1', 'y es la que ya tenía el ganadero');
  assert.ok(isFarmData(fusion));
});

test('los identificadores repetidos se renumeran en vez de chocar', () => {
  // Dos animales distintos con el mismo identificador: pasa al importar un
  // archivo generado dos veces a partir de la misma lista.
  const actual = datos({ animals: [animal('ES1')] });
  const entrante = datos({ animals: [{ ...animal('ES9'), id: 'id-ES1' }] });
  const { datos: fusion, resumen } = fusionarCopia(actual, entrante);

  assert.equal(resumen.animalesAnadidos, 1);
  assert.equal(new Set(fusion.animals.map(a => a.id)).size, 2);
  assert.ok(isFarmData(fusion));
});

test('los ordeños y las pesadas siguen a su animal, y los huérfanos se descartan', () => {
  const actual = datos({ animals: [animal('ES1')] });
  const entrante = datos({
    animals: [animal('ES1')],
    milkRecords: [{ id: 'o1', fecha: '2026-05-02', animalId: 'id-ES1', litros: 9, ordeno: 1 }],
    weightRecords: [
      { id: 'w1', fecha: '2026-05-02', animalId: 'id-ES1', pesoKg: 480 },
      { id: 'w2', fecha: '2026-05-02', animalId: 'no-existe', pesoKg: 400 }
    ]
  });
  const { datos: fusion, resumen } = fusionarCopia(actual, entrante);

  assert.equal(resumen.ordenosAnadidos, 1);
  assert.equal(resumen.pesadasAnadidas, 1);
  assert.equal(resumen.descartados, 1, 'la pesada sin animal no puede entrar');
  assert.equal(fusion.weightRecords[0].animalId, fusion.animals[0].id);
  assert.ok(isFarmData(fusion));
});

test('importar dos veces el mismo archivo no duplica nada', () => {
  const entrante = datos({
    animals: [animal('ES1')],
    invoices: [
      {
        id: 'f1',
        tipo: 'Compra / Gasto',
        titulo: 'Pienso',
        fecha: '2026-05-02',
        proveedorOCliente: 'Proveedor',
        importeTotalEuro: 100,
        categoria: 'Pienso/Alimentación'
      }
    ],
    weightRecords: [{ id: 'w1', fecha: '2026-05-02', animalId: 'id-ES1', pesoKg: 480 }]
  });
  const primera = fusionarCopia(datos(), entrante);
  const segunda = fusionarCopia(primera.datos, entrante);

  assert.equal(segunda.resumen.animalesAnadidos, 0);
  assert.equal(segunda.resumen.facturasAnadidas, 0);
  assert.equal(segunda.resumen.pesadasAnadidas, 0);
  assert.deepEqual(
    [segunda.datos.animals.length, segunda.datos.invoices.length],
    [1, 1],
    'la explotación no crece al repetir la importación'
  );
  assert.ok(isFarmData(segunda.datos));
});

test('la explotación y la plantilla del ganadero no se pisan', () => {
  const actual = datos({ farm: { ...EXPLOTACION, nombreExplotacion: 'La mía' } });
  const entrante = datos({
    farm: { ...EXPLOTACION, nombreExplotacion: 'La de la copia' },
    saleTemplate: { ...PLANTILLA, nombreGanadero: 'Otro' }
  });
  const { datos: fusion } = fusionarCopia(actual, entrante);
  assert.equal(fusion.farm.nombreExplotacion, 'La mía');
  assert.equal(fusion.saleTemplate.nombreGanadero, 'Titular');
});

test('quien todavía no ha rellenado la encuesta se queda con la de la copia', () => {
  const { datos: fusion } = fusionarCopia(datos({ farm: null }), datos());
  assert.equal(fusion.farm.nombreExplotacion, 'La Cerquilla');
});

test('el resumen se lee en castellano y en singular cuando toca', () => {
  assert.match(
    describirFusion({
      animalesAnadidos: 1,
      animalesYaEstaban: 0,
      facturasAnadidas: 0,
      ordenosAnadidos: 0,
      pesadasAnadidas: 0,
      descartados: 0
    }),
    /Se han añadido 1 animal nuevo/
  );
  assert.match(
    describirFusion(
      {
        animalesAnadidos: 5,
        animalesYaEstaban: 20,
        facturasAnadidas: 0,
        ordenosAnadidos: 0,
        pesadasAnadidas: 0,
        descartados: 0
      },
      true
    ),
    /Se añadirán 5 animales nuevos.*20 crotales ya están/s,
    'la previsión se cuenta en futuro: todavía no ha pasado'
  );
  assert.match(
    describirFusion({
      animalesAnadidos: 12,
      animalesYaEstaban: 3,
      facturasAnadidas: 0,
      ordenosAnadidos: 0,
      pesadasAnadidas: 0,
      lotesAnadidos: 0,
      descartados: 0
    }),
    /12 animales nuevos.*3 crotales ya están/s
  );
  assert.match(
    describirFusion({
      animalesAnadidos: 0,
      animalesYaEstaban: 0,
      facturasAnadidas: 0,
      ordenosAnadidos: 0,
      pesadasAnadidas: 0,
      lotesAnadidos: 0,
      descartados: 0
    }),
    /no traía nada/
  );
});

test('los lotes de la copia se traen con los animales que resuelven', () => {
  /*
   * El destete de la copia habla de dos corderos: uno que el ganadero ya tiene
   * (mismo crotal) y otro que no existe. Perder el lote entero por el que falta
   * seria peor que traerlo con los que hay, asi que entra recortado y lo que
   * queda fuera se cuenta como descartado.
   */
  const actual = datos({ animals: [animal('ES1')] });
  const entrante = datos({
    animals: [animal('ES1')],
    lotes: [
      {
        id: 'l1',
        tipo: 'Destete',
        fecha: '2026-05-02',
        animalIds: ['id-ES1', 'no-existe']
      }
    ]
  });
  const { datos: fusion, resumen } = fusionarCopia(actual, entrante);

  assert.equal(resumen.lotesAnadidos, 1);
  assert.equal(resumen.descartados, 1, 'el miembro que no resuelve se cuenta aparte');
  assert.deepEqual(fusion.lotes[0].animalIds, [fusion.animals[0].id]);
  assert.ok(isFarmData(fusion));
});

test('un lote del que no resuelve ningun animal se queda fuera', () => {
  // La validacion rechaza un lote vacio: traerlo asi romperia la explotacion.
  const entrante = datos({
    lotes: [{ id: 'l1', tipo: 'Venta', fecha: '2026-05-02', animalIds: ['fantasma'] }]
  });
  const { datos: fusion, resumen } = fusionarCopia(datos(), entrante);
  assert.equal(fusion.lotes.length, 0);
  assert.equal(resumen.lotesAnadidos, 0);
  assert.ok(isFarmData(fusion));
});

test('importar dos veces la misma copia no duplica los lotes', () => {
  const entrante = datos({
    animals: [animal('ES1')],
    lotes: [{ id: 'l1', tipo: 'Destete', fecha: '2026-05-02', animalIds: ['id-ES1'] }]
  });
  const primera = fusionarCopia(datos(), entrante);
  const segunda = fusionarCopia(primera.datos, entrante);
  assert.equal(segunda.datos.lotes.length, 1);
  assert.equal(segunda.resumen.lotesAnadidos, 0);
});
