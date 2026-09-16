import React from 'react';
import { ClipboardList, Milk, Camera, BarChart3 } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'ganado' | 'produccion' | 'facturas' | 'analytics';
  onChangeTab: (tab: 'ganado' | 'produccion' | 'facturas' | 'analytics') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  return (
    <nav className="bottom-nav">
      <button
        onClick={() => onChangeTab('ganado')}
        className={`nav-item ${activeTab === 'ganado' ? 'active' : ''}`}
      >
        <span className="text-lg">🐄</span>
        <span>Crotales</span>
      </button>

      <button
        onClick={() => onChangeTab('produccion')}
        className={`nav-item ${activeTab === 'produccion' ? 'active' : ''}`}
      >
        <Milk size={20} />
        <span>Ordeño & Carne</span>
      </button>

      <button
        onClick={() => onChangeTab('facturas')}
        className={`nav-item ${activeTab === 'facturas' ? 'active' : ''}`}
      >
        <Camera size={20} />
        <span>Facturas</span>
      </button>

      <button
        onClick={() => onChangeTab('analytics')}
        className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
      >
        <BarChart3 size={20} />
        <span>Estadísticas</span>
      </button>
    </nav>
  );
};
