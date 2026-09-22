import assert from 'node:assert/strict';
import test from 'node:test';
import { isAnimal, parseBackup } from '../src/lib/validation.ts';

/*
 * `categoria` sustituye a `activo` + `motivoBaja`. Esta suite existe porque hay
 * un ganadero real con 235 vacas cuyas fichas están guardadas con el formato
 * viejo: si la migración falla, `arrayOf` descarta el array entero y la
 * explotación aparece vacía. Por eso se prueba tanto el caso a caso como un
 * lote grande de una vez.
 */

const animalBase = (extra = {}) => ({
  id: 'a1',
  crotal: 'ES000000000001',
  especie: 'Vacuno',
  orientacion: 'Carne',
  ubicacion: 'Pantano',
  numeroPartos: 0,
  fechaNacimiento: '2020-01-01',
  criasAsociadas: [],
  estadoSanitario: 'Sano',
  raza: '',
  sexo: 'Hembra',
  fechaAlta: '2020-01-01',
  historialSanitario: [],
  ...extra
});

test('una ficha vieja activo:true migra a categoria Activo y pierde el campo viejo', () => {
  const legado = animalBase({ activo: true });
  assert.equal(isAnimal(legado), true);
  assert.equal(legado.categoria, 'Activo');
  assert.equal('activo' in legado, false, 'el campo viejo no debería quedar colgando');
});

test('una baja vieja por venta migra a categoria Vendido', () => {
  const legado = animalBase({ activo: false, motivoBaja: 'Vendido', fechaBaja: '2021-06-01' });
  assert.equal(isAnimal(legado), true);
  assert.equal(legado.categoria, 'Vendido');
  assert.equal('motivoBaja' in legado, false);
});

test('cualquier otra baja vieja, incluida Sacrificado, migra a Muerto', () => {
  for (const motivoBaja of ['Muerto', 'Sacrificado', 'Otro']) {
    const legado = animalBase({ activo: false, motivoBaja, fechaBaja: '2021-06-01' });
    assert.equal(isAnimal(legado), true, `motivoBaja ${motivoBaja} debería seguir validando`);
    assert.equal(legado.categoria, 'Muerto');
  }
});

test('una ficha ya migrada, con categoria, no se toca', () => {
  const nuevo = animalBase({ categoria: 'Nacido muerto', fechaBaja: '2021-06-01' });
  assert.equal(isAnimal(nuevo), true);
  assert.equal(nuevo.categoria, 'Nacido muerto');
});

test('una categoria de baja exige fechaBaja, igual que antes exigía la baja completa', () => {
  assert.equal(
    isAnimal(animalBase({ activo: false, motivoBaja: 'Vendido' })),
    false,
    'una baja vieja sin fecha ya no era válida antes, y tampoco lo es migrada'
  );
  assert.equal(
    isAnimal(animalBase({ categoria: 'Muerto' })),
    false,
    'una categoria de baja nueva también exige fecha'
  );
});

test('sin categoria reconocible ni activo booleano, la ficha se rechaza', () => {
  assert.equal(isAnimal(animalBase({ categoria: 'Perdido' })), false);
  assert.equal(isAnimal(animalBase({})), false, 'sin dato de situación no hay ficha válida');
});

test('una categoria corrupta no se arregla aunque venga acompañada de un activo viejo', () => {
  // Si ya hay `categoria`, la migración no debe pisarla ni "corregirla" con `activo`.
  assert.equal(isAnimal(animalBase({ categoria: 'Perdido', activo: true })), false);
});

const plantillaVacia = {
  numeroFactura: '',
  fechaEmision: '2026-01-01',
  nombreGanadero: '',
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

test('un rebaño de 235 fichas en formato viejo se lee entero: no se descarta ninguna', () => {
  const rebano = Array.from({ length: 235 }, (_, i) =>
    animalBase({
      id: `a${i}`,
      crotal: `ES${String(i).padStart(12, '0')}`,
      activo: i % 7 !== 0,
      ...(i % 7 === 0
        ? { motivoBaja: i % 2 === 0 ? 'Vendido' : 'Sacrificado', fechaBaja: '2021-01-01' }
        : {})
    })
  );
  const bajas = rebano.filter(a => a.activo === false).length;
  const vendidas = rebano.filter(a => a.motivoBaja === 'Vendido').length;

  const backup = {
    format: 'chaparra',
    version: 2,
    exportedAt: '2026-01-01T00:00:00.000Z',
    account: { nombre: 'Titular', email: 'titular@example.es' },
    data: {
      farm: {
        nombreExplotacion: 'Explotación de prueba',
        titular: 'Titular',
        especies: ['Vacuno'],
        orientacionPorEspecie: { Vacuno: 'Carne' },
        moneda: 'EUR'
      },
      animals: rebano,
      invoices: [],
      saleTemplate: plantillaVacia,
      milkRecords: [],
      weightRecords: [],
      lotes: []
    }
  };

  const resultado = parseBackup(backup);
  assert.equal(resultado.data.animals.length, 235, 'ninguna ficha se pierde en la migración');
  assert.equal(resultado.data.animals.filter(a => a.categoria === 'Activo').length, 235 - bajas);
  assert.equal(resultado.data.animals.filter(a => a.categoria === 'Vendido').length, vendidas);
  assert.equal(
    resultado.data.animals.filter(a => a.categoria === 'Muerto').length,
    bajas - vendidas
  );
});

test('una copia de seguridad anterior a los lotes se sigue pudiendo restaurar', () => {
  /*
   * Los lotes llegaron despues. Exigirlos dejaria al ganadero sin poder
   * recuperar una copia hecha la semana pasada, que es justo cuando mas falta
   * hace: cuando ha perdido los datos.
   */
  const backup = {
    format: 'chaparra',
    version: 2,
    exportedAt: '2026-09-01T10:00:00.000Z',
    account: { nombre: 'Javier', email: 'javier@ejemplo.es' },
    data: {
      farm: {
        nombreExplotacion: 'La Cerquilla',
        titular: 'Javier',
        especies: ['Ovino'],
        orientacionPorEspecie: { Ovino: 'Carne' },
        moneda: 'EUR'
      },
      animals: [],
      invoices: [],
      saleTemplate: plantillaVacia,
      milkRecords: [],
      weightRecords: []
      // sin `lotes`, como las copias de antes
    }
  };
  const resultado = parseBackup(backup);
  assert.deepEqual(resultado.data.lotes, [], 'se dan por vacios en vez de rechazar la copia');
});
