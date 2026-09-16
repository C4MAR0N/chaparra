import React from 'react';
import { ShieldCheck, Settings, Award } from 'lucide-react';
import { FarmConfig } from '../types';

interface HeaderProps {
  farmConfig: FarmConfig;
  onOpenSettings: () => void;
  onOpenSecurity: () => void;
}

export const Header: React.FC<HeaderProps> = ({ farmConfig, onOpenSettings, onOpenSecurity }) => {
  return (
    <header className="bg-farm-header text-white px-4 py-4 shadow-lg sticky top-0 z-40">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md border border-white/20">
            <span className="text-2xl" role="img" aria-label="cattle">🐄</span>
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight leading-none flex items-center gap-2">
              {farmConfig.nombreExplotacion}
              <span className="text-xs font-semibold bg-emerald-400/30 text-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300/30">
                REGA: {farmConfig.codigoRega}
              </span>
            </h1>
            <p className="text-xs text-emerald-100/80 font-medium mt-1">
              Explotación: {farmConfig.propositoPrincipal} ({farmConfig.tipoGanadoPrincipal}) • {farmConfig.titular}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSecurity}
            className="flex items-center gap-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-100 text-xs font-semibold px-3 py-2 rounded-xl border border-emerald-400/30 transition-all"
            title="Seguridad y Cumplimiento App Store / Play Store"
          >
            <ShieldCheck size={16} className="text-emerald-300" />
            <span className="hidden sm:inline">Seguridad & App Store</span>
          </button>
          
          <button
            onClick={onOpenSettings}
            className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl border border-white/20 transition-all text-white"
            title="Ajustes de Explotación"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
