import assert from 'node:assert/strict';
import test from 'node:test';

const {
  ubicacionesDisponibles,
  crearUbicacion,
  renombrarUbicacion,
  borrarUbicacion,
  fichasEn,
  limpiarUbicacion,
  nombreTrasRenombrar
} = await import('../src/lib/ubicaciones.ts');
const { isFarmData } = await import('../src/lib/validation.ts');

/*
 * Ubicaciones como lista cerrada.
 *
 * Lo que se prueba aquí es lo que motivó el cambio: que una errata no pueda
 * partir una manada en dos, que las erratas de antes se puedan arreglar, y que
 * una explotación de antes —sin lista— no pierda ninguna de sus ubicaciones.
 */

const PLANTILLA = {
  numeroFactura: '',
  fechaEmision: '2026-01-01',
  nombreGanadero: 'Javier',
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
  compensacionPorcentaje: 10.5,
  irpfPorcentaje: 2,
  lugarOperacion: '',
  fechaOperacion: '2026-01-01',
  notasPie: ''
};

const animal = (crotal, ubicacion, extra = {}) => ({
  id: `id-${crotal}`,
  crotal,
  especie: 'Vacuno',
  orientacion: 'Carne',
  ubicacion,
  numeroPartos: 0,
  fechaNacimiento: '2020-01-01',
  criasAsociadas: [],
  estadoSanitario: 'Sano',
  raza: '',
  sexo: 'Hembra',
  categoria: 'Activo',
  fechaAlta: '2020-01-01',
  historialSanitario: [],
  ...extra
});

const datos = (animals, ubicaciones) => ({
  farm: {
    nombreExplotacion: 'La Cerquilla',
    titular: 'Javier',
    especies: ['Vacuno'],
    orientacionPorEspecie: { Vacuno: 'Carne' },
    moneda: 'EUR',
    ...(ubicaciones ? { ubicaciones } : {})
  },
  animals,
  invoices: [],
  saleTemplate: PLANTILLA,
  milkRecords: [],
  weightRecords: [],
  lotes: []
});

test('una explotación de antes, sin lista, conserva todas sus ubicaciones', () => {
  // Las 235 vacas de Javier llegan sin lista: salen de sus propias fichas.
  const d = datos([animal('ES1', 'Pantano'), animal('ES2', 'Virgen'), animal('ES3', 'Pantano')]);
  assert.deepEqual(ubicacionesDisponibles(d.farm, d.animals), ['Pantano', 'Virgen']);
});

test('la lista junta las creadas y las que usan los animales, ordenadas', () => {
  const d = datos([animal('ES1', 'Virgen')], ['Cercado Norte', 'Alameda']);
  assert.deepEqual(ubicacionesDisponibles(d.farm, d.animals), [
    'Alameda',
    'Cercado Norte',
    'Virgen'
  ]);
});

test('un animal sin ubicación no mete una opción vacía', () => {
  const d = datos([animal('ES1', ''), animal('ES2', '   ')]);
  assert.deepEqual(ubicacionesDisponibles(d.farm, d.animals), []);
});

test('las variantes de mayúsculas se enseñan, para poder arreglarlas', () => {
  /*
   * Juntarlas en el desplegable escondería el problema: el filtro las sigue
   * viendo distintas, y el ganadero no sabría por qué le faltan vacas.
   */
  const d = datos([animal('ES1', 'Pantano'), animal('ES2', 'pantano')]);
  assert.deepEqual(ubicacionesDisponibles(d.farm, d.animals), ['pantano', 'Pantano']);
});

test('crear una ubicación la añade a la lista de la explotación', () => {
  const salida = crearUbicacion(datos([]), '  Cercado   del  Pantano ');
  assert.deepEqual(salida.farm.ubicaciones, ['Cercado del Pantano'], 'sin espacios de sobra');
  assert.ok(isFarmData(salida));
});

test('no se puede crear una que ya existe con otras mayúsculas', () => {
  // Es exactamente la errata que la lista existe para evitar.
  const d = datos([animal('ES1', 'Pantano')]);
  assert.throws(() => crearUbicacion(d, 'pantano'), /Ya existe «Pantano»/);
  assert.throws(() => crearUbicacion(d, ' PANTANO '), /Ya existe/);
});

test('un nombre vacío o demasiado largo no se crea', () => {
  assert.throws(() => crearUbicacion(datos([]), '   '), /Escribe el nombre/);
  assert.throws(() => crearUbicacion(datos([]), 'x'.repeat(61)), /demasiado largo/);
});

test('renombrar mueve a todos los animales que la usaban', () => {
  const d = datos(
    [animal('ES1', 'Pantno'), animal('ES2', 'Pantno'), animal('ES3', 'Virgen')],
    ['Pantno', 'Virgen']
  );
  const salida = renombrarUbicacion(d, 'Pantno', 'Pantano');
  assert.deepEqual(
    salida.animals.map(a => a.ubicacion),
    ['Pantano', 'Pantano', 'Virgen']
  );
  assert.deepEqual(salida.farm.ubicaciones.sort(), ['Pantano', 'Virgen']);
  assert.ok(isFarmData(salida));
});

test('renombrar una errata al nombre bueno junta los dos cercados en uno', () => {
  /*
   * «Pantno» a «pantano» teniendo ya «Pantano»: no se crea un tercero, los
   * animales pasan al que ya estaba y con su forma de escribirlo.
   */
  const d = datos([animal('ES1', 'Pantano'), animal('ES2', 'Pantno')], ['Pantano', 'Pantno']);
  const salida = renombrarUbicacion(d, 'Pantno', 'pantano');
  assert.deepEqual(
    salida.animals.map(a => a.ubicacion),
    ['Pantano', 'Pantano']
  );
  assert.deepEqual(ubicacionesDisponibles(salida.farm, salida.animals), ['Pantano']);
});

test('renombrar arregla también las que venían de una ficha sin lista', () => {
  // Explotación de antes: la errata solo existe en las fichas.
  const d = datos([animal('ES1', 'Virjen'), animal('ES2', 'Virgen')]);
  const salida = renombrarUbicacion(d, 'Virjen', 'Virgen');
  assert.deepEqual(ubicacionesDisponibles(salida.farm, salida.animals), ['Virgen']);
});

test('renombrar sin cambiar nada no toca los datos', () => {
  const d = datos([animal('ES1', 'Pantano')], ['Pantano']);
  assert.equal(renombrarUbicacion(d, 'Pantano', ' Pantano '), d);
});

test('no se puede renombrar una ubicación que ya no existe', () => {
  assert.throws(() => renombrarUbicacion(datos([]), 'Fantasma', 'Otra'), /ya no existe/);
});

test('solo se puede borrar una ubicación vacía', () => {
  const d = datos([animal('ES1', 'Pantano')], ['Pantano', 'Alameda']);
  assert.throws(() => borrarUbicacion(d, 'Pantano'), /la usan 1 ficha/);
  assert.deepEqual(borrarUbicacion(d, 'Alameda').farm.ubicaciones, ['Pantano']);
});

test('una vendida también cuenta: sigue diciendo dónde estaba', () => {
  const d = datos(
    [animal('ES1', 'Pantano', { categoria: 'Vendido', fechaBaja: '2026-01-01' })],
    ['Pantano']
  );
  assert.equal(fichasEn(d.animals, 'Pantano'), 1);
  assert.throws(() => borrarUbicacion(d, 'Pantano'), /Muévelas o renómbrala/);
});

test('la validación rechaza una lista con repetidas o nombres vacíos', () => {
  assert.equal(isFarmData(datos([], ['Pantano', 'Pantano'])), false);
  assert.equal(isFarmData(datos([], ['Pantano', ''])), false);
  assert.equal(isFarmData(datos([], ['Pantano', 'Virgen'])), true);
});

test('limpiar quita los espacios que no se ven', () => {
  assert.equal(limpiarUbicacion('  Cercado   del Pantano  '), 'Cercado del Pantano');
});

test('el nombre final es el que ya existía, no el tecleado', () => {
  // Lo que se le dice al ganadero tiene que ser adonde han ido de verdad.
  const d = datos([animal('ES1', 'Pantano'), animal('ES2', 'Pantno')]);
  assert.equal(nombreTrasRenombrar(d, 'Pantno', 'pantano'), 'Pantano');
  assert.equal(nombreTrasRenombrar(d, 'Pantno', '  Charca  Nueva '), 'Charca Nueva');
});
