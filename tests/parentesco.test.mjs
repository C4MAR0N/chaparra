import assert from 'node:assert/strict';
import test from 'node:test';
import { aplicarMadre, madreDe } from '../src/lib/domain.ts';

const animal = (id, crias = []) => ({
  id,
  crotal: id.toUpperCase(),
  especie: 'Vacuno',
  orientacion: 'Carne',
  ubicacion: '',
  numeroPartos: 0,
  fechaNacimiento: '2020-01-01',
  criasAsociadas: crias,
  estadoSanitario: 'Sano',
  raza: '',
  sexo: 'Hembra',
  activo: true,
  fechaAlta: '2020-01-01',
  historialSanitario: []
});

const crotales = (animals, id) => animals.find(a => a.id === id).criasAsociadas;

test('asignar una madre vincula la cría en la ficha de la madre', () => {
  const animals = [animal('madre'), animal('cria')];
  const resultado = aplicarMadre(animals, 'cria', 'madre');
  assert.deepEqual(crotales(resultado, 'madre'), ['cria']);
  assert.equal(madreDe(resultado, 'cria').id, 'madre');
});

test('la cría nunca cuelga de dos madres a la vez', () => {
  const animals = [animal('m1', ['cria']), animal('m2'), animal('cria')];
  const resultado = aplicarMadre(animals, 'cria', 'm2');
  assert.deepEqual(crotales(resultado, 'm1'), [], 'la madre anterior debe soltarla');
  assert.deepEqual(crotales(resultado, 'm2'), ['cria']);
  assert.equal(resultado.filter(a => a.criasAsociadas.includes('cria')).length, 1);
});

test('dejar la madre vacía desvincula sin tocar nada más', () => {
  const animals = [animal('m1', ['cria', 'otra']), animal('cria'), animal('otra')];
  const resultado = aplicarMadre(animals, 'cria', '');
  assert.deepEqual(crotales(resultado, 'm1'), ['otra'], 'las demás crías se conservan');
  assert.equal(madreDe(resultado, 'cria'), undefined);
});

test('reasignar a la misma madre no duplica el vínculo', () => {
  const animals = [animal('madre', ['cria']), animal('cria')];
  const resultado = aplicarMadre(animals, 'cria', 'madre');
  assert.deepEqual(crotales(resultado, 'madre'), ['cria']);
});

test('no toca la propia ficha de la cría ni las de terceros', () => {
  const animals = [animal('madre'), animal('cria', ['nieta']), animal('ajena', ['otra'])];
  const resultado = aplicarMadre(animals, 'cria', 'madre');
  assert.deepEqual(crotales(resultado, 'cria'), ['nieta'], 'la cría conserva sus propias crías');
  assert.equal(
    resultado.find(a => a.id === 'ajena'),
    animals.find(a => a.id === 'ajena'),
    'los animales sin cambios se devuelven intactos'
  );
});

test('un animal sin madre registrada no devuelve ninguna', () => {
  const animals = [animal('a'), animal('b')];
  assert.equal(madreDe(animals, 'a'), undefined);
  assert.equal(madreDe(animals, 'inexistente'), undefined);
});
