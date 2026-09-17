import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aplanar,
  aplicarMetas,
  clave,
  fusionar,
  reconstruir,
  ultimoCambio
} from '../src/services/sincronizacion.ts';

const t = (min) => new Date(Date.UTC(2026, 8, 17, 10, min)).toISOString();

const reg = (tipo, id, datos, actualizado, borrado = false) => ({
  tipo,
  id,
  datos,
  actualizado,
  borrado
});

const VACIA = {
  farm: null,
  animals: [],
  invoices: [],
  saleTemplate: { numeroFactura: '' },
  milkRecords: [],
  weightRecords: []
};

test('descompone la explotación en registros independientes', () => {
  const data = {
    ...VACIA,
    farm: { nombreExplotacion: 'La Cerquilla' },
    animals: [{ id: 'a1', crotal: 'ES1' }, { id: 'a2', crotal: 'ES2' }],
    invoices: [{ id: 'f1' }]
  };
  const metas = { [clave('animal', 'a1')]: { actualizado: t(5) } };
  const salida = aplanar(data, metas);

  assert.equal(salida.filter(r => r.tipo === 'animal').length, 2);
  assert.equal(salida.find(r => r.id === 'a1').actualizado, t(5));
  assert.ok(salida.some(r => r.tipo === 'explotacion'));
  assert.ok(salida.some(r => r.tipo === 'factura' && r.id === 'f1'));
});

test('las lápidas viajan aunque el dato ya no exista en la explotación', () => {
  const metas = { [clave('animal', 'muerto')]: { actualizado: t(9), borrado: true } };
  const salida = aplanar(VACIA, metas);
  const lapida = salida.find(r => r.id === 'muerto');
  assert.ok(lapida, 'la lápida debe incluirse');
  assert.equal(lapida.borrado, true);
  assert.equal(lapida.datos, null);
});

test('un registro que solo está en el servidor se descarga', () => {
  const { aplicar, subir } = fusionar([], [reg('animal', 'a1', { crotal: 'ES1' }, t(5))]);
  assert.equal(aplicar.length, 1);
  assert.equal(subir.length, 0);
});

test('un registro que solo está en el dispositivo se sube', () => {
  const { aplicar, subir } = fusionar([reg('animal', 'a1', { crotal: 'ES1' }, t(5))], []);
  assert.equal(subir.length, 1);
  assert.equal(aplicar.length, 0);
});

test('en conflicto gana el cambio más reciente', () => {
  const local = reg('animal', 'a1', { crotal: 'ES1', peso: 500 }, t(10));
  const remoto = reg('animal', 'a1', { crotal: 'ES1', peso: 480 }, t(20));
  const r1 = fusionar([local], [remoto]);
  assert.equal(r1.aplicar.length, 1, 'el remoto es posterior: debe bajar');
  assert.equal(r1.conflictos[0].gana, 'remoto');

  const r2 = fusionar([reg('animal', 'a1', { peso: 500 }, t(30))], [remoto]);
  assert.equal(r2.subir.length, 1, 'el local es posterior: debe subir');
  assert.equal(r2.conflictos[0].gana, 'local');
});

test('si las marcas coinciden no se mueve nada', () => {
  const igual = { crotal: 'ES1' };
  const { aplicar, subir, conflictos } = fusionar(
    [reg('animal', 'a1', igual, t(10))],
    [reg('animal', 'a1', igual, t(10))]
  );
  assert.deepEqual([aplicar.length, subir.length, conflictos.length], [0, 0, 0]);
});

test('un dato idéntico con marcas distintas no cuenta como conflicto', () => {
  const datos = { crotal: 'ES1' };
  const { conflictos } = fusionar(
    [reg('animal', 'a1', datos, t(10))],
    [reg('animal', 'a1', datos, t(20))]
  );
  assert.equal(conflictos.length, 0, 'mismo contenido: no hay nada que avisar');
});

test('un borrado en otro dispositivo se propaga y no resucita', () => {
  const local = reg('animal', 'a1', { crotal: 'ES1' }, t(10));
  const lapida = reg('animal', 'a1', null, t(20), true);
  const { aplicar } = fusionar([local], [lapida]);
  assert.equal(aplicar.length, 1);
  assert.equal(aplicar[0].borrado, true);

  const metas = aplicarMetas({}, aplicar);
  assert.equal(metas[clave('animal', 'a1')].borrado, true);

  const data = reconstruir([lapida], VACIA);
  assert.equal(data.animals.length, 0, 'el animal borrado no debe reaparecer');
});

test('reconstruye la explotación dejando fuera lo borrado', () => {
  const registros = [
    reg('explotacion', 'unica', { nombreExplotacion: 'La Cerquilla' }, t(1)),
    reg('animal', 'a1', { id: 'a1', crotal: 'ES1' }, t(2)),
    reg('animal', 'a2', null, t(3), true),
    reg('factura', 'f1', { id: 'f1' }, t(4)),
    reg('ordeno', 'o1', { id: 'o1' }, t(5)),
    reg('pesada', 'p1', { id: 'p1' }, t(6))
  ];
  const data = reconstruir(registros, VACIA);
  assert.equal(data.farm.nombreExplotacion, 'La Cerquilla');
  assert.deepEqual(
    data.animals.map(a => a.id),
    ['a1']
  );
  assert.equal(data.invoices.length, 1);
  assert.equal(data.milkRecords.length, 1);
  assert.equal(data.weightRecords.length, 1);
});

test('ida y vuelta: aplanar y reconstruir conserva la explotación', () => {
  const data = {
    farm: { nombreExplotacion: 'La Cerquilla' },
    animals: [{ id: 'a1', crotal: 'ES1' }],
    invoices: [{ id: 'f1' }],
    saleTemplate: { numeroFactura: 'FAC-1' },
    milkRecords: [{ id: 'o1' }],
    weightRecords: [{ id: 'p1' }]
  };
  const vuelta = reconstruir(aplanar(data, {}), VACIA);
  assert.deepEqual(vuelta, data);
});

test('la marca de la próxima sincronización es la más reciente recibida', () => {
  const previo = t(0);
  const siguiente = ultimoCambio(
    [reg('animal', 'a1', {}, t(5)), reg('animal', 'a2', {}, t(40)), reg('animal', 'a3', {}, t(12))],
    previo
  );
  assert.equal(siguiente, t(40));
  assert.equal(ultimoCambio([], previo), previo, 'sin cambios, la marca no retrocede');
});

test('marca como cambiado solo lo que de verdad ha cambiado', async () => {
  const { marcarCambios } = await import('../src/services/sincronizacion.ts');
  const antes = {
    ...VACIA,
    farm: { nombreExplotacion: 'La Cerquilla' },
    animals: [
      { id: 'a1', crotal: 'ES1' },
      { id: 'a2', crotal: 'ES2' }
    ]
  };
  const despues = {
    ...antes,
    animals: [
      { id: 'a1', crotal: 'ES1', peso: 500 },
      { id: 'a2', crotal: 'ES2' }
    ]
  };
  const metas = marcarCambios(antes, despues, {});
  assert.ok(metas[clave('animal', 'a1')], 'el animal modificado debe marcarse');
  assert.ok(!metas[clave('animal', 'a2')], 'el que no cambia no debe marcarse');
});

test('un animal eliminado deja lápida en vez de olvidarse', async () => {
  const { marcarCambios } = await import('../src/services/sincronizacion.ts');
  const antes = { ...VACIA, animals: [{ id: 'a1', crotal: 'ES1' }] };
  const despues = { ...VACIA, animals: [] };
  const metas = marcarCambios(antes, despues, {});
  assert.equal(metas[clave('animal', 'a1')].borrado, true);
});

test('un registro que vuelve tras un borrado se marca como cambio', async () => {
  const { marcarCambios } = await import('../src/services/sincronizacion.ts');
  const previas = { [clave('animal', 'a1')]: { actualizado: t(1), borrado: true } };
  const despues = { ...VACIA, animals: [{ id: 'a1', crotal: 'ES1' }] };
  const metas = marcarCambios(VACIA, despues, previas);
  assert.ok(!metas[clave('animal', 'a1')].borrado, 'debe dejar de estar borrado');
});
