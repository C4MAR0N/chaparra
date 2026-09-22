import type { Animal, FarmProfile, MilkRecord, SaleInvoiceTemplate, WeightRecord } from '../types';
import { ESTADOS_ATENCION } from './constants';
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const uid = () => crypto.randomUUID();
export const number = (value: number, digits = 1) =>
  value.toLocaleString('es-ES', { maximumFractionDigits: digits });
export const euro = (value: number) =>
  value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
export const euroRate = (value: number, unit: string) =>
  value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
  ` €/${unit}`;
export const dateLabel = (value: string) =>
  new Date(value + 'T12:00:00').toLocaleDateString('es-ES');
export const roundMoney = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const hasMilk = (farm: FarmProfile) =>
  farm.especies.some(s => ['Leche', 'Mixto'].includes(farm.orientacionPorEspecie[s] || ''));
export const hasMeat = (farm: FarmProfile) =>
  farm.especies.some(s => ['Carne', 'Mixto'].includes(farm.orientacionPorEspecie[s] || ''));
export const animalMilk = (a: Animal, f: FarmProfile) => hasMilk(f) && a.orientacion !== 'Carne';
export const animalMeat = (a: Animal, f: FarmProfile) => hasMeat(f) && a.orientacion !== 'Leche';
export const herdLabel = (f: FarmProfile) =>
  f.especies.some(s => s === 'Ovino' || s === 'Caprino') ? 'rebaño' : 'ganado';
/*
 * Único sitio que sabe qué categoría cuenta como ganado vivo. El día que
 * cambien las categorías, solo hay que tocar esta línea.
 */
export const esActivo = (a: Animal) => a.categoria === 'Activo';
/*
 * Las bajas no son todas iguales. Vender y destetar son salidas: ganado que se
 * va porque la explotación lo ha producido. Morir es una pérdida. Contarlas
 * juntas da un número que no significa nada, porque vender veinte corderos y
 * perder veinte se leerían igual.
 */
export const esSalida = (a: Animal) => a.categoria === 'Vendido' || a.categoria === 'Destetado';
export const esMuerte = (a: Animal) => a.categoria === 'Muerto' || a.categoria === 'Nacido muerto';
/*
 * Sigue en la finca aunque ya no cuente como ganado activo. Una cría destetada
 * está ahí hasta que se vende, que suele ser días después: por eso todavía se
 * la puede vender, trasladar o dar de baja, pero no destetar otra vez.
 */
export const sigueEnLaExplotacion = (a: Animal) => esActivo(a) || a.categoria === 'Destetado';
/** Edad en meses cumplidos, o null si el animal no tiene una fecha válida. */
export function mesesDeEdad(birth: string, reference = today()): number | null {
  const b = new Date(birth + 'T12:00:00'),
    n = new Date(reference + 'T12:00:00');
  if (Number.isNaN(b.getTime()) || Number.isNaN(n.getTime())) return null;
  let months = (n.getFullYear() - b.getFullYear()) * 12 + n.getMonth() - b.getMonth();
  if (n.getDate() < b.getDate()) months--;
  return Math.max(0, months);
}
export function edadTexto(months: number | null) {
  if (months === null) return 'Sin fecha';
  const years = Math.floor(months / 12),
    rest = Math.round(months % 12);
  return `${years} ${years === 1 ? 'año' : 'años'} y ${rest} ${rest === 1 ? 'mes' : 'meses'}`;
}
export const age = (birth: string, reference = today()) => edadTexto(mesesDeEdad(birth, reference));
export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000);
export function milkSeries(records: MilkRecord[], days: number, end = today()) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(end + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - (days - 1 - i));
    const fecha = d.toISOString().slice(0, 10);
    return {
      fecha,
      label: dateLabel(fecha).slice(0, 5),
      value: records.filter(r => r.fecha === fecha).reduce((sum, r) => sum + r.litros, 0)
    };
  });
}
export function weightStats(animal: Animal, records: WeightRecord[], reference = today()) {
  const history = records
    .filter(r => r.animalId === animal.id && r.fecha <= reference)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const last = history.at(-1),
    previous = history.at(-2);
  const days = last && previous ? daysBetween(previous.fecha, last.fecha) : 0;
  const gmd = last && previous && days > 0 ? (last.pesoKg - previous.pesoKg) / days : null;
  const stale = !!last && daysBetween(last.fecha, reference) > 30;
  const current =
    last && !stale
      ? Math.max(0, last.pesoKg + (gmd ?? 0) * daysBetween(last.fecha, reference))
      : null;
  return { last, previous, gmd, current, stale };
}
export function saleTotals(template: SaleInvoiceTemplate) {
  const base = roundMoney(
    template.items.reduce(
      (sum, item) => sum + roundMoney(item.cantidad * item.precioUnitarioEuro),
      0
    )
  );
  const rate =
    template.regimen === 'REAGP' ? template.compensacionPorcentaje : template.ivaPorcentaje;
  const tax = roundMoney((base * rate) / 100);
  const withholding = roundMoney((base * template.irpfPorcentaje) / 100);
  return { base, tax, withholding, total: roundMoney(base + tax - withholding) };
}
export function accumulatedCost(animal: Animal) {
  return (
    (animal.costeAcumuladoEuro ?? 0) +
    animal.historialSanitario.reduce((sum, r) => sum + r.costeEuro, 0)
  );
}

/*
 * La madre de un animal no se guarda en su ficha: es la relación `criasAsociadas`
 * vista del revés. Guardarla en los dos sitios permitiría que se contradijeran.
 *
 * Esta función deja a `cria` colgando de una sola madre: la quita de la lista de
 * crías de cualquier otro animal y la añade a la elegida. Con `madre` vacío, la
 * cría queda sin madre asignada.
 */
export function aplicarMadre(animals: Animal[], cria: string, madre: string): Animal[] {
  return animals.map(a => {
    if (a.id === cria) return a;
    const sinEsta = a.criasAsociadas.filter(id => id !== cria);
    const siguientes = a.id === madre ? [...sinEsta, cria] : sinEsta;
    return siguientes.length === a.criasAsociadas.length ? a : { ...a, criasAsociadas: siguientes };
  });
}

/** Devuelve la madre de un animal, si alguna lo tiene entre sus crías. */
export const madreDe = (animals: Animal[], cria: string) =>
  animals.find(a => a.criasAsociadas.includes(cria));

/*
 * Las crías se guardan en el orden en que se fueron asociando, que no dice
 * nada sobre la explotación. Se devuelven por fecha de nacimiento porque es
 * el orden que el ganadero reconoce de un vistazo. Una cría sin fecha se
 * manda al final: no hay forma de decidir si es la más vieja o la más nueva
 * sin dato, así que no se mete entre las que sí lo tienen.
 */
export function criasDe(animals: Animal[], id: string): Animal[] {
  const animal = animals.find(a => a.id === id);
  if (!animal) return [];
  const crias = animal.criasAsociadas
    .map(criaId => animals.find(a => a.id === criaId))
    .filter((a): a is Animal => !!a);
  return [...crias].sort((a, b) => {
    if (!a.fechaNacimiento) return b.fechaNacimiento ? 1 : 0;
    if (!b.fechaNacimiento) return -1;
    return a.fechaNacimiento.localeCompare(b.fechaNacimiento);
  });
}

/*
 * Antes solo se evitaba el ciclo directo: que la madre elegida fuera cría
 * del propio animal. Pero el árbol se rompe igual si se elige a una nieta,
 * bisnieta, etc., así que hace falta recorrer toda la descendencia. El
 * conjunto de visitados no es solo una optimización: si un ciclo ya quedó
 * guardado en los datos (A cría de B y B cría de A, por ejemplo importado a
 * mano), sin él esta función no terminaría nunca.
 */
export function esDescendiente(animals: Animal[], candidata: string, raiz: string): boolean {
  const visitados = new Set<string>();
  const pendientes = [raiz];
  while (pendientes.length) {
    const actual = pendientes.pop()!;
    if (visitados.has(actual)) continue;
    visitados.add(actual);
    const animal = animals.find(a => a.id === actual);
    if (!animal) continue;
    for (const hijoId of animal.criasAsociadas) {
      if (hijoId === candidata) return true;
      if (!visitados.has(hijoId)) pendientes.push(hijoId);
    }
  }
  return false;
}

/*
 * La manada se organiza por ubicación: es lo primero que mira un ganadero al
 * salir al campo, porque determina a qué cercado tiene que ir. Un animal sin
 * ubicación no se esconde en un hueco: se agrupa bajo una etiqueta visible.
 */
export const SIN_UBICACION = 'Sin ubicación';
export const ubicacionDe = (a: Animal) => a.ubicacion.trim() || SIN_UBICACION;

export interface ResumenUbicacion {
  ubicacion: string;
  total: number;
  hembras: number;
  machos: number;
  /** Edad media en meses; null si ningún animal del grupo tiene fecha válida. */
  mesesMedios: number | null;
}

/** Reparto del ganado activo por ubicación, de la manada más grande a la menor. */
export function porUbicacion(animals: Animal[], reference = today()): ResumenUbicacion[] {
  const grupos = new Map<string, Animal[]>();
  for (const a of animals) {
    if (!esActivo(a)) continue;
    const clave = ubicacionDe(a);
    const lista = grupos.get(clave);
    if (lista) lista.push(a);
    else grupos.set(clave, [a]);
  }
  return [...grupos.entries()]
    .map(([ubicacion, lista]) => {
      const edades = lista
        .map(a => mesesDeEdad(a.fechaNacimiento, reference))
        .filter((m): m is number => m !== null);
      return {
        ubicacion,
        total: lista.length,
        hembras: lista.filter(a => a.sexo === 'Hembra').length,
        machos: lista.filter(a => a.sexo === 'Macho').length,
        mesesMedios: edades.length ? edades.reduce((s, m) => s + m, 0) / edades.length : null
      };
    })
    .sort((a, b) => b.total - a.total || a.ubicacion.localeCompare(b.ubicacion, 'es'));
}

/* Alias en vez de interfaz para que la fila encaje directamente en la gráfica,
 * que espera un registro de valores sueltos. */
export type AltasMes = {
  /** Mes en formato AAAA-MM, para ordenar y buscar. */
  mes: string;
  label: string;
  hembras: number;
  machos: number;
  total: number;
};

const mesDe = (fecha: string) => fecha.slice(0, 7);
const sumarMes = (mes: string, meses: number) => {
  const d = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1 + meses, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/*
 * Historial de altas mes a mes. Se separa por sexo porque la pregunta real del
 * ganadero no es «cuántos animales entraron» sino «cuántas hembras de reposición
 * estoy metiendo». Los meses sin ninguna alta se incluyen con cero: un hueco en
 * la serie es información, no un dato que falte.
 */
export function altasPorMes(
  animals: Animal[],
  desde: string,
  hasta: string,
  campo: 'fechaAlta' | 'fechaNacimiento' = 'fechaAlta'
): AltasMes[] {
  if (!desde || !hasta || hasta < desde) return [];
  const primero = mesDe(desde),
    ultimo = mesDe(hasta);
  const meses: AltasMes[] = [];
  // El tope evita que una fecha disparatada tecleada a mano cuelgue la pantalla.
  for (let mes = primero; mes <= ultimo && meses.length < 600; mes = sumarMes(mes, 1)) {
    meses.push({
      mes,
      label: new Date(mes + '-01T12:00:00').toLocaleDateString('es-ES', {
        month: 'short',
        year: '2-digit'
      }),
      hembras: 0,
      machos: 0,
      total: 0
    });
  }
  const indice = new Map(meses.map((m, i) => [m.mes, i]));
  for (const a of animals) {
    const fecha = campo === 'fechaAlta' ? a.fechaAlta : a.fechaNacimiento;
    const i = indice.get(mesDe(fecha ?? ''));
    if (i === undefined) continue;
    meses[i].total++;
    if (a.sexo === 'Hembra') meses[i].hembras++;
    else meses[i].machos++;
  }
  return meses;
}

/** Estados en los que el animal pide una visita, no solo una anotación. */
export const necesitaAtencion = (a: Animal) =>
  esActivo(a) && ESTADOS_ATENCION.includes(a.estadoSanitario);
