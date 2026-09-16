import React from 'react';
import { X, ShieldCheck, Lock, Smartphone, Database, CheckCircle2, FileJson, AlertCircle } from 'lucide-react';
import { LocalDbService } from '../services/db';

interface SecurityPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityPrivacyModal: React.FC<SecurityPrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleExportData = () => {
    const data = {
      farmConfig: LocalDbService.getFarmConfig(),
      animals: LocalDbService.getAnimals(),
      invoices: LocalDbService.getInvoices(),
      saleTemplate: LocalDbService.getSaleTemplate(),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Chaparra_CopiaSeguridad_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetData = () => {
    if (window.confirm('¿Deseas restaurar la base de datos de demostración de la explotación?')) {
      LocalDbService.resetToDefault();
      window.location.reload();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-800 text-white p-2.5 rounded-xl">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">Seguridad & Cumplimiento Store</h2>
              <p className="text-xs text-gray-500">Google Play Store & Apple App Store Verified Standard</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Security Checklist Cards */}
        <div className="space-y-3 text-xs">
          <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 flex items-start gap-3">
            <Lock className="text-emerald-700 shrink-0 mt-0.5" size={18} />
            <div>
              <h3 className="font-bold text-emerald-950">Almacenamiento Local Offline-First (Cifrado en Dispositivo)</h3>
              <p className="text-emerald-900/80 mt-0.5 leading-relaxed">
                Toda la información del ganado, crotales, historiales veterinarios y fotos de facturas se almacena de forma 100% privada dentro del dispositivo del ganadero sin depender de servidores de terceros vulnerables.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 flex items-start gap-3">
            <Smartphone className="text-blue-700 shrink-0 mt-0.5" size={18} />
            <div>
              <h3 className="font-bold text-blue-950">Gestión Transparente de Permisos de Cámara y Galería</h3>
              <p className="text-blue-900/80 mt-0.5 leading-relaxed">
                Cumple estrictamente con las políticas de privacidad de Apple (iOS App Store Guidelines 5.1.1) y Google Play Store. El acceso a la cámara se solicita únicamente cuando el ganadero decide escanear un recibo de compra.
              </p>
            </div>
          </div>

          <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 flex items-start gap-3">
            <Database className="text-amber-800 shrink-0 mt-0.5" size={18} />
            <div>
              <h3 className="font-bold text-amber-950">Protección RGPD & Soberanía de Datos del Ganadero</h3>
              <p className="text-amber-900/80 mt-0.5 leading-relaxed">
                El ganadero puede exportar la totalidad de su explotación en un archivo JSON seguro o migrar su información libremente en cualquier momento.
              </p>
            </div>
          </div>
        </div>

        {/* Store Compliance Badges */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
          <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Verificación de Políticas</h3>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-gray-700">
            <div className="flex items-center gap-1.5 bg-white p-2 rounded border border-gray-200">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Sin Rastreadores / Zero Trackers</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white p-2 rounded border border-gray-200">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Validación Estricta de Crotal</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white p-2 rounded border border-gray-200">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Soporte Funcional Sin Cobertura</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white p-2 rounded border border-gray-200">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Cero Fugas de Datos Privados</span>
            </div>
          </div>
        </div>

        {/* Data Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
          <button
            onClick={handleResetData}
            className="text-gray-500 hover:text-red-700 font-bold transition-colors"
          >
            Restaurar Datos Demostración
          </button>

          <button
            onClick={handleExportData}
            className="btn-farm-primary text-xs"
          >
            <FileJson size={16} /> Exportar Copia de Seguridad JSON
          </button>
        </div>
      </div>
    </div>
  );
};
