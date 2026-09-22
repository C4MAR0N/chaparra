import assert from 'node:assert/strict';
import test from 'node:test';

const { aplicarLote, describirLote, etiquetaLote, animalesDelLote, lotesDeAnimal, esPrevisto } =
  await import('../src/services/lotes.ts');
const { isFarmData } = await import('../src/lib/validation.ts');
const { esActivo } = await import('../src/lib/domain.ts');

/*
 * Operaciones en grupo.
 *
 * Esto no pinta una pantalla: da de baja ganado. Una venta mal aplicada saca
 * diez animales del recuento de activos y se arrastra a los informes, al Excel
 * que ve el veterinario y a la valoración de la explotación. Por eso se prueba
 * qué le pasa exactamente a cada ficha, y sobre todo qué NO debe pasar.
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

const animal = (crotal, extra = {}) => ({
  id: `id-${crotal}`,
  crotal,
  especie: 'Ovino',
  orientacion: 'Carne',
  ubicacion: 'Virgen',
  numeroPartos: 0,
  fechaNacimiento: '2026-01-10',
  criasAsociadas: [],
  estadoSanitario: 'Sano',
  raza: 'Merina',
  sexo: 'Hembra',
  categoria: 'Activo',
  fechaAlta: '2026-01-10',
  historialSanitario: [],
  ...extra
});

const datos = (animals, lotes = []) => ({
  farm: {
    nombreExplotacion: 'La Cerquilla',
    titular: 'Javier',
    especies: ['Ovino'],
    orientacionPorEspecie: { Ovino: 'Carne' },
    moneda: 'EUR'
  },
  animals,
  invoices: [],
  saleTemplate: PLANTILLA,
  milkRecords: [],
  weightRecords: [],
  lotes
});

const FECHA = '2026-09-02';
// Por delante de hoy: un lote que se deja preparado.
const FUTURO = '2099-01-01';

test('una venta da de baja a todo el grupo y deja constancia de la operación', () => {
  const data = datos([animal('ES1'), animal('ES2'), animal('ES3')]);
  const salida = aplicarLote(data, {
    tipo: 'Venta',
    fecha: FECHA,
    animalIds: ['id-ES1', 'id-ES2']
  });

  const [uno, dos, tres] = salida.animals;
  assert.equal(uno.categoria, 'Vendido');
  assert.equal(uno.fechaBaja, FECHA);
  assert.equal(dos.categoria, 'Vendido');
  assert.equal(tres.categoria, 'Activo', 'el que no estaba seleccionado no se toca');
  assert.equal(tres.fechaBaja, undefined);

  assert.equal(salida.lotes.length, 1);
  assert.equal(salida.lotes[0].tipo, 'Venta');
  assert.deepEqual(salida.lotes[0].animalIds, ['id-ES1', 'id-ES2']);
  assert.ok(isFarmData(salida), 'la explotación resultante tiene que seguir siendo válida');
});

test('una baja por muerte deja «Muerto», no «Vendido»', () => {
  const salida = aplicarLote(datos([animal('ES1')]), {
    tipo: 'Baja',
    fecha: FECHA,
    animalIds: ['id-ES1']
  });
  assert.equal(salida.animals[0].categoria, 'Muerto');
  assert.equal(salida.animals[0].fechaBaja, FECHA);
});

test('un traslado cambia la ubicación y guarda el destino', () => {
  const salida = aplicarLote(datos([animal('ES1'), animal('ES2')]), {
    tipo: 'Traslado',
    fecha: FECHA,
    animalIds: ['id-ES1'],
    ubicacionDestino: '  Pantano  '
  });
  assert.equal(salida.animals[0].ubicacion, 'Pantano', 'se guarda sin espacios sobrantes');
  assert.equal(salida.animals[1].ubicacion, 'Virgen');
  assert.equal(salida.animals[0].categoria, 'Activo', 'trasladar no da de baja');
  assert.equal(salida.lotes[0].ubicacionDestino, 'Pantano');
});

test('un destete da de baja como «Destetado», con su fecha', () => {
  /*
   * En esta explotacion el destete es la salida de la cria: a partir de ese dia
   * ya no forma parte de la ganaderia. Por eso no es una anotacion al margen,
   * es una baja con todas las letras, como la venta.
   */
  const salida = aplicarLote(datos([animal('ES1'), animal('ES2')]), {
    tipo: 'Destete',
    fecha: FECHA,
    animalIds: ['id-ES1']
  });
  assert.equal(salida.animals[0].categoria, 'Destetado');
  assert.equal(salida.animals[0].fechaBaja, FECHA, 'la fecha del destete es la de baja');
  assert.equal(salida.animals[1].categoria, 'Activo', 'el que no iba en el lote no se toca');
  assert.equal(salida.lotes[0].tipo, 'Destete');
  assert.ok(isFarmData(salida));
});

test('un animal destetado deja de contar como activo', () => {
  const salida = aplicarLote(datos([animal('ES1')]), {
    tipo: 'Destete',
    fecha: FECHA,
    animalIds: ['id-ES1']
  });
  assert.equal(esActivo(salida.animals[0]), false);
});

test('no se puede vender ganado que ya está de baja', () => {
  const data = datos([
    animal('ES1'),
    animal('ES2', { categoria: 'Vendido', fechaBaja: '2026-08-01' })
  ]);
  assert.throws(
    () => aplicarLote(data, { tipo: 'Venta', fecha: FECHA, animalIds: ['id-ES1', 'id-ES2'] }),
    /ES2/,
    'el mensaje tiene que decir cuál es el que sobra'
  );
});

test('tampoco se puede destetar ganado que ya salio de la explotacion', () => {
  // Desde que el destete es una baja, destetar algo ya vendido no significa
  // nada y machacaria su categoria.
  const data = datos([animal('ES1', { categoria: 'Vendido', fechaBaja: '2026-08-01' })]);
  assert.throws(
    () => aplicarLote(data, { tipo: 'Destete', fecha: FECHA, animalIds: ['id-ES1'] }),
    /ES1/
  );
});

test('un lote se puede dejar preparado con fecha futura', () => {
  /*
   * El ganadero cierra el camion con antelacion y quiere dejar apuntada la
   * venta antes de que llegue el dia. El resto de la aplicacion no admite
   * fechas futuras, pero un lote es tanto un hecho como una decision.
   */
  const salida = aplicarLote(datos([animal('ES1')]), {
    tipo: 'Venta',
    fecha: FUTURO,
    animalIds: ['id-ES1']
  });
  assert.equal(salida.lotes[0].fecha, FUTURO);
  assert.equal(salida.animals[0].fechaBaja, FUTURO);
  assert.ok(isFarmData(salida), 'una baja con fecha futura tiene que seguir validando');
});

test('un lote previsto se distingue de uno ya hecho', () => {
  assert.equal(esPrevisto({ fecha: FUTURO }), true);
  assert.equal(esPrevisto({ fecha: FECHA }), false);
});

test('la venta prevista da de baja ya, no el dia de la fecha', () => {
  /*
   * Es la consecuencia incomoda de permitir la fecha futura, y esta probada a
   * proposito: si algun dia se decide que la baja se aplique al llegar el dia,
   * esta prueba tiene que fallar y obligar a pensarlo.
   */
  const salida = aplicarLote(datos([animal('ES1')]), {
    tipo: 'Venta',
    fecha: FUTURO,
    animalIds: ['id-ES1']
  });
  assert.equal(salida.animals[0].categoria, 'Vendido');
});

test('la fecha no puede ser anterior al nacimiento del animal', () => {
  /*
   * La validación solo mira que la fecha no sea futura, así que sin esto una
   * baja anterior al nacimiento entraría y pasaría desapercibida.
   */
  const data = datos([animal('ES1', { fechaNacimiento: '2026-06-01' })]);
  assert.throws(
    () => aplicarLote(data, { tipo: 'Venta', fecha: '2026-03-01', animalIds: ['id-ES1'] }),
    /anterior al nacimiento de ES1/
  );
});

test('un traslado sin destino no se registra', () => {
  assert.throws(
    () =>
      aplicarLote(datos([animal('ES1')]), {
        tipo: 'Traslado',
        fecha: FECHA,
        animalIds: ['id-ES1'],
        ubicacionDestino: '   '
      }),
    /ubicación/
  );
});

test('una selección vacía no crea un lote', () => {
  assert.throws(
    () => aplicarLote(datos([animal('ES1')]), { tipo: 'Destete', fecha: FECHA, animalIds: [] }),
    /ningún animal/
  );
});

test('un animal que ya no existe corta la operación entera', () => {
  // Mejor no hacer nada que dar de baja nueve de los diez que creía vender.
  const data = datos([animal('ES1')]);
  assert.throws(
    () => aplicarLote(data, { tipo: 'Venta', fecha: FECHA, animalIds: ['id-ES1', 'fantasma'] }),
    /ya no existe/
  );
  assert.equal(data.animals[0].categoria, 'Activo', 'no se ha tocado nada');
});

test('un crotal repetido en la selección cuenta una sola vez', () => {
  const salida = aplicarLote(datos([animal('ES1')]), {
    tipo: 'Destete',
    fecha: FECHA,
    animalIds: ['id-ES1', 'id-ES1']
  });
  assert.deepEqual(salida.lotes[0].animalIds, ['id-ES1']);
});

test('las notas vacías no se guardan como notas', () => {
  const salida = aplicarLote(datos([animal('ES1')]), {
    tipo: 'Destete',
    fecha: FECHA,
    animalIds: ['id-ES1'],
    notas: '   '
  });
  assert.equal(salida.lotes[0].notas, undefined);
});

test('aplicar un lote no modifica la explotación de partida', () => {
  const data = datos([animal('ES1')]);
  aplicarLote(data, { tipo: 'Venta', fecha: FECHA, animalIds: ['id-ES1'] });
  assert.equal(data.animals[0].categoria, 'Activo');
  assert.equal(data.lotes.length, 0);
});

test('el lote se nombra como lo diría el ganadero', () => {
  assert.equal(
    etiquetaLote({ id: 'l1', tipo: 'Destete', fecha: '2026-10-02', animalIds: ['a'] }),
    'Destete del 2/10/2026'
  );
});

test('los animales del lote salen ordenados por crotal, con los números en orden', () => {
  const animals = [animal('ES10'), animal('ES2'), animal('ES1')];
  const lote = { id: 'l1', tipo: 'Destete', fecha: FECHA, animalIds: ['id-ES10', 'id-ES1'] };
  assert.deepEqual(
    animalesDelLote(animals, lote).map(a => a.crotal),
    ['ES1', 'ES10'],
    'ES10 va después de ES2, no antes por ser «1» menor que «2»'
  );
});

test('el historial de un animal sale del más reciente al más antiguo', () => {
  const lotes = [
    { id: 'l1', tipo: 'Destete', fecha: '2026-03-01', animalIds: ['id-ES1'] },
    { id: 'l2', tipo: 'Traslado', fecha: '2026-07-01', animalIds: ['id-ES1', 'id-ES2'] },
    { id: 'l3', tipo: 'Venta', fecha: '2026-05-01', animalIds: ['id-ES2'] }
  ];
  assert.deepEqual(
    lotesDeAnimal(lotes, 'id-ES1').map(l => l.id),
    ['l2', 'l1']
  );
});

test('la frase de confirmación dice lo que va a pasar, no «se aplicarán cambios»', () => {
  const animales = [animal('ES1'), animal('ES2')];
  const ids = animales.map(a => a.id);
  assert.match(
    describirLote({ tipo: 'Venta', fecha: '2026-10-02', animalIds: ids }, animales),
    /darán de baja 2 animales como vendidos el 2\/10\/2026/
  );
  assert.match(
    describirLote(
      { tipo: 'Traslado', fecha: FECHA, animalIds: ids, ubicacionDestino: 'Pantano' },
      animales
    ),
    /moverán 2 animales a Pantano/
  );
  assert.match(
    describirLote({ tipo: 'Destete', fecha: FECHA, animalIds: ids }, animales),
    /darán de baja 2 animales como destetados/
  );
});

test('la misma frase se dice en pasado despues de hacerlo', () => {
  const animales = [animal('ES1')];
  const propuesta = { tipo: 'Venta', fecha: FECHA, animalIds: ['id-ES1'] };
  assert.match(describirLote(propuesta, animales, true), /^Se darán de baja/);
  assert.match(describirLote(propuesta, animales, false), /^Se han dado de baja/);
  assert.match(
    describirLote({ ...propuesta, tipo: 'Destete' }, animales, false),
    /^Se han dado de baja 1 animal como destetados/
  );
});

test('un animal solo se cuenta en singular', () => {
  const uno = [animal('ES1')];
  assert.match(
    describirLote({ tipo: 'Venta', fecha: FECHA, animalIds: ['id-ES1'] }, uno),
    /1 animal como/
  );
});
