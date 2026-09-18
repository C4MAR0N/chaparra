import assert from 'node:assert/strict';
import test from 'node:test';
import { aplicarMadre, criasDe, esDescendiente, madreDe } from '../src/lib/domain.ts';

const animal = (id, crias = [], extra = {}) => ({
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
  categoria: 'Activo',
  fechaAlta: '2020-01-01',
  historialSanitario: [],
  ...extra
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

/*
 * Tres generaciones: abuela -> madre -> cría. Se construye encadenando
 * `aplicarMadre` dos veces, como haría el formulario real, en vez de
 * escribir el `criasAsociadas` a mano.
 */
function tresGeneraciones() {
  let animals = [
    animal('abuela'),
    animal('madre'),
    animal('nieta', [], { fechaNacimiento: '2023-05-01' })
  ];
  animals = aplicarMadre(animals, 'madre', 'abuela');
  animals = aplicarMadre(animals, 'nieta', 'madre');
  return animals;
}

test('criasDe devuelve solo la cría directa en cada nivel de tres generaciones', () => {
  const animals = tresGeneraciones();
  assert.deepEqual(
    criasDe(animals, 'abuela').map(a => a.id),
    ['madre']
  );
  assert.deepEqual(
    criasDe(animals, 'madre').map(a => a.id),
    ['nieta']
  );
  assert.deepEqual(criasDe(animals, 'nieta'), [], 'la nieta todavía no tiene crías propias');
});

test('criasDe ordena de la más antigua a la más reciente y manda al final la que no tiene fecha', () => {
  const animals = [
    animal('madre', ['reciente', 'sinFecha', 'antigua']),
    animal('antigua', [], { fechaNacimiento: '2019-01-01' }),
    animal('reciente', [], { fechaNacimiento: '2023-06-01' }),
    animal('sinFecha', [], { fechaNacimiento: '' })
  ];
  assert.deepEqual(
    criasDe(animals, 'madre').map(a => a.id),
    ['antigua', 'reciente', 'sinFecha']
  );
});

test('esDescendiente detecta a la nieta como descendiente de la abuela, pero no al revés', () => {
  const animals = tresGeneraciones();
  assert.equal(esDescendiente(animals, 'nieta', 'abuela'), true, 'la nieta desciende de la abuela');
  assert.equal(
    esDescendiente(animals, 'madre', 'abuela'),
    true,
    'la madre también es descendiente'
  );
  assert.equal(
    esDescendiente(animals, 'abuela', 'nieta'),
    false,
    'la abuela no puede ser su propia descendiente'
  );
  assert.equal(esDescendiente(animals, 'ajena', 'abuela'), false);
});

test('un ciclo guardado a mano (A cría de B y B cría de A) no cuelga esDescendiente', () => {
  const animals = [animal('a', ['b']), animal('b', ['a'])];
  assert.equal(esDescendiente(animals, 'b', 'a'), true, 'b sigue siendo cría de a');
  assert.equal(esDescendiente(animals, 'c', 'a'), false, 'un animal ajeno al ciclo no aparece');
});

test('asociar una cría la despega de la madre que tuviera antes', () => {
  /*
   * El caso: la cría ya cuelga de una vaca y se la asocia a otra desde su
   * ficha. Sin despegarla, quedaba en las dos listas y el árbol decía que
   * tenía dos madres; `madreDe` devolvía la primera que encontrase, que podía
   * ser cualquiera de las dos.
   */
  const primera = animal('primera', ['cria']);
  const segunda = animal('segunda');
  const cria = animal('cria');
  const antes = [primera, segunda, cria];

  // Lo que hace el formulario al guardar la ficha de la segunda madre.
  const conCria = { ...segunda, criasAsociadas: ['cria'] };
  const despues = conCria.criasAsociadas.reduce(
    (lista, hija) => aplicarMadre(lista, hija, conCria.id),
    antes.map(a => (a.id === conCria.id ? conCria : a))
  );

  assert.equal(madreDe(despues, 'cria').id, 'segunda');
  assert.deepEqual(
    despues.find(a => a.id === 'primera').criasAsociadas,
    [],
    'la madre anterior deja de reclamarla'
  );
  assert.equal(
    despues.filter(a => a.criasAsociadas.includes('cria')).length,
    1,
    'una cría solo puede colgar de una madre'
  );
});
