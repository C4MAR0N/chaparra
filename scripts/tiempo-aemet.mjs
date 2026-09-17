/*
 * Descarga la predicción oficial de AEMET y la publica como archivos estáticos.
 *
 * Se ejecuta desde una tarea programada del repositorio, no desde el navegador:
 * la API key de AEMET vive en los secretos de GitHub y nunca llega al cliente.
 *
 * De AEMET se toma:
 *   - predicción municipal DIARIA  -> 7 días, temperaturas, cielo y probabilidad (%)
 *   - predicción municipal HORARIA -> 48 h, precipitación en mm, que se suma por día
 *
 * AEMET no publica litros más allá de esas 48 horas; del resto de días se queda
 * solo la probabilidad y la app completa los litros con Open-Meteo, indicándolo.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CLAVE = process.env.AEMET_API_KEY;
const BASE = 'https://opendata.aemet.es/opendata/api';
const SALIDA = 'public/tiempo';

if (!CLAVE) {
  console.error('Falta AEMET_API_KEY. Añádela como secreto del repositorio.');
  process.exit(1);
}

/** AEMET responde con un JSON que contiene la URL real de los datos. */
async function aemet(ruta) {
  const res = await fetch(`${BASE}${ruta}`, { headers: { api_key: CLAVE } });
  if (res.status === 401) throw new Error('API key de AEMET rechazada o caducada (401).');
  if (res.status === 429) throw new Error('AEMET ha limitado las peticiones (429).');
  if (!res.ok) throw new Error(`AEMET ha respondido ${res.status} en ${ruta}`);
  const sobre = await res.json();
  if (sobre.estado && sobre.estado !== 200) throw new Error(`AEMET: ${sobre.descripcion}`);
  if (!sobre.datos) throw new Error(`AEMET no ha devuelto URL de datos en ${ruta}`);
  const datos = await fetch(sobre.datos);
  if (!datos.ok) throw new Error(`No se han podido descargar los datos de ${ruta}`);
  return JSON.parse(await datos.text());
}

/*
 * Los diacriticos se expresan desde texto escapado a proposito: escritos
 * directos en la expresion regular acabarian como marcas combinantes
 * invisibles dentro de este archivo.
 */
const DIACRITICOS = new RegExp('[\u0300-\u036f]', 'g');

const sinAcentos = t =>
  t
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .toLowerCase()
    .trim();

async function resolverCodigos(deseados) {
  const maestro = await aemet('/maestro/municipios');
  return deseados.map(m => {
    const encontrado = maestro.find(
      x =>
        sinAcentos(x.nombre) === sinAcentos(m.nombre) &&
        (!m.provincia || sinAcentos(x.nombre_provincia ?? '') === sinAcentos(m.provincia))
    );
    if (!encontrado) {
      console.warn(`No se ha encontrado en AEMET: ${m.nombre} (${m.provincia ?? 'sin provincia'})`);
      return null;
    }
    // El id viene como "id28079"; AEMET espera los 5 dígitos.
    const codigo = String(encontrado.id ?? '').replace(/\D/g, '').padStart(5, '0');
    return { ...m, codigo, nombreAemet: encontrado.nombre };
  });
}

/** Códigos WMO aproximados a partir del texto de estado del cielo de AEMET. */
function codigoCielo(texto = '') {
  const t = sinAcentos(texto);
  if (!t) return null;
  if (t.includes('tormenta')) return 95;
  if (t.includes('nieve')) return 73;
  if (t.includes('chubasco')) return 80;
  if (t.includes('lluvia')) return 63;
  if (t.includes('llovizna')) return 53;
  if (t.includes('niebla') || t.includes('bruma')) return 45;
  if (t.includes('cubierto')) return 3;
  if (t.includes('nuboso')) return t.includes('poco') ? 2 : 3;
  if (t.includes('despejado')) return 0;
  return null;
}

async function municipio({ codigo, nombre, provincia }) {
  const [diaria] = await aemet(`/prediccion/especifica/municipio/diaria/${codigo}`);
  let litrosPorDia = new Map();
  try {
    const [horaria] = await aemet(`/prediccion/especifica/municipio/horaria/${codigo}`);
    for (const d of horaria?.prediccion?.dia ?? []) {
      const fecha = String(d.fecha).slice(0, 10);
      const suma = (d.precipitacion ?? []).reduce((s, p) => {
        const v = Number(String(p.value).replace(',', '.'));
        return Number.isFinite(v) ? s + v : s;
      }, 0);
      litrosPorDia.set(fecha, Math.round(suma * 10) / 10);
    }
  } catch (e) {
    console.warn(`Sin predicción horaria para ${nombre}: ${e.message}`);
  }

  const dias = (diaria?.prediccion?.dia ?? []).slice(0, 7).map(d => {
    const fecha = String(d.fecha).slice(0, 10);
    // El periodo "00-24" es el resumen del día; si no está, se toma el máximo.
    const probs = (d.probPrecipitacion ?? [])
      .map(p => Number(p.value))
      .filter(Number.isFinite);
    const cielo = (d.estadoCielo ?? []).find(c => c.descripcion)?.descripcion ?? '';
    return {
      fecha,
      tempMin: Number(d.temperatura?.minima ?? NaN) || null,
      tempMax: Number(d.temperatura?.maxima ?? NaN) || null,
      probabilidad: probs.length ? Math.max(...probs) : null,
      litros: litrosPorDia.has(fecha) ? litrosPorDia.get(fecha) : null,
      codigo: codigoCielo(cielo)
    };
  });

  return {
    municipio: nombre,
    provincia: provincia ?? '',
    codigo,
    fuente: 'AEMET · Agencia Estatal de Meteorología',
    actualizado: new Date().toISOString(),
    dias
  };
}

const deseados = JSON.parse(await readFile('tiempo-municipios.json', 'utf8'));
const resueltos = (await resolverCodigos(deseados)).filter(Boolean);
await mkdir(SALIDA, { recursive: true });

const indice = [];
for (const m of resueltos) {
  try {
    const datos = await municipio(m);
    await writeFile(path.join(SALIDA, `${m.codigo}.json`), JSON.stringify(datos), 'utf8');
    indice.push({ nombre: m.nombre, provincia: m.provincia ?? '', codigo: m.codigo });
    console.log(`${m.nombre} (${m.codigo}): ${datos.dias.length} días`);
  } catch (e) {
    console.error(`Error con ${m.nombre}: ${e.message}`);
    process.exitCode = 1;
  }
}
await writeFile(path.join(SALIDA, 'indice.json'), JSON.stringify(indice), 'utf8');
console.log(`Índice con ${indice.length} municipios.`);
