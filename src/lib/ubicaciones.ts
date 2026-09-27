import type { Animal, FarmData, FarmProfile } from '../types';

/*
 * Ubicaciones como lista cerrada.
 *
 * Hasta ahora la ubicación de cada animal se tecleaba a mano, y bastaba una
 * errata —«Pantno», «pantano »— para partir una manada en dos: el filtro por
 * ubicación, el reparto de la pantalla y el Excel del veterinario las trataban
 * como cercados distintos, y nadie se daba cuenta hasta contar vacas.
 *
 * Ahora los cercados se escriben una vez, aquí, y en la ficha se eligen de un
 * desplegable. La lista vive en la explotación, no en cada especie, porque un
 * mismo cercado puede tener vacas y cabras.
 *
 * Las explotaciones de antes no traen lista. Por eso la lista con la que se
 * elige es la suma de las creadas y de las que ya usan los animales: nada de lo
 * que había desaparece, y una errata antigua sale a la vista para poder
 * corregirla renombrándola.
 */

export const MAX_UBICACION = 60;

/** Quita los espacios de sobra, que son la errata más frecuente y la más invisible. */
export const limpiarUbicacion = (nombre: string) => nombre.trim().replace(/\s+/g, ' ');
const clave = (nombre: string) => limpiarUbicacion(nombre).toLocaleLowerCase('es');

/*
 * Se comparan tal cual, sin igualar mayúsculas: si un animal está en «pantano»
 * y otro en «Pantano», el desplegable tiene que enseñar las dos. Juntarlas aquí
 * escondería el problema en vez de dejar arreglarlo, porque el filtro sigue
 * viéndolas distintas.
 */
export function ubicacionesDisponibles(farm: FarmProfile | null, animals: Animal[]): string[] {
  const todas = new Set<string>();
  for (const u of [...(farm?.ubicaciones ?? []), ...animals.map(a => a.ubicacion)]) {
    const t = u.trim();
    if (t) todas.add(t);
  }
  return [...todas].sort((a, b) => a.localeCompare(b, 'es'));
}

/** Cuántas fichas la usan. Cuentan también las vendidas: siguen diciendo dónde estaban. */
export const fichasEn = (animals: Animal[], nombre: string) =>
  animals.filter(a => a.ubicacion.trim() === nombre).length;

function validarNombre(nombre: string): string {
  const limpio = limpiarUbicacion(nombre);
  if (!limpio) throw new Error('Escribe el nombre de la ubicación.');
  if (limpio.length > MAX_UBICACION)
    throw new Error(`El nombre es demasiado largo: como mucho ${MAX_UBICACION} letras.`);
  return limpio;
}

export function crearUbicacion(data: FarmData, nombre: string): FarmData {
  if (!data.farm) throw new Error('No hay ninguna explotación configurada.');
  const limpio = validarNombre(nombre);
  /*
   * Aquí sí se comparan sin mayúsculas: crear «pantano» teniendo «Pantano» es
   * justo la errata que esta lista existe para evitar.
   */
  const repetida = ubicacionesDisponibles(data.farm, data.animals).find(
    u => clave(u) === clave(limpio)
  );
  if (repetida) throw new Error(`Ya existe «${repetida}».`);
  return {
    ...data,
    farm: { ...data.farm, ubicaciones: [...(data.farm.ubicaciones ?? []), limpio] }
  };
}

/*
 * Renombrar arregla las erratas de antes. Si el nombre nuevo ya existe con
 * otra forma —se renombra «Pantno» a «pantano» teniendo «Pantano»—, no se crea
 * un tercero: los animales pasan al que ya estaba, con su forma de escribirlo.
 * Es la manera de juntar en uno dos cercados que eran el mismo.
 */
/**
 * El nombre con el que se queda de verdad: el escrito, o el que ya existía con
 * otra forma. Hace falta fuera para poder decirle al ganadero dónde han ido sus
 * animales, que no siempre es lo que ha tecleado.
 */
export function nombreTrasRenombrar(data: FarmData, vieja: string, nueva: string): string {
  const limpio = validarNombre(nueva);
  const existente = ubicacionesDisponibles(data.farm, data.animals).find(
    u => u !== vieja && clave(u) === clave(limpio)
  );
  return existente ?? limpio;
}

export function renombrarUbicacion(data: FarmData, vieja: string, nueva: string): FarmData {
  if (!data.farm) throw new Error('No hay ninguna explotación configurada.');
  if (!ubicacionesDisponibles(data.farm, data.animals).includes(vieja))
    throw new Error(`«${vieja}» ya no existe.`);
  const destino = nombreTrasRenombrar(data, vieja, nueva);
  if (destino === vieja) return data;

  const lista = (data.farm.ubicaciones ?? []).filter(u => u !== vieja);
  return {
    ...data,
    farm: { ...data.farm, ubicaciones: lista.includes(destino) ? lista : [...lista, destino] },
    animals: data.animals.map(a =>
      a.ubicacion.trim() === vieja ? { ...a, ubicacion: destino } : a
    ),
    lotes: data.lotes.map(l =>
      l.ubicacionDestino?.trim() === vieja ? { ...l, ubicacionDestino: destino } : l
    )
  };
}

export function borrarUbicacion(data: FarmData, nombre: string): FarmData {
  if (!data.farm) throw new Error('No hay ninguna explotación configurada.');
  const n = fichasEn(data.animals, nombre);
  /*
   * Borrar una ubicación con animales dentro no la haría desaparecer: seguiría
   * saliendo porque la usan sus fichas. Se dice claro qué hacer en su lugar.
   */
  if (n)
    throw new Error(
      `No se puede eliminar: la usan ${n} ${n === 1 ? 'ficha' : 'fichas'}. Muévelas o renómbrala.`
    );
  return {
    ...data,
    farm: { ...data.farm, ubicaciones: (data.farm.ubicaciones ?? []).filter(u => u !== nombre) }
  };
}

/*
 * Para dar de alta una ubicación sin salir de la ficha del animal, que es donde
 * de verdad hace falta: se está apuntando una vaca y su cercado no existe
 * todavía. Si ya existe con otra forma —se escribe «pantano» teniendo
 * «Pantano»— se usa la que había en vez de dar un error: el ganadero quería ese
 * cercado, y así nunca quedan dos que solo se distinguen en las mayúsculas.
 */
export function usarOCrearUbicacion(
  data: FarmData,
  nombre: string
): { datos: FarmData; nombre: string } {
  const limpio = validarNombre(nombre);
  const existente = ubicacionesDisponibles(data.farm, data.animals).find(
    u => clave(u) === clave(limpio)
  );
  if (existente) return { datos: data, nombre: existente };
  return { datos: crearUbicacion(data, limpio), nombre: limpio };
}

/*
 * Límites de la lista guardada. Son más amplios que los del campo de texto
 * (MAX_UBICACION) porque aquí también entran nombres heredados de fichas
 * antiguas, que se tecleaban sin límite. Tienen que coincidir con la
 * validación: una lista que la validación rechace deja la explotación sin
 * cargar, y eso es mucho peor que perder una ubicación.
 */
export const MAX_UBICACION_GUARDADA = 200;
export const MAX_UBICACIONES = 500;

/*
 * Una ubicación que solo existe porque la usa algún animal desaparece en cuanto
 * sale de ella la última vaca. Les pasaba a las explotaciones de antes, que no
 * traen lista: mover toda la manada del Pantano a otro cercado —una rotación de
 * pastos normal— borraba el Pantano, y para volver había que crearlo de nuevo.
 *
 * Se aplica ANTES de cada cambio, cuando la vaca todavía está dentro: así el
 * cercado entra en la lista y se queda. Un nombre que ya nadie usa no se añade,
 * de modo que lo que se renombra o se borra a propósito no vuelve a aparecer.
 *
 * Devuelve el mismo objeto si no falta nada, para no marcar la explotación como
 * cambiada sin motivo.
 */
export function conservarUbicaciones(data: FarmData): FarmData {
  if (!data.farm) return data;
  const lista = data.farm.ubicaciones ?? [];
  const faltan: string[] = [];
  for (const a of data.animals) {
    const u = a.ubicacion.trim();
    if (!u || u.length > MAX_UBICACION_GUARDADA) continue;
    if (lista.includes(u) || faltan.includes(u)) continue;
    if (lista.length + faltan.length >= MAX_UBICACIONES) break;
    faltan.push(u);
  }
  if (!faltan.length) return data;
  return { ...data, farm: { ...data.farm, ubicaciones: [...lista, ...faltan] } };
}
