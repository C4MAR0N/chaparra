import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { FarmProfile, UserRecord } from './types';
import { marcarEncuestaCompletada, updateUser } from './services/auth';
import { salir, usuarioActual } from './services/acceso';
import { emptySaleTemplate, loadData, replaceData } from './services/db';
import { getStorageWarning, subscribeStorageWarning } from './services/storage';
import { guardarMetas, leerMetas, sincronizar } from './services/sincronizar';
import { FarmProvider } from './context/FarmContext';
import { AuthScreen } from './components/AuthScreen';
import { Onboarding } from './components/Onboarding';
import { AppShell } from './components/AppShell';
import { MigrarExplotacion, explotacionesLocales } from './components/MigrarExplotacion';
import { Banner, Button } from './components/ui';
export default function App() {
  const [user, setUser] = useState<UserRecord | null>(null),
    [cargando, setCargando] = useState(true),
    [omitirMigracion, setOmitirMigracion] = useState(false),
    [survey, setSurvey] = useState(false);
  /*
   * Primera entrada en un dispositivo nuevo.
   *
   * La explotación está en el servidor, pero aquí todavía no hay nada, y quien
   * baja los datos es `FarmProvider`, que solo se monta cuando ya existe una
   * explotación. Sin este paso, el ganadero entraba con sus credenciales en el
   * móvil y la aplicación le pedía rellenar la encuesta otra vez, como si fuera
   * nuevo, con sus 235 animales esperando en el servidor.
   */
  const [trayendo, setTrayendo] = useState(false),
    [falloAlTraer, setFalloAlTraer] = useState(''),
    [traido, setTraido] = useState(0);
  const intentado = useRef<string | null>(null);
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
  const traerExplotacion = useCallback(async (u: UserRecord) => {
    setTrayendo(true);
    setFalloAlTraer('');
    const r = await sincronizar(loadData(u.id), leerMetas(u.id));
    if (r.datos) replaceData(u.id, r.datos);
    if (r.metas) guardarMetas(u.id, r.metas);
    /*
     * Sin conexión no se sigue adelante: mandar a la encuesta a alguien que ya
     * tiene explotación le haría crear una segunda que luego chocaría con la
     * suya. La primera vez en un dispositivo hace falta cobertura, y se dice.
     */
    if (r.estado !== 'sincronizado')
      setFalloAlTraer(r.mensaje || 'No se ha podido contactar con el servidor.');
    /*
     * La marca de encuesta hecha es de cada dispositivo y no viaja al servidor.
     * Si la explotación ha bajado, la encuesta ya se rellenó en su día en otro
     * aparato: se anota aquí para que el resto de la aplicación lo sepa.
     */
    if (r.datos?.farm) setUser(marcarEncuestaCompletada(u.id));
    setTrayendo(false);
    setTraido(n => n + 1);
  }, []);

  useEffect(() => {
    if (cargando || !user || user.origen !== 'nube') return;
    if (intentado.current === user.id || loadData(user.id).farm) return;
    intentado.current = user.id;
    void traerExplotacion(user);
  }, [cargando, user, traerExplotacion]);

  function signOut() {
    void salir();
    setUser(null);
    setSurvey(false);
    setFalloAlTraer('');
    intentado.current = null;
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
  /*
   * Todavía no se ha intentado bajar la explotación de esta cuenta. Se mira en
   * el propio render para no enseñar la encuesta durante el fotograma que va
   * desde que aparece el usuario hasta que arranca el efecto que la baja.
   */
  const pendienteDeTraer =
    !!user && user.origen === 'nube' && !cargando && intentado.current !== user.id;
  // `traido` fuerza releer la explotación cuando la primera bajada la trae.
  const farm = useMemo(() => (user ? loadData(user.id).farm : null), [user, traido]);
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
      ) : trayendo || (pendienteDeTraer && !farm) ? (
        <div className="flex min-h-screen items-center justify-center p-6">
          <p className="text-stone-600" role="status">
            Trayendo tu explotación…
          </p>
        </div>
      ) : puedeMigrar ? (
        <MigrarExplotacion
          user={user}
          onHecho={() => {
            setOmitirMigracion(true);
            setUser(marcarEncuestaCompletada(user.id));
          }}
          onOmitir={() => setOmitirMigracion(true)}
        />
      ) : falloAlTraer && !farm ? (
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 p-6">
          <h1 className="page-heading">No hemos podido traer tu explotación</h1>
          <p className="text-sm leading-relaxed text-stone-600">
            La primera vez que entras en un dispositivo hace falta conexión para bajar tus datos.
            Después funcionará también en el campo, sin cobertura.
          </p>
          <Banner tone="error">{falloAlTraer}</Banner>
          <Button onClick={() => void traerExplotacion(user)}>Reintentar</Button>
          <Button variant="ghost" onClick={signOut}>
            Cerrar sesión
          </Button>
        </div>
      ) : /*
       * La encuesta existe para crear la explotación, así que solo se enseña
       * cuando falta. Antes la forzaba `onboardingCompletedAt`, que es una
       * marca de cada dispositivo: al entrar en el móvil con una cuenta ya
       * registrada volvía a pedirla aunque los datos estuvieran en el servidor.
       */
      !farm || survey ? (
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
