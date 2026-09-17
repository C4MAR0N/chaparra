import { useState } from 'react';
import {
  BarChart3,
  ClipboardList,
  HardDrive,
  Leaf,
  LogOut,
  Receipt,
  Settings,
  TrendingUp
} from 'lucide-react';
import type { UserRecord } from '../types';
import { useFarm } from '../context/FarmContext';
import { Banner, Button } from './ui';
import { CrotalList } from './CrotalList';
import { ProductionModule } from './ProductionModule';
import { InvoiceModule } from './InvoiceModule';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { FarmSettingsModal } from './FarmSettingsModal';
import { Tiempo } from './Tiempo';
type Tab = 'herd' | 'production' | 'invoices' | 'reports';
const tabs: { id: Tab; label: string; icon: typeof Leaf }[] = [
  { id: 'herd', label: 'Rebaño', icon: ClipboardList },
  { id: 'production', label: 'Producción', icon: TrendingUp },
  { id: 'invoices', label: 'Facturas', icon: Receipt },
  { id: 'reports', label: 'Informes', icon: BarChart3 }
];
export function AppShell({
  onLogout,
  onSurvey,
  onUserChange
}: {
  onLogout: () => void;
  onSurvey: () => void;
  onUserChange: (user: UserRecord) => void;
}) {
  const { user, farm, notice } = useFarm();
  const [tab, setTab] = useState<Tab>('herd'),
    [settings, setSettings] = useState(false);
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
            <span className="hidden items-center gap-2 rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-600 sm:flex">
              <HardDrive size={16} />
              En este navegador
            </span>
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
              <CrotalList />
              {/* El tiempo, debajo de la pantalla principal: en el campo la lluvia manda. */}
              <Tiempo />
            </>
          )}
          {tab === 'production' && <ProductionModule onAnimals={() => setTab('herd')} />}
          {tab === 'invoices' && <InvoiceModule />}
          {tab === 'reports' && <AnalyticsDashboard />}
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
