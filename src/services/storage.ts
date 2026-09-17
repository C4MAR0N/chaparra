type Area = 'local' | 'session';
const memory = new Map<string, string | null>();
const pending = new Set<string>();
let warning = '';
const listeners = new Set<() => void>();
export const getStorageWarning = () => warning;
export function subscribeStorageWarning(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function warnStorage(
  message = 'No se ha podido guardar en este navegador. Los cambios siguen en memoria: exporta una copia antes de cerrar esta pestaña.'
) {
  if (warning === message) return;
  warning = message;
  queueMicrotask(() => listeners.forEach(fn => fn()));
}
const areaStorage = (area: Area) =>
  area === 'local' ? window.localStorage : window.sessionStorage;
export function readRaw(key: string, area: Area = 'local'): string | null {
  const cacheKey = area + ':' + key;
  if (pending.has(cacheKey)) return memory.get(cacheKey) ?? null;
  try {
    const value = areaStorage(area).getItem(key);
    memory.set(cacheKey, value);
    return value;
  } catch {
    warnStorage();
    return memory.get(cacheKey) ?? null;
  }
}
export function writeRaw(key: string, value: string | null, area: Area = 'local') {
  const cacheKey = area + ':' + key;
  memory.set(cacheKey, value);
  try {
    if (value === null) areaStorage(area).removeItem(key);
    else areaStorage(area).setItem(key, value);
    pending.delete(cacheKey);
    return true;
  } catch {
    pending.add(cacheKey);
    warnStorage();
    return false;
  }
}
export function readJson(key: string, area: Area = 'local'): unknown {
  const value = readRaw(key, area);
  if (value === null) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    warnStorage(
      'Hay datos guardados que no se pueden leer. No se han borrado. Conserva una copia del navegador antes de sustituirlos.'
    );
    return null;
  }
}
export function writeJson(key: string, value: unknown, area: Area = 'local') {
  try {
    return writeRaw(key, JSON.stringify(value), area);
  } catch {
    warnStorage();
    return false;
  }
}
export function initializeStorage() {
  if (readRaw('chaparra:v2:initialized') === '1') return;
  [
    'chaparra_animals_v1',
    'chaparra_farm_config_v1',
    'chaparra_invoices_v1',
    'chaparra_sale_template_v1'
  ].forEach(key => writeRaw(key, null));
  writeRaw('chaparra:v2:initialized', '1');
}
// Mantiene una importación coherente: si falla una escritura, restaura lo persistido
// y conserva el conjunto nuevo completo en memoria para poder exportarlo.
export function writeBatchJson(entries: [string, unknown][]) {
  const serialized = entries.map(([key, value]) => [key, JSON.stringify(value)] as const);
  const previous = serialized.map(([key]) => [key, readRaw(key)] as const);
  try {
    for (const [key, value] of serialized) areaStorage('local').setItem(key, value);
    for (const [key, value] of serialized) {
      memory.set('local:' + key, value);
      pending.delete('local:' + key);
    }
    return true;
  } catch {
    for (const [key, value] of previous) {
      try {
        if (value === null) areaStorage('local').removeItem(key);
        else areaStorage('local').setItem(key, value);
      } catch {
        /* Se avisa y se mantiene la copia en memoria. */
      }
    }
    for (const [key, value] of serialized) {
      memory.set('local:' + key, value);
      pending.add('local:' + key);
    }
    warnStorage();
    return false;
  }
}
