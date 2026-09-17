import { useEffect, useState, useSyncExternalStore } from 'react';
import type { FarmProfile, UserRecord } from './types';
import { marcarEncuestaCompletada, updateUser } from './services/auth';
import { salir, usuarioActual } from './services/acceso';
import { emptySaleTemplate, loadData, replaceData } from './services/db';
import { getStorageWarning, subscribeStorageWarning } from './services/storage';
import { FarmProvider } from './context/FarmContext';
import { AuthScreen } from './components/AuthScreen';
import { Onboarding } from './components/Onboarding';
import { AppShell } from './components/AppShell';
import { MigrarExplotacion, explotacionesLocales } from './components/MigrarExplotacion';
import { Banner } from './components/ui';
export default function App() {
  const [user, setUser] = useState<UserRecord | null>(null),
    [cargando, setCargando] = useState(true),
    [omitirMigracion, setOmitirMigracion] = useState(false),
    [survey, setSurvey] = useState(false);
  const warning = useSyncExternalStore(subscribeStorageWarning, getStorageWarning);
  useEffect(() => {
    let vivo = true;
    /*
     * La sesión puede venir del servidor o del propio dispositivo. Se lee sin
     * bloquear: si no hay cobertura, `usuarioActual` cae a la sesión guardada y
     * el ganadero entra igual.
     */
    const refresh = () =>
      void usuarioActual().then(next => {
        if (!vivo) return;
        setUser(previous => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
        setCargando(false);
      });
    refresh();
    const storage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith('chaparra:v2:')) refresh();
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('storage', storage);
    window.addEventListener('focus', refresh);
    return () => {
      vivo = false;
      clearInterval(timer);
      window.removeEventListener('storage', storage);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  function signOut() {
    void salir();
    setUser(null);
    setSurvey(false);
  }
  function complete(farm: FarmProfile) {
    if (!user) return;
    const old = loadData(user.id);
    replaceData(user.id, {
      ...old,
      farm,
      saleTemplate: old.farm ? old.saleTemplate : { ...emptySaleTemplate(farm), email: user.email }
    });
    const updated = updateUser(user.id, {
      onboardingCompletedAt: user.onboardingCompletedAt ?? new Date().toISOString()
    });
    setUser(updated);
    setSurvey(false);
  }
  const farm = user ? loadData(user.id).farm : null;
  /*
   * Al entrar por primera vez con la cuenta del servidor, la explotación está
   * vacía pero los datos de antes siguen en el dispositivo. Se ofrece traerlos
   * antes de mandar al ganadero a rellenar la encuesta de cero.
   */
  const puedeMigrar =
    !!user &&
    user.origen === 'nube' &&
    !farm &&
    !omitirMigracion &&
    !!explotacionesLocales(user.id).length;
  return (
    <>
      {warning && (
        <div className="sticky top-0 z-30 p-3">
          <Banner tone="error">{warning}</Banner>
        </div>
      )}
      {cargando ? (
        <div className="flex min-h-screen items-center justify-center p-6">
          <p className="text-stone-600" role="status">
            Abriendo tu explotación…
          </p>
        </div>
      ) : !user ? (
        <AuthScreen onAccess={setUser} />
      ) : puedeMigrar ? (
        <MigrarExplotacion
          user={user}
          onHecho={() => {
            setOmitirMigracion(true);
            setUser(marcarEncuestaCompletada(user.id));
          }}
          onOmitir={() => setOmitirMigracion(true)}
        />
      ) : !user.onboardingCompletedAt || !farm || survey ? (
        <Onboarding
          key={user.id + (survey ? '-edit' : '-new')}
          user={user}
          initial={farm ?? undefined}
          onComplete={complete}
          onCancel={user.onboardingCompletedAt ? () => setSurvey(false) : signOut}
        />
      ) : (
        <FarmProvider key={user.id} user={user}>
          <AppShell onLogout={signOut} onSurvey={() => setSurvey(true)} onUserChange={setUser} />
        </FarmProvider>
      )}
    </>
  );
}
