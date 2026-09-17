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
interface FarmContextValue {
  user: UserRecord;
  data: FarmData;
  farm: FarmProfile;
  update: (change: (data: FarmData) => FarmData) => void;
  notice: string;
  notify: (text: string) => void;
}
const FarmContext = createContext<FarmContextValue | null>(null);
export function FarmProvider({ user, children }: { user: UserRecord; children: ReactNode }) {
  const [data, setData] = useState(() => loadData(user.id));
  const current = useRef(data);
  const [notice, notify] = useState('');
  const update = useCallback(
    (change: (data: FarmData) => FarmData) => {
      if (currentUser()?.id !== user.id) {
        notify('La sesión ha cambiado. Inicia sesión de nuevo antes de guardar.');
        return;
      }
      const next = change(current.current);
      replaceData(user.id, next);
      current.current = next;
      setData(next);
    },
    [user.id]
  );
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
    <FarmContext.Provider value={{ user, data, farm: data.farm, update, notice, notify }}>
      {children}
    </FarmContext.Provider>
  );
}
export function useFarm() {
  const context = useContext(FarmContext);
  if (!context) throw new Error('No se ha cargado la explotación.');
  return context;
}
