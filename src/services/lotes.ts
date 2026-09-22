import type { Animal, FarmData, Lote, TipoLote } from '../types';
import { dateLabel, esActivo, sigueEnLaExplotacion, today, uid } from '../lib/domain';
import { tipoLoteLabel } from '../lib/constants';

/*
 * Operaciones en grupo.
 *
 * Un ganadero no vende una vaca: vende diez. No desteta un cordero: desteta la
 * paridera entera. Hacerlo de uno en uno son diez formularios con la misma
 * fecha escrita diez veces, y a la tercera se equivoca.
 *
 * Aquí se aplica de una vez y se deja constancia de que fue **una sola
 * operación**, que es lo que permite volver luego a «el destete del 2 de
 * octubre» y ver el grupo entero en lugar de diez fichas sueltas.
 *
 * Es una función pura a propósito: recibe la explotación y devuelve otra. Lo que
 * decide qué le pasa a cada animal no puede vivir dentro de un componente, tanto
 * porque hay que poder probarlo como porque una venta da de baja ganado de
 * verdad y un fallo aquí se ve en las cuentas, no en la pantalla.
 */

export interface PropuestaLote {
  tipo: TipoLote;
  fecha: string;
  animalIds: string[];
  ubicacionDestino?: string;
  notas?: string;
}

/** El nombre por el que el ganadero lo reconoce: «Destete del 2/10/2026». */
export const etiquetaLote = (lote: Lote) =>
  `${tipoLoteLabel(lote.tipo)} del ${dateLabel(lote.fecha)}`;

/** Los animales de un lote, en el orden en que se leen los crotales. */
export function animalesDelLote(animals: Animal[], lote: Lote): Animal[] {
  const miembros = new Set(lote.animalIds);
  return animals
    .filter(a => miembros.has(a.id))
    .sort((a, b) => a.crotal.localeCompare(b.crotal, 'es', { numeric: true }));
}

/** Los lotes en los que ha estado un animal, del más reciente al más antiguo. */
export const lotesDeAnimal = (lotes: Lote[], animalId: string) =>
  lotes.filter(l => l.animalIds.includes(animalId)).sort((a, b) => b.fecha.localeCompare(a.fecha));

/*
 * Qué animales admite cada operación.
 *
 * Destetar exige ganado activo: una cría solo se desteta una vez. Lo demás
 * admite también las ya destetadas, porque siguen en la finca —se desteta y a
 * los pocos días se vende, que es el camino normal de un cordero—. Lo que ya se
 * vendió o se murió no admite nada: sería falsear el registro sin que nadie se
 * entere.
 */
const admite = (tipo: TipoLote, a: Animal) =>
  tipo === 'Destete' ? esActivo(a) : sigueEnLaExplotacion(a);

/** Un lote con fecha por delante: está previsto, no ha pasado todavía. */
export const esPrevisto = (lote: { fecha: string }) => lote.fecha > today();

const enumerar = (crotales: string[]) =>
  crotales.length > 4
    ? `${crotales.slice(0, 4).join(', ')} y ${crotales.length - 4} más`
    : crotales.join(', ');

export function aplicarLote(data: FarmData, propuesta: PropuestaLote): FarmData {
  const { tipo, fecha, notas } = propuesta;
  const animalIds = [...new Set(propuesta.animalIds)];
  const destino = propuesta.ubicacionDestino?.trim() ?? '';

  if (!animalIds.length) throw new Error('No has seleccionado ningún animal.');
  if (tipo === 'Traslado' && !destino)
    throw new Error('Indica a qué ubicación se traslada el grupo.');

  const porId = new Map(data.animals.map(a => [a.id, a]));
  const seleccionados = animalIds.map(id => porId.get(id));
  if (seleccionados.some(a => !a))
    throw new Error('Alguno de los animales seleccionados ya no existe. Vuelve a elegirlos.');
  const animales = seleccionados as Animal[];

  const noValen = animales.filter(a => !admite(tipo, a));
  if (noValen.length)
    throw new Error(
      tipo === 'Destete'
        ? `Ya estaban destetados o dados de baja: ${enumerar(noValen.map(a => a.crotal))}.`
        : `Ya no están en la explotación: ${enumerar(noValen.map(a => a.crotal))}.`
    );

  /*
   * Una baja anterior al nacimiento deja la ficha en un estado que no significa
   * nada. La validación no lo comprueba —solo mira que la fecha no sea futura—,
   * así que se comprueba aquí, antes de tocar veinte animales de golpe.
   */
  const imposibles = animales.filter(a => fecha < a.fechaNacimiento);
  if (imposibles.length)
    throw new Error(
      `Esa fecha es anterior al nacimiento de ${enumerar(imposibles.map(a => a.crotal))}.`
    );

  const afectados = new Set(animalIds);
  const cambiar = (a: Animal): Animal => {
    if (!afectados.has(a.id)) return a;
    if (tipo === 'Venta') return { ...a, categoria: 'Vendido', fechaBaja: fecha };
    if (tipo === 'Baja') return { ...a, categoria: 'Muerto', fechaBaja: fecha };
    if (tipo === 'Traslado') return { ...a, ubicacion: destino };
    /*
     * El destete es la salida de la cría, no un hito de su crianza: a partir de
     * ese día deja de formar parte de la explotación. Por eso da de baja con la
     * misma fecha, igual que la venta, y no se queda contando como activa.
     */
    return { ...a, categoria: 'Destetado', fechaBaja: fecha };
  };

  const lote: Lote = {
    id: uid(),
    tipo,
    fecha,
    animalIds,
    ...(tipo === 'Traslado' ? { ubicacionDestino: destino } : {}),
    ...(notas?.trim() ? { notas: notas.trim() } : {})
  };

  return { ...data, animals: data.animals.map(cambiar), lotes: [...data.lotes, lote] };
}

/**
 * Frase de lo que pasa con el grupo. Se usa dos veces, igual que en la fusión de
 * copias: antes de decidir, en futuro, y después de hacerlo, en pasado. Leer
 * «se darán de baja» cuando ya están dados de baja deja la duda de si se pulsó.
 */
export function describirLote(
  propuesta: PropuestaLote,
  animales: Animal[],
  antesDeHacerlo = true
): string {
  const n = propuesta.animalIds.length;
  const cuantos = `${n} ${n === 1 ? 'animal' : 'animales'}`;
  const cuando = dateLabel(propuesta.fecha);
  const baja = antesDeHacerlo ? 'Se darán de baja' : 'Se han dado de baja';
  if (propuesta.tipo === 'Venta') return `${baja} ${cuantos} como vendidos el ${cuando}.`;
  if (propuesta.tipo === 'Baja') return `${baja} ${cuantos} como muertos el ${cuando}.`;
  if (propuesta.tipo === 'Traslado')
    return `${antesDeHacerlo ? 'Se moverán' : 'Se han movido'} ${cuantos} a ${propuesta.ubicacionDestino?.trim() || 'la ubicación indicada'}.`;
  const hembras = animales.filter(a => a.sexo === 'Hembra').length;
  const sexos = hembras ? ` (${hembras} ${hembras === 1 ? 'hembra' : 'hembras'})` : '';
  return `${baja} ${cuantos} como destetados el ${cuando}${sexos}.`;
}

/*
 * Cuántos animales pasaron por una operación dentro de un periodo.
 *
 * Esto no se puede sacar de las fichas. Una cría que se desteta el 2 y se vende
 * el 10 acaba con la categoría 'Vendido' y una sola fecha de baja: el destete
 * desaparece de su ficha y en los informes cuenta como una venta y nada más. El
 * único sitio donde queda constancia de que hubo un destete es el lote.
 *
 * Con `soloEstos` se acota a una especie, porque un lote puede mezclar animales
 * de varias y la pantalla de informes se filtra por especie.
 */
export function animalesEnLotes(
  lotes: Lote[],
  tipo: TipoLote,
  dentroDelPeriodo: (fecha: string) => boolean,
  soloEstos?: Set<string>
): { operaciones: number; animales: number } {
  const vistos = new Set<string>();
  let operaciones = 0;
  for (const lote of lotes) {
    if (lote.tipo !== tipo || !dentroDelPeriodo(lote.fecha)) continue;
    const suyos = soloEstos ? lote.animalIds.filter(id => soloEstos.has(id)) : lote.animalIds;
    if (!suyos.length) continue;
    operaciones++;
    // Distintos: el mismo animal no debe contar dos veces si algún día
    // apareciera en dos operaciones del mismo tipo dentro del periodo.
    for (const id of suyos) vistos.add(id);
  }
  return { operaciones, animales: vistos.size };
}
