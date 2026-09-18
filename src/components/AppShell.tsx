import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  CloudOff,
  CloudRain,
  RefreshCw,
  HardDrive,
  Leaf,
  LogOut,
  Receipt,
  Settings,
  TrendingUp
} from 'lucide-react';
import type { Especie, UserRecord } from '../types';
import { useFarm } from '../context/FarmContext';
import { especieLabel } from '../lib/constants';
import { Banner, Button, SegmentedControl } from './ui';
import { CrotalList } from './CrotalList';
import { ProductionModule } from './ProductionModule';
import { InvoiceModule } from './InvoiceModule';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { FarmSettingsModal } from './FarmSettingsModal';
import { Tiempo } from './Tiempo';
type Tab = 'herd' | 'production' | 'invoices' | 'reports' | 'weather';
const pestañasPorEnlace: Record<string, Tab> = {
  rebano: 'herd',
  produccion: 'production',
  facturas: 'invoices',
  informes: 'reports',
  tiempo: 'weather'
};

function pestañaInicial(): Tab {
  /* Los accesos directos de Android llegan antes de iniciar sesión. Se lee la
   * URL al montar esta pantalla, cuando la explotación ya está disponible. */
  const seccion = new URLSearchParams(window.location.search).get('seccion');
  return (seccion && pestañasPorEnlace[seccion]) || 'herd';
}
export function AppShell({
  onLogout,
  onSurvey,
  onUserChange
}: {
  onLogout: () => void;
  onSurvey: () => void;
  onUserChange: (user: UserRecord) => void;
}) {
  const { user, farm, notice, estadoNube, sincronizarAhora } = useFarm();
  /* Qué se le dice al ganadero según el estado de la sincronización. */
  const estado = {
    inactiva: {
      Icono: HardDrive,
      texto: 'En este navegador',
      ayuda: 'Los datos solo están en este dispositivo.'
    },
    sincronizando: {
      Icono: RefreshCw,
      texto: 'Sincronizando…',
      ayuda: 'Enviando y recibiendo cambios.'
    },
    'al-dia': {
      Icono: CheckCircle2,
      texto: 'Al día',
      ayuda: 'Todo guardado en tu cuenta. Toca para sincronizar ahora.'
    },
    'sin-conexion': {
      Icono: CloudOff,
      texto: 'Sin conexión',
      ayuda: 'Se guarda aquí y se enviará cuando haya cobertura.'
    },
    error: { Icono: AlertTriangle, texto: 'Error al sincronizar', ayuda: 'Toca para reintentar.' }
  }[estadoNube];
  const [tab, setTab] = useState<Tab>(pestañaInicial),
    [settings, setSettings] = useState(false);
  /* Con una sola especie la pantalla del ganado no necesita pestañas propias:
   * la especie elegida es siempre esa. Con varias, se recuerda cuál se está
   * mirando para pasársela a CrotalList. */
  const [especieTab, setEspecieTab] = useState<Especie>(farm.especies[0]);
  useEffect(() => {
    if (!farm.especies.includes(especieTab)) setEspecieTab(farm.especies[0]);
  }, [farm.especies, especieTab]);
  const especieUnica = farm.especies.length === 1 ? farm.especies[0] : null;
  const tabs: { id: Tab; label: string; icon: typeof Leaf }[] = [
    {
      id: 'herd',
      label: especieUnica ? especieLabel(especieUnica) : 'Ganado',
      icon: ClipboardList
    },
    { id: 'production', label: 'Producción', icon: TrendingUp },
    { id: 'invoices', label: 'Facturas', icon: Receipt },
    { id: 'reports', label: 'Informes', icon: BarChart3 },
    { id: 'weather', label: 'Tiempo', icon: CloudRain }
  ];
  const nav = (mobile: boolean) =>
    tabs.map(({ id, label, icon: Icon }) => (
      <button
        key={id}
        onClick={() => setTab(id)}
        aria-current={tab === id ? 'page' : undefined}
        className={`flex min-h-12 min-w-0 items-center gap-3 rounded-xl font-semibold ${mobile ? 'flex-1 flex-col justify-center gap-1 px-1 py-2 text-xs' : 'w-full px-4 py-3 text-sm'} ${tab === id ? 'bg-brand-100 text-brand-800' : 'text-stone-600 hover:bg-stone-100'}`}
      >
        <Icon size={mobile ? 21 : 20} aria-hidden="true" />
        <span>{label}</span>
      </button>
    ));
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:p-4"
      >
        Saltar al contenido
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-stone-200 bg-white p-5 md:flex lg:w-64">
        <div className="flex items-center gap-2 text-2xl font-bold text-brand-800">
          <Leaf size={28} />
          Chaparra
        </div>
        <div className="mb-7 mt-8 border-b border-stone-200 pb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Tu explotación
          </p>
          <p className="font-bold">{farm.nombreExplotacion}</p>
          {farm.codigoRega && (
            <p className="mt-2 break-all text-xs text-stone-600">REGA {farm.codigoRega}</p>
          )}
        </div>
        <nav aria-label="Navegación principal" className="space-y-2">
          {nav(false)}
        </nav>
        <div className="mt-auto space-y-3 border-t border-stone-200 pt-5">
          <div className="py-2">
            <p className="text-sm font-semibold">{user.nombre}</p>
            <p className="mt-1 break-all text-xs text-stone-600">{user.email}</p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setSettings(true)}
          >
            <Settings size={18} />
            Ajustes y cuenta
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={onLogout}>
            <LogOut size={18} />
            Cerrar sesión
          </Button>
        </div>
      </aside>
      <div className="min-w-0 md:ml-56 lg:ml-64">
        <header className="flex min-h-20 items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 sm:px-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
              Cuaderno de campo
            </p>
            <p className="mt-1 truncate font-semibold">{farm.nombreExplotacion}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={sincronizarAhora}
              disabled={estadoNube === 'inactiva'}
              title={estado.ayuda}
              className="flex min-h-12 items-center gap-2 rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-600 disabled:cursor-default"
            >
              <estado.Icono
                size={16}
                className={estadoNube === 'sincronizando' ? 'animate-spin' : undefined}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">{estado.texto}</span>
            </button>
            <Button
              variant="ghost"
              className="md:hidden"
              aria-label="Ajustes y cuenta"
              onClick={() => setSettings(true)}
            >
              <Settings size={22} />
            </Button>
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="app-main mx-auto max-w-7xl space-y-5 p-4 sm:p-8"
        >
          {notice && <Banner tone="success">{notice}</Banner>}
          {tab === 'herd' && (
            <>
              {!especieUnica && (
                <SegmentedControl
                  label="Especie"
                  options={farm.especies.map(e => ({ value: e, label: especieLabel(e) }))}
                  value={especieTab}
                  onChange={setEspecieTab}
                />
              )}
              <CrotalList especie={especieUnica ?? especieTab} />
            </>
          )}
          {tab === 'production' && <ProductionModule onAnimals={() => setTab('herd')} />}
          {tab === 'invoices' && <InvoiceModule />}
          {tab === 'reports' && <AnalyticsDashboard />}
          {tab === 'weather' && <Tiempo />}
        </main>
      </div>
      <nav
        aria-label="Navegación móvil"
        className="bottom-nav fixed inset-x-0 bottom-0 z-20 flex gap-1 border-t border-stone-200 bg-white px-2 pt-2 md:hidden"
      >
        {nav(true)}
      </nav>
      {settings && (
        <FarmSettingsModal
          onClose={() => setSettings(false)}
          onLogout={onLogout}
          onSurvey={() => {
            setSettings(false);
            onSurvey();
          }}
          onUserChange={onUserChange}
        />
      )}
    </div>
  );
}
