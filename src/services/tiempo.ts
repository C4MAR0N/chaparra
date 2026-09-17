import type { Municipio } from '../types';

/*
 * Previsión meteorológica a 5 días.
 *
 * AEMET es la fuente oficial, pero su predicción municipal diaria publica la
 * PROBABILIDAD de lluvia (%), no los litros. Los milímetros solo los da en la
 * predicción horaria, que llega a 48 horas. Como en el campo lo que importa es
 * cuánta agua va a caer, se combinan las dos fuentes y se deja claro en pantalla
 * de dónde sale cada dato:
 *
 *   - AEMET      -> temperaturas, estado del cielo y probabilidad. Y litros en
 *                   los días que cubre su predicción horaria.
 *   - Open-Meteo -> litros del resto de días (modelo ECMWF).
 *
 * Los datos de AEMET llegan como un archivo estático que actualiza una tarea
 * programada del repositorio, para no exponer la API key en el navegador. Si ese
 * archivo no existe todavía, se usa Open-Meteo para todo y así se indica.
 */

export type Fuente = 'AEMET' | 'Open-Meteo';

export interface DiaPrevision {
  fecha: string;
  codigo: number;
  tempMin: number | null;
  tempMax: number | null;
  litros: number | null;
  fuenteLitros: Fuente | null;
  probabilidad: number | null;
  fuenteProbabilidad: Fuente | null;
}

export interface Prevision {
  dias: DiaPrevision[];
  fuentes: Fuente[];
  actualizado: string;
}

const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
const METEO = 'https://api.open-meteo.com/v1/forecast';
const CACHE_MS = 60 * 60 * 1000; // La previsión diaria no cambia más de una vez por hora.

export async function buscarMunicipios(nombre: string, signal?: AbortSignal): Promise<Municipio[]> {
  const texto = nombre.trim();
  if (texto.length < 3) return [];
  const url = `${GEO}?name=${encodeURIComponent(texto)}&count=20&language=es&format=json&countryCode=ES`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('No se ha podido buscar el municipio.');
  const datos: unknown = await res.json();
  const lista = (datos as { results?: unknown[] }).results ?? [];
  return lista
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .filter(r => r.country_code === 'ES' && typeof r.name === 'string')
    .map(r => ({
      nombre: String(r.name),
      provincia: String(r.admin2 ?? r.admin1 ?? '').replace(/^Provincia de /i, ''),
      lat: Number(r.latitude),
      lon: Number(r.longitude)
    }))
    .filter(m => Number.isFinite(m.lat) && Number.isFinite(m.lon));
}

interface RespuestaMeteo {
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    precipitation_sum?: (number | null)[];
    precipitation_probability_max?: (number | null)[];
  };
}

/** Predicción diaria de AEMET publicada como archivo estático por la tarea programada. */
interface AemetDia {
  fecha: string;
  tempMin?: number | null;
  tempMax?: number | null;
  probabilidad?: number | null;
  litros?: number | null;
  codigo?: number | null;
}

/*
 * Los diacriticos se expresan desde texto escapado a proposito: escritos
 * directos en la expresion regular acabarian como marcas combinantes
 * invisibles dentro de este archivo.
 */
const DIACRITICOS = new RegExp('[\u0300-\u036f]', 'g');

const sinAcentos = (t: string) => t.normalize('NFD').replace(DIACRITICOS, '').toLowerCase().trim();

/**
 * Resuelve el código INE del municipio a partir del índice que publica la tarea
 * programada, para que el ganadero no tenga que conocerlo ni teclearlo.
 */
async function codigoDe(municipio: Municipio): Promise<string | null> {
  if (municipio.codigoIne) return municipio.codigoIne;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}tiempo/indice.json`, { cache: 'no-cache' });
    if (!res.ok) return null;
    const lista: unknown = await res.json();
    if (!Array.isArray(lista)) return null;
    const encontrado = lista.find(
      (x: { nombre?: string; provincia?: string; codigo?: string }) =>
        typeof x?.nombre === 'string' &&
        sinAcentos(x.nombre) === sinAcentos(municipio.nombre) &&
        (!municipio.provincia ||
          !x.provincia ||
          sinAcentos(x.provincia) === sinAcentos(municipio.provincia))
    ) as { codigo?: string } | undefined;
    return typeof encontrado?.codigo === 'string' ? encontrado.codigo : null;
  } catch {
    return null;
  }
}

async function leerAemet(municipio: Municipio): Promise<AemetDia[] | null> {
  try {
    const codigo = await codigoDe(municipio);
    if (!codigo) return null;
    const res = await fetch(`${import.meta.env.BASE_URL}tiempo/${codigo}.json`, {
      cache: 'no-cache'
    });
    if (!res.ok) return null;
    const datos: unknown = await res.json();
    const dias = (datos as { dias?: unknown }).dias;
    if (!Array.isArray(dias)) return null;
    return dias.filter(
      (d): d is AemetDia => typeof d === 'object' && d !== null && typeof d.fecha === 'string'
    );
  } catch {
    // Sin conexión o sin predicción publicada todavía: se sigue con Open-Meteo.
    return null;
  }
}

const memoria = new Map<string, { cuando: number; valor: Prevision }>();

export async function obtenerPrevision(municipio: Municipio, dias = 5): Promise<Prevision> {
  const clave = `${municipio.lat.toFixed(3)},${municipio.lon.toFixed(3)},${municipio.codigoIne ?? ''},${dias}`;
  const guardado = memoria.get(clave);
  if (guardado && Date.now() - guardado.cuando < CACHE_MS) return guardado.valor;

  const url =
    `${METEO}?latitude=${municipio.lat}&longitude=${municipio.lon}` +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max' +
    `&timezone=Europe%2FMadrid&forecast_days=${dias}`;

  const [res, aemet] = await Promise.all([fetch(url), leerAemet(municipio)]);
  if (!res.ok) throw new Error('No se ha podido consultar la previsión.');
  const datos = (await res.json()) as RespuestaMeteo;
  const d = datos.daily;
  if (!d?.time?.length) throw new Error('La previsión ha llegado vacía.');

  const porFecha = new Map((aemet ?? []).map(x => [x.fecha, x]));
  const fuentes = new Set<Fuente>();

  const lista: DiaPrevision[] = d.time.slice(0, dias).map((fecha, i) => {
    const of = porFecha.get(fecha);
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

    const litrosAemet = num(of?.litros);
    const litros = litrosAemet ?? num(d.precipitation_sum?.[i]);
    const fuenteLitros: Fuente | null =
      litros === null ? null : litrosAemet !== null ? 'AEMET' : 'Open-Meteo';

    const probAemet = num(of?.probabilidad);
    const probabilidad = probAemet ?? num(d.precipitation_probability_max?.[i]);
    const fuenteProbabilidad: Fuente | null =
      probabilidad === null ? null : probAemet !== null ? 'AEMET' : 'Open-Meteo';

    if (fuenteLitros) fuentes.add(fuenteLitros);
    if (fuenteProbabilidad) fuentes.add(fuenteProbabilidad);

    return {
      fecha,
      codigo: num(of?.codigo) ?? d.weather_code?.[i] ?? 0,
      tempMin: num(of?.tempMin) ?? num(d.temperature_2m_min?.[i]),
      tempMax: num(of?.tempMax) ?? num(d.temperature_2m_max?.[i]),
      litros,
      fuenteLitros,
      probabilidad,
      fuenteProbabilidad
    };
  });

  const valor: Prevision = {
    dias: lista,
    fuentes: [...fuentes].sort(),
    actualizado: new Date().toISOString()
  };
  memoria.set(clave, { cuando: Date.now(), valor });
  return valor;
}

/** Códigos WMO agrupados en las situaciones que distingue un ganadero. */
export function describirCielo(codigo: number): string {
  if (codigo === 0) return 'Despejado';
  if (codigo <= 2) return 'Poco nuboso';
  if (codigo === 3) return 'Nuboso';
  if (codigo <= 48) return 'Niebla';
  if (codigo <= 57) return 'Llovizna';
  if (codigo <= 67) return 'Lluvia';
  if (codigo <= 77) return 'Nieve';
  if (codigo <= 82) return 'Chubascos';
  if (codigo <= 86) return 'Chubascos de nieve';
  return 'Tormenta';
}
