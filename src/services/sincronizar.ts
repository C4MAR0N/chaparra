import type { FarmData } from '../types';
import { nube, puedeSincronizar } from './nube';
import {
  aplanar,
  aplicarMetas,
  fusionar,
  reconstruir,
  ultimoCambio,
  type Metas,
  type Registro
} from './sincronizacion';
import { readJson, writeJson } from './storage';

/*
 * Parte con efectos de la sincronización: red y almacenamiento.
 * Toda la lógica delicada (qué gana, qué baja, qué sube) vive en
 * `sincronizacion.ts`, que es pura y está cubierta por pruebas.
 */

const INICIO = new Date(0).toISOString();

const claveMetas = (userId: string) => `chaparra:v2:u:${userId}:metas`;
const claveDesde = (userId: string) => `chaparra:v2:u:${userId}:sincronizado`;

export const leerMetas = (userId: string): Metas => (readJson(claveMetas(userId)) as Metas) ?? {};
export const guardarMetas = (userId: string, metas: Metas) => writeJson(claveMetas(userId), metas);

const leerDesde = (userId: string): string =>
  (readJson(claveDesde(userId)) as string | null) ?? INICIO;
const guardarDesde = (userId: string, cuando: string) => writeJson(claveDesde(userId), cuando);

/**
 * Marca un registro como modificado en este dispositivo. La marca es local y
 * provisional: cuando el registro suba, el servidor pondrá la definitiva.
 */
export function marcarCambio(metas: Metas, tipo: Registro['tipo'], id: string, borrado = false) {
  return { ...metas, [`${tipo}:${id}`]: { actualizado: new Date().toISOString(), borrado } };
}

export interface ResultadoSync {
  estado: 'sincronizado' | 'sin-conexion' | 'sin-sesion' | 'error';
  bajados: number;
  subidos: number;
  conflictos: number;
  datos?: FarmData;
  metas?: Metas;
  mensaje?: string;
}

interface FilaRemota {
  tipo: Registro['tipo'];
  id: string;
  datos: unknown;
  actualizado: string;
  borrado: boolean;
}

/**
 * Una pasada completa: baja lo que cambió, sube lo propio y devuelve la
 * explotación resultante. No lanza excepciones: sin conexión no es un fallo,
 * es el estado normal en el campo.
 */
export async function sincronizar(data: FarmData, metas: Metas): Promise<ResultadoSync> {
  const base = { bajados: 0, subidos: 0, conflictos: 0 };
  if (!nube) return { ...base, estado: 'sin-conexion', mensaje: 'Servidor no configurado.' };
  if (!puedeSincronizar())
    return { ...base, estado: 'sin-conexion', mensaje: 'Sin conexión. Se guardará aquí.' };

  const { data: sesion } = await nube.auth.getSession();
  const usuario = sesion.session?.user;
  if (!usuario) return { ...base, estado: 'sin-sesion' };

  try {
    const desde = leerDesde(usuario.id);

    // Solo lo que ha cambiado desde la última vez: en el campo la conexión es
    // cara y lenta, y descargar la explotación entera cada vez no es viable.
    const { data: filas, error } = await nube
      .from('registros')
      .select('tipo,id,datos,actualizado,borrado')
      .gt('actualizado', desde);
    if (error) throw error;

    const remotos: Registro[] = (filas ?? []).map((f: FilaRemota) => ({
      tipo: f.tipo,
      id: f.id,
      datos: f.datos,
      actualizado: f.actualizado,
      borrado: f.borrado
    }));
    const locales = aplanar(data, metas);
    const { aplicar, subir, conflictos } = fusionar(locales, remotos);

    if (subir.length) {
      const { data: escritos, error: errorSubida } = await nube
        .from('registros')
        .upsert(
          subir.map(r => ({
            user_id: usuario.id,
            tipo: r.tipo,
            id: r.id,
            datos: r.datos ?? {},
            borrado: r.borrado
          })),
          { onConflict: 'user_id,tipo,id' }
        )
        .select('tipo,id,actualizado,borrado');
      if (errorSubida) throw errorSubida;
      // El servidor devuelve su marca de tiempo: es la que vale a partir de ahora.
      for (const e of escritos ?? []) {
        metas = {
          ...metas,
          [`${e.tipo}:${e.id}`]: { actualizado: e.actualizado, borrado: e.borrado }
        };
      }
    }

    let siguienteDatos = data;
    if (aplicar.length) {
      const vigentes = new Map(aplanar(data, metas).map(r => [`${r.tipo}:${r.id}`, r]));
      for (const r of aplicar) vigentes.set(`${r.tipo}:${r.id}`, r);
      siguienteDatos = reconstruir([...vigentes.values()], data);
      metas = aplicarMetas(metas, aplicar);
    }

    guardarDesde(usuario.id, ultimoCambio([...remotos, ...aplicar], desde));
    guardarMetas(usuario.id, metas);

    return {
      estado: 'sincronizado',
      bajados: aplicar.length,
      subidos: subir.length,
      conflictos: conflictos.length,
      datos: siguienteDatos,
      metas
    };
  } catch (e) {
    const { mensajeDeError } = await import('./nube');
    return { ...base, estado: 'error', mensaje: mensajeDeError(e) };
  }
}

/** Borra las marcas de sincronización, para forzar un cotejo completo. */
export function reiniciarSincronizacion(userId: string) {
  guardarDesde(userId, INICIO);
}
