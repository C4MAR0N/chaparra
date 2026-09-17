import type { FarmData } from '../types';

/*
 * Sincronización local-first.
 *
 * El dispositivo sigue siendo la fuente de verdad mientras se trabaja: en el
 * campo no hay cobertura y el ganadero no puede quedarse esperando al servidor.
 * El servidor solo guarda registros y responde "esto ha cambiado desde tal
 * momento".
 *
 * La explotación se descompone en registros independientes (un animal, una
 * factura, un ordeño...) para que solo viaje lo que cambia. En conflicto gana el
 * más reciente, comparando la marca de tiempo que pone el SERVIDOR, nunca el
 * dispositivo: un móvil con la hora mal puesta ganaría siempre.
 *
 * Esto significa que si se toca el mismo animal en dos sitios sin sincronizar
 * entre medias, una de las dos ediciones se pierde. Es una limitación asumida:
 * la alternativa (fusionar campo a campo) es mucho más compleja y, con un solo
 * ganadero y dos dispositivos, el caso es raro.
 */

export type Tipo = 'explotacion' | 'animal' | 'factura' | 'plantilla' | 'ordeno' | 'pesada';

export interface Registro {
  tipo: Tipo;
  id: string;
  datos: unknown;
  /** ISO. La pone el servidor al escribir. */
  actualizado: string;
  borrado: boolean;
}

/** Marcas locales de cada registro, aparte de los datos para no tocar el modelo. */
export interface Meta {
  actualizado: string;
  borrado?: boolean;
}
export type Metas = Record<string, Meta>;

export const clave = (tipo: Tipo, id: string) => `${tipo}:${id}`;

const UNICOS: Record<'explotacion' | 'plantilla', string> = {
  explotacion: 'unica',
  plantilla: 'unica'
};

/** Descompone la explotación en registros sincronizables. */
export function aplanar(data: FarmData, metas: Metas): Registro[] {
  const salida: Registro[] = [];
  const meter = (tipo: Tipo, id: string, datos: unknown) => {
    const m = metas[clave(tipo, id)];
    salida.push({
      tipo,
      id,
      datos,
      actualizado: m?.actualizado ?? new Date(0).toISOString(),
      borrado: m?.borrado ?? false
    });
  };

  if (data.farm) meter('explotacion', UNICOS.explotacion, data.farm);
  meter('plantilla', UNICOS.plantilla, data.saleTemplate);
  for (const a of data.animals) meter('animal', a.id, a);
  for (const f of data.invoices) meter('factura', f.id, f);
  for (const r of data.milkRecords) meter('ordeno', r.id, r);
  for (const r of data.weightRecords) meter('pesada', r.id, r);

  // Las lápidas no están en los datos, pero tienen que viajar.
  for (const [k, m] of Object.entries(metas)) {
    if (!m.borrado) continue;
    const corte = k.indexOf(':');
    const tipo = k.slice(0, corte) as Tipo;
    const id = k.slice(corte + 1);
    if (salida.some(r => r.tipo === tipo && r.id === id)) continue;
    salida.push({ tipo, id, datos: null, actualizado: m.actualizado, borrado: true });
  }
  return salida;
}

/** Vuelve a montar la explotación a partir de los registros vivos. */
export function reconstruir(registros: Registro[], base: FarmData): FarmData {
  const vivos = registros.filter(r => !r.borrado);
  const uno = <T>(tipo: Tipo): T | null => {
    const r = vivos.find(x => x.tipo === tipo);
    return r ? (r.datos as T) : null;
  };
  const muchos = <T>(tipo: Tipo): T[] => vivos.filter(x => x.tipo === tipo).map(x => x.datos as T);

  return {
    farm: uno<FarmData['farm']>('explotacion') ?? base.farm,
    saleTemplate: uno<FarmData['saleTemplate']>('plantilla') ?? base.saleTemplate,
    animals: muchos<FarmData['animals'][number]>('animal'),
    invoices: muchos<FarmData['invoices'][number]>('factura'),
    milkRecords: muchos<FarmData['milkRecords'][number]>('ordeno'),
    weightRecords: muchos<FarmData['weightRecords'][number]>('pesada')
  };
}

export interface Fusion {
  /** Registros remotos que hay que aplicar en el dispositivo. */
  aplicar: Registro[];
  /** Registros locales que hay que enviar al servidor. */
  subir: Registro[];
  /** Conflictos resueltos, para poder avisar de lo que se ha descartado. */
  conflictos: { tipo: Tipo; id: string; gana: 'local' | 'remoto' }[];
}

const esPosterior = (a: string, b: string) => Date.parse(a) > Date.parse(b);

/**
 * Decide qué baja y qué sube. Función pura: sin red, sin reloj, sin estado.
 * Todo lo delicado de la sincronización vive aquí para poder probarlo.
 */
export function fusionar(locales: Registro[], remotos: Registro[]): Fusion {
  const porClave = (lista: Registro[]) => new Map(lista.map(r => [clave(r.tipo, r.id), r]));
  const mapaLocal = porClave(locales);
  const mapaRemoto = porClave(remotos);

  const aplicar: Registro[] = [];
  const subir: Registro[] = [];
  const conflictos: Fusion['conflictos'] = [];

  for (const [k, remoto] of mapaRemoto) {
    const local = mapaLocal.get(k);
    if (!local) {
      aplicar.push(remoto);
      continue;
    }
    if (esPosterior(remoto.actualizado, local.actualizado)) {
      aplicar.push(remoto);
      // Solo es conflicto si ambos lados tienen cambios reales que difieren.
      if (
        JSON.stringify(local.datos) !== JSON.stringify(remoto.datos) ||
        local.borrado !== remoto.borrado
      )
        conflictos.push({ tipo: remoto.tipo, id: remoto.id, gana: 'remoto' });
    } else if (esPosterior(local.actualizado, remoto.actualizado)) {
      subir.push(local);
      if (
        JSON.stringify(local.datos) !== JSON.stringify(remoto.datos) ||
        local.borrado !== remoto.borrado
      )
        conflictos.push({ tipo: local.tipo, id: local.id, gana: 'local' });
    }
    // Misma marca de tiempo: se da por sincronizado y no se toca.
  }

  for (const [k, local] of mapaLocal) {
    if (!mapaRemoto.has(k)) subir.push(local);
  }

  return { aplicar, subir, conflictos };
}

/** Aplica sobre las marcas locales lo que ha llegado del servidor. */
export function aplicarMetas(metas: Metas, aplicados: Registro[]): Metas {
  const siguiente: Metas = { ...metas };
  for (const r of aplicados) {
    siguiente[clave(r.tipo, r.id)] = r.borrado
      ? { actualizado: r.actualizado, borrado: true }
      : { actualizado: r.actualizado };
  }
  return siguiente;
}

/** Marca de tiempo desde la que pedir cambios en la próxima sincronización. */
export function ultimoCambio(registros: Registro[], previo: string): string {
  return registros.reduce(
    (max, r) => (esPosterior(r.actualizado, max) ? r.actualizado : max),
    previo
  );
}
