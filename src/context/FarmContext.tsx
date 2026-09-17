import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react';
import type { FarmData, FarmProfile, UserRecord } from '../types';
import { loadData, replaceData } from '../services/db';
import { currentUser } from '../services/auth';
import { marcarCambios } from '../services/sincronizacion';
import { leerMetas, guardarMetas, sincronizar, type ResultadoSync } from '../services/sincronizar';
import { hayNube } from '../services/nube';
export type EstadoNube = 'inactiva' | 'sincronizando' | 'al-dia' | 'sin-conexion' | 'error';
interface FarmContextValue {
  user: UserRecord;
  data: FarmData;
  farm: FarmProfile;
  update: (change: (data: FarmData) => FarmData) => void;
  notice: string;
  notify: (text: string) => void;
  estadoNube: EstadoNube;
  sincronizarAhora: () => void;
}
const FarmContext = createContext<FarmContextValue | null>(null);
export function FarmProvider({ user, children }: { user: UserRecord; children: ReactNode }) {
  const [data, setData] = useState(() => loadData(user.id));
  const current = useRef(data);
  const metas = useRef(leerMetas(user.id));
  const sincronizando = useRef(false);
  const [estadoNube, setEstadoNube] = useState<EstadoNube>(hayNube ? 'al-dia' : 'inactiva');
  const [notice, notify] = useState('');
  const update = useCallback(
    (change: (data: FarmData) => FarmData) => {
      if (currentUser()?.id !== user.id) {
        notify('La sesión ha cambiado. Inicia sesión de nuevo antes de guardar.');
        return;
      }
      const next = change(current.current);
      replaceData(user.id, next);
      // Se anota qué ha cambiado para que la sincronización suba solo eso.
      if (hayNube) {
        metas.current = marcarCambios(current.current, next, metas.current);
        guardarMetas(user.id, metas.current);
      }
      current.current = next;
      setData(next);
    },
    [user.id]
  );

  const sincronizarAhora = useCallback(() => {
    if (!hayNube || sincronizando.current) return;
    sincronizando.current = true;
    setEstadoNube('sincronizando');
    void sincronizar(current.current, metas.current)
      .then((r: ResultadoSync) => {
        if (r.metas) metas.current = r.metas;
        if (r.datos && r.bajados) {
          replaceData(user.id, r.datos);
          current.current = r.datos;
          setData(r.datos);
        }
        if (r.estado === 'sincronizado') {
          setEstadoNube('al-dia');
          if (r.conflictos)
            notify(
              `${r.conflictos} ${r.conflictos === 1 ? 'ficha se ha resuelto' : 'fichas se han resuelto'} con la versión más reciente.`
            );
        } else if (r.estado === 'sin-conexion') setEstadoNube('sin-conexion');
        else if (r.estado === 'error') {
          setEstadoNube('error');
          if (r.mensaje) notify(r.mensaje);
        } else setEstadoNube('inactiva');
      })
      .finally(() => {
        sincronizando.current = false;
      });
  }, [user.id]);

  useEffect(() => {
    if (!hayNube) return;
    sincronizarAhora();
    // Al volver a la app y al recuperar cobertura, que es cuando hay algo que enviar.
    const alVolver = () => sincronizarAhora();
    window.addEventListener('focus', alVolver);
    window.addEventListener('online', alVolver);
    const timer = setInterval(alVolver, 5 * 60 * 1000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', alVolver);
      window.removeEventListener('online', alVolver);
    };
  }, [sincronizarAhora]);
  useEffect(() => {
    const refresh = (event: StorageEvent) => {
      if (event.key?.startsWith(`chaparra:v2:u:${user.id}:`)) {
        const next = loadData(user.id);
        current.current = next;
        setData(next);
      }
    };
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, [user.id]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => notify(''), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  if (!data.farm) return null;
  return (
    <FarmContext.Provider
      value={{ user, data, farm: data.farm, update, notice, notify, estadoNube, sincronizarAhora }}
    >
      {children}
    </FarmContext.Provider>
  );
}
export function useFarm() {
  const context = useContext(FarmContext);
  if (!context) throw new Error('No se ha cargado la explotación.');
  return context;
}
