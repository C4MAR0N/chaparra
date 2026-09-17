import type { InvoiceCategory, InvoiceDoc } from '../types';
import { today } from './domain';

/*
 * Lectura de una factura a partir de su texto.
 *
 * No hay dos facturas iguales: la de la cooperativa, la del veterinario y el
 * albarán del pienso no se parecen en nada. Así que esto no intenta entender el
 * documento, sino encontrar cuatro datos con los que el ganadero no tenga que
 * empezar de cero: importe, fecha, proveedor y de qué va el gasto.
 *
 * Todo lo que sale de aquí es una PROPUESTA. Nada se guarda sin que la persona
 * lo vea: un importe mal leído por una coma descuadra las cuentas sin que nadie
 * se entere, y eso es peor que teclearlo a mano.
 */

export interface SugerenciaFactura {
  titulo?: string;
  proveedor?: string;
  importeTotalEuro?: number;
  fecha?: string;
  categoria?: InvoiceCategory;
  tipo?: InvoiceDoc['tipo'];
  nif?: string;
  /** Nombre de los campos que se han deducido, para poder decir qué falta. */
  encontrados: string[];
}

/*
 * Un importe español se escribe 1.234,56 y uno anglosajón 1,234.56. El último
 * separador manda: si es la coma, los puntos son miles, y al revés.
 */
export function numeroEspanol(bruto: string): number | null {
  const limpio = bruto.replace(/[^\d.,-]/g, '');
  if (!/\d/.test(limpio)) return null;
  const coma = limpio.lastIndexOf(','),
    punto = limpio.lastIndexOf('.');
  const normal =
    coma > punto
      ? limpio.replace(/\./g, '').replace(',', '.')
      : punto > coma
        ? limpio.replace(/,/g, '')
        : limpio.replace(',', '.');
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

/* Un número solo cuenta como dinero si lleva dos decimales o el símbolo del
 * euro. Sin eso, el «21» de «IVA 21%» pasaría por un importe. */
const IMPORTE = new RegExp(
  '(?:€\\s*)?-?\\d{1,3}(?:\\.\\d{3})+,\\d{2}|(?:€\\s*)?-?\\d+[.,]\\d{2}(?:\\s*€)?|€\\s*-?\\d+',
  'g'
);

const importesDe = (linea: string) =>
  (linea.match(IMPORTE) ?? []).map(numeroEspanol).filter((n): n is number => n !== null);

/*
 * Orden de preferencia para el importe. «Total a pagar» es inequívoco;
 * «total» a secas aparece también en «total base imponible», así que va al
 * final y se toma la última aparición, que en una factura es la de abajo.
 */
const CLAVES_IMPORTE: RegExp[] = [
  /total\s+(?:a\s+pagar|a\s+abonar|factura|documento|l[ií]quido)/i,
  /(?:importe|l[ií]quido)\s+(?:total|a\s+pagar)/i,
  /\btotal\b/i
];

function buscarImporte(lineas: string[]): number | undefined {
  for (const clave of CLAVES_IMPORTE) {
    for (let i = lineas.length - 1; i >= 0; i--) {
      if (!clave.test(lineas[i])) continue;
      // El importe suele ir en la misma línea; si no, en la siguiente.
      const aqui = importesDe(lineas[i]);
      if (aqui.length) return Math.abs(aqui[aqui.length - 1]);
      const siguiente = importesDe(lineas[i + 1] ?? '');
      if (siguiente.length) return Math.abs(siguiente[0]);
    }
  }
  // Sin ninguna palabra clave, el total de una factura es casi siempre la
  // cantidad más alta que aparece en ella.
  const todos = lineas.flatMap(importesDe).map(Math.abs);
  return todos.length ? Math.max(...todos) : undefined;
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre'
];

function fechaValida(dia: number, mes: number, ano: number, hoy: string): string | null {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const iso = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  const d = new Date(iso + 'T12:00:00');
  if (Number.isNaN(d.getTime()) || d.getDate() !== dia) return null;
  // Una factura no puede ser de mañana, ni de antes de que existiera el euro.
  return iso <= hoy && ano >= 2002 ? iso : null;
}

function fechasDe(texto: string, hoy: string): string[] {
  const salida: string[] = [];
  const numerica = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/g;
  for (const m of texto.matchAll(numerica)) {
    const ano = Number(m[3].length === 2 ? '20' + m[3] : m[3]);
    const iso = fechaValida(Number(m[1]), Number(m[2]), ano, hoy);
    if (iso) salida.push(iso);
  }
  const conLetras = new RegExp('\\b(\\d{1,2})\\s+de\\s+([a-zá-ú]+)\\s+de\\s+(\\d{4})', 'gi');
  for (const m of texto.matchAll(conLetras)) {
    const mes = MESES.findIndex(n => n.startsWith(m[2].toLocaleLowerCase('es').slice(0, 4)));
    if (mes < 0) continue;
    const iso = fechaValida(Number(m[1]), mes + 1, Number(m[3]), hoy);
    if (iso) salida.push(iso);
  }
  return salida;
}

function buscarFecha(lineas: string[], hoy: string): string | undefined {
  // Una fecha junto a la palabra «fecha» vale más que una suelta, que puede ser
  // el vencimiento o la del sello del banco.
  for (const linea of lineas) {
    if (!/fecha|emisi[oó]n/i.test(linea) || /vencimiento|caduc/i.test(linea)) continue;
    const [primera] = fechasDe(linea, hoy);
    if (primera) return primera;
  }
  const todas = fechasDe(lineas.join('\n'), hoy);
  // Sin pista, la más reciente: el resto suelen ser de albaranes anteriores.
  return todas.length ? todas.sort().at(-1) : undefined;
}

/* NIF de persona (8 cifras y letra) o CIF de empresa (letra, 7 cifras y control). */
const PATRON_NIF = '\\b(?:[ABCDEFGHJNPQRSUVW]\\d{7}[0-9A-J]|\\d{8}[A-Z])\\b';
const NIF = new RegExp(PATRON_NIF, 'g');
/* Copia sin `g`: `test` sobre una expresión global arrastra `lastIndex` y
 * devolvería resultados distintos en llamadas consecutivas. */
const ES_NIF = new RegExp(PATRON_NIF);

const RUIDO =
  /^(factura|albar[aá]n|ticket|recibo|n[ºo°]|num|cliente|fecha|p[aá]gina|original|copia|iva|base|total|importe|direcci[oó]n|tel[eé]fono|email|c\.?i\.?f|n\.?i\.?f)\b/i;
const SOCIEDAD =
  /\b(s\.?\s?l\.?u?|s\.?\s?a\.?|s\.?\s?c\.?|s\.?\s?coop|sociedad|cooperativa|coop)\b/i;

function buscarProveedor(lineas: string[]): string | undefined {
  const limpia = (t: string) => t.replace(/\s+/g, ' ').trim();
  const util = (t: string) =>
    t.length >= 4 && t.length <= 70 && /[a-zá-úñ]/i.test(t) && !RUIDO.test(t) && !ES_NIF.test(t);

  // El nombre con forma de sociedad es el más fiable, lo pongan donde lo pongan.
  const sociedad = lineas.map(limpia).find(t => util(t) && SOCIEDAD.test(t));
  if (sociedad) return sociedad;
  // Si no, el membrete: la primera línea con texto de las primeras del documento.
  return lineas.slice(0, 8).map(limpia).find(util);
}

/*
 * A qué categoría suena el gasto. Las palabras son las que de verdad aparecen
 * en las facturas del campo, no las del formulario.
 */
const CATEGORIAS_POR_PALABRA: [RegExp, InvoiceCategory][] = [
  [
    /pienso|forraje|alfalfa|\bpaja\b|cereal|ma[ií]z|cebada|corrector|sal\s+mineral|lactorreemplazante|alimentaci[oó]n/i,
    'Pienso/Alimentación'
  ],
  [
    /veterinari|vacuna|saneamiento|antibi[oó]tic|desparasit|medicament|crotal|sanitari|farmac|brucel|tuberculin/i,
    'Veterinario/Sanidad'
  ],
  [
    /gas[oó]leo|gasoil|di[eé]sel|carburante|combustible|tractor|maquinaria|recambio|neum[aá]tic|taller|reparaci[oó]n|lubricante/i,
    'Maquinaria/Combustible'
  ],
  [/matadero|canal|ternero|a[ñn]ojo|lonja|venta\s+de\s+ganado|cebadero/i, 'Venta Ganado'],
  [/leche|l[aá]ctea|litros\s+de\s+leche|central\s+lechera/i, 'Venta Leche']
];

function buscarCategoria(texto: string): InvoiceCategory | undefined {
  for (const [palabras, categoria] of CATEGORIAS_POR_PALABRA) {
    if (palabras.test(texto)) return categoria;
  }
  return undefined;
}

export function interpretarFactura(texto: string, hoy = today()): SugerenciaFactura {
  const lineas = texto
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
  if (!lineas.length) return { encontrados: [] };

  const importeTotalEuro = buscarImporte(lineas);
  const fecha = buscarFecha(lineas, hoy);
  const proveedor = buscarProveedor(lineas);
  const categoria = buscarCategoria(texto);
  const nif = texto.match(NIF)?.[0];
  /*
   * Casi todo lo que se fotografía es un gasto. Solo se propone ingreso cuando
   * el documento habla claramente de una venta, y aun así el ganadero lo ve.
   */
  const tipo: InvoiceDoc['tipo'] =
    categoria === 'Venta Ganado' || categoria === 'Venta Leche' ? 'Venta' : 'Compra / Gasto';

  const encontrados = [
    importeTotalEuro !== undefined && 'el importe',
    fecha && 'la fecha',
    proveedor && 'el proveedor',
    categoria && 'la categoría'
  ].filter((v): v is string => Boolean(v));

  return {
    // El concepto rara vez viene con esa etiqueta; se propone algo editable en
    // vez de inventarse una descripción que no está en el papel.
    titulo: proveedor ? `Factura de ${proveedor}` : undefined,
    proveedor,
    importeTotalEuro,
    fecha,
    categoria,
    tipo,
    nif,
    encontrados
  };
}
