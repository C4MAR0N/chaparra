import assert from 'node:assert/strict';
import test from 'node:test';
import {
  altasPorMes,
  edadTexto,
  mesesDeEdad,
  necesitaAtencion,
  porUbicacion,
  ubicacionDe
} from '../src/lib/domain.ts';

const animal = (id, extra = {}) => ({
  id,
  crotal: id.toUpperCase(),
  especie: 'Vacuno',
  orientacion: 'Carne',
  ubicacion: 'Pantano',
  numeroPartos: 0,
  fechaNacimiento: '2020-01-01',
  criasAsociadas: [],
  estadoSanitario: 'Sano',
  raza: '',
  sexo: 'Hembra',
  activo: true,
  fechaAlta: '2020-01-01',
  historialSanitario: [],
  ...extra
});

test('un animal sin ubicación se agrupa bajo una etiqueta visible', () => {
  assert.equal(ubicacionDe(animal('a', { ubicacion: '   ' })), 'Sin ubicación');
  assert.equal(ubicacionDe(animal('b', { ubicacion: ' Virgen ' })), 'Virgen');
});

test('reparte el ganado por ubicación y calcula la edad media de cada manada', () => {
  const animales = [
    animal('a', { ubicacion: 'Pantano', fechaNacimiento: '2020-01-01', sexo: 'Hembra' }),
    animal('b', { ubicacion: 'Pantano', fechaNacimiento: '2022-01-01', sexo: 'Macho' }),
    animal('c', { ubicacion: 'Virgen', fechaNacimiento: '2021-01-01' })
  ];
  const [pantano, virgen] = porUbicacion(animales, '2026-01-01');
  assert.equal(pantano.ubicacion, 'Pantano', 'la manada mayor va primero');
  assert.deepEqual([pantano.total, pantano.hembras, pantano.machos], [2, 1, 1]);
  assert.equal(pantano.mesesMedios, (72 + 48) / 2);
  assert.equal(virgen.total, 1);
});

test('las bajas no cuentan en el reparto por ubicación', () => {
  const animales = [animal('a'), animal('b', { activo: false })];
  assert.deepEqual(
    porUbicacion(animales, '2026-01-01').map(m => m.total),
    [1]
  );
});

test('la edad media aguanta un animal con la fecha de nacimiento en blanco', () => {
  const [manada] = porUbicacion(
    [animal('a', { fechaNacimiento: '2024-01-01' }), animal('b', { fechaNacimiento: '' })],
    '2026-01-01'
  );
  assert.equal(manada.total, 2);
  assert.equal(manada.mesesMedios, 24, 'solo promedia las fechas que existen');
  assert.equal(mesesDeEdad(''), null);
  assert.equal(edadTexto(null), 'Sin fecha');
});

test('el historial de altas separa hembras y machos e incluye los meses vacíos', () => {
  const animales = [
    animal('a', { fechaAlta: '2026-01-10', sexo: 'Hembra' }),
    animal('b', { fechaAlta: '2026-01-20', sexo: 'Macho' }),
    animal('c', { fechaAlta: '2026-03-05', sexo: 'Hembra' }),
    animal('d', { fechaAlta: '2025-12-31', sexo: 'Hembra' })
  ];
  const meses = altasPorMes(animales, '2026-01-01', '2026-03-31');
  assert.deepEqual(
    meses.map(m => m.mes),
    ['2026-01', '2026-02', '2026-03']
  );
  assert.deepEqual([meses[0].hembras, meses[0].machos, meses[0].total], [1, 1, 2]);
  assert.equal(meses[1].total, 0, 'febrero sin altas se muestra a cero');
  assert.equal(meses[2].hembras, 1);
  assert.ok(
    meses.every(m => m.total === m.hembras + m.machos),
    'fuera del periodo no se cuela nada'
  );
});

test('el historial puede mirar los nacimientos en vez de las altas', () => {
  const animales = [animal('a', { fechaAlta: '2026-01-10', fechaNacimiento: '2025-06-02' })];
  assert.equal(altasPorMes(animales, '2025-01-01', '2025-12-31', 'fechaNacimiento')[5].total, 1);
  assert.equal(altasPorMes(animales, '2025-01-01', '2025-12-31')[5].total, 0);
});

test('un periodo del revés no devuelve serie en vez de colgarse', () => {
  assert.deepEqual(altasPorMes([animal('a')], '2026-12-31', '2026-01-01'), []);
});

test('necesitan atención los animales activos en tratamiento, cuarentena u observación', () => {
  assert.equal(necesitaAtencion(animal('a', { estadoSanitario: 'En tratamiento' })), true);
  assert.equal(necesitaAtencion(animal('b', { estadoSanitario: 'En cuarentena' })), true);
  assert.equal(necesitaAtencion(animal('c', { estadoSanitario: 'Observación' })), true);
  assert.equal(necesitaAtencion(animal('d', { estadoSanitario: 'Vacunado' })), false);
  assert.equal(necesitaAtencion(animal('e', { estadoSanitario: 'Sano' })), false);
  assert.equal(
    necesitaAtencion(animal('f', { estadoSanitario: 'En tratamiento', activo: false })),
    false,
    'un animal de baja ya no pide visita'
  );
});

test('acotar la exportación arrastra solo lo que cuelga de esos animales', async () => {
  const { acotar } = await import('../src/services/excel.ts');
  const pantano = animal('p1', { ubicacion: 'Pantano', crotal: 'ES1' });
  const virgen = animal('v1', { ubicacion: 'Virgen', crotal: 'ES2' });
  const data = {
    farm: null,
    animals: [pantano, virgen],
    saleTemplate: { numeroFactura: '' },
    milkRecords: [
      { id: 'o1', fecha: '2026-01-01', animalId: 'p1', litros: 10 },
      { id: 'o2', fecha: '2026-01-01', animalId: 'v1', litros: 8 },
      { id: 'o3', fecha: '2026-01-01', litros: 40 }
    ],
    weightRecords: [
      { id: 'w1', fecha: '2026-01-01', animalId: 'p1', pesoKg: 400 },
      { id: 'w2', fecha: '2026-01-01', animalId: 'v1', pesoKg: 380 }
    ],
    invoices: [
      { id: 'f1', fecha: '2026-01-01', crotalesRelacionados: ['ES1'] },
      { id: 'f2', fecha: '2026-01-01', crotalesRelacionados: ['ES2'] },
      { id: 'f3', fecha: '2026-01-01' }
    ]
  };
  const solo = acotar(data, [pantano]);
  assert.deepEqual(
    solo.animals.map(a => a.id),
    ['p1']
  );
  assert.deepEqual(
    solo.milkRecords.map(r => r.id),
    ['o1'],
    'el ordeño del rebaño entero no es de ninguna manada'
  );
  assert.deepEqual(
    solo.weightRecords.map(r => r.id),
    ['w1']
  );
  assert.deepEqual(
    solo.invoices.map(f => f.id),
    ['f1'],
    'solo viajan las facturas que citan crotales de la manada'
  );
});
