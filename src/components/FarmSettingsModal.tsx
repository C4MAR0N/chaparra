import React, { useState } from 'react';
import { X, Settings, Save, Building2 } from 'lucide-react';
import { FarmConfig, PropositoGanado, TipoGanado } from '../types';

interface FarmSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: FarmConfig;
  onSave: (config: FarmConfig) => void;
}

export const FarmSettingsModal: React.FC<FarmSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave
}) => {
  const [nombreExplotacion, setNombreExplotacion] = useState(config.nombreExplotacion);
  const [codigoRega, setCodigoRega] = useState(config.codigoRega);
  const [titular, setTitular] = useState(config.titular);
  const [tipoGanadoPrincipal, setTipoGanadoPrincipal] = useState<TipoGanado>(config.tipoGanadoPrincipal);
  const [propositoPrincipal, setPropositoPrincipal] = useState<PropositoGanado>(config.propositoPrincipal);
  const [vecesOrdenoDia, setVecesOrdenoDia] = useState(config.vecesOrdenoDia);
  const [precioPorLitroLecheEuro, setPrecioPorLitroLecheEuro] = useState(config.precioPorLitroLecheEuro);
  const [precioEstimadoKgCarneEuro, setPrecioEstimadoKgCarneEuro] = useState(config.precioEstimadoKgCarneEuro);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      nombreExplotacion: nombreExplotacion.trim() || 'Explotación Ganadera',
      codigoRega: codigoRega.trim().toUpperCase() || 'ES000000000000',
      titular: titular.trim() || 'Ganadero',
      tipoGanadoPrincipal,
      propositoPrincipal,
      vecesOrdenoDia: Number(vecesOrdenoDia),
      precioPorLitroLecheEuro: Number(precioPorLitroLecheEuro),
      precioEstimadoKgCarneEuro: Number(precioEstimadoKgCarneEuro),
      moneda: '€'
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Settings size={20} className="text-emerald-700" />
            Configuración de la Explotación Ganadera
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Nombre de la Ganadería / Finca</label>
            <input
              type="text"
              value={nombreExplotacion}
              onChange={(e) => setNombreExplotacion(e.target.value)}
              className="input-farm font-bold text-emerald-950"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Código REGA Oficial</label>
              <input
                type="text"
                value={codigoRega}
                onChange={(e) => setCodigoRega(e.target.value.toUpperCase())}
                placeholder="ej. ES100480009123"
                className="input-farm font-mono uppercase font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Nombre del Titular</label>
              <input
                type="text"
                value={titular}
                onChange={(e) => setTitular(e.target.value)}
                className="input-farm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Especie Principal</label>
              <select
                value={tipoGanadoPrincipal}
                onChange={(e) => setTipoGanadoPrincipal(e.target.value as TipoGanado)}
                className="input-farm font-medium"
              >
                <option value="Vacuno">Vacuno / Bovino</option>
                <option value="Ovino">Ovino / Ovejas</option>
                <option value="Caprino">Caprino / Cabras</option>
                <option value="Porcino">Porcino / Cerdos</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Aprovechamiento</label>
              <select
                value={propositoPrincipal}
                onChange={(e) => setPropositoPrincipal(e.target.value as PropositoGanado)}
                className="input-farm font-bold text-emerald-900"
              >
                <option value="Mixto">Mixto (Carne y Ordeño)</option>
                <option value="Ordeño">Ordeño / Leche</option>
                <option value="Carne">Carne</option>
              </select>
            </div>
          </div>

          <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100 space-y-3">
            <h3 className="font-bold text-emerald-950 text-xs">Ajustes Productivos y Precios (€)</h3>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-semibold text-blue-900 mb-1">Ordeños / Día</label>
                <select
                  value={vecesOrdenoDia}
                  onChange={(e) => setVecesOrdenoDia(Number(e.target.value))}
                  className="input-farm bg-white font-bold"
                >
                  <option value={1}>1 vez / día</option>
                  <option value={2}>2 veces / día</option>
                  <option value={3}>3 veces / día</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-blue-900 mb-1">Precio Leche (€/L)</label>
                <input
                  type="number"
                  step="0.01"
                  value={precioPorLitroLecheEuro}
                  onChange={(e) => setPrecioPorLitroLecheEuro(Number(e.target.value))}
                  className="input-farm bg-white font-bold text-emerald-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-amber-900 mb-1">Precio Carne (€/kg)</label>
                <input
                  type="number"
                  step="0.10"
                  value={precioEstimadoKgCarneEuro}
                  onChange={(e) => setPrecioEstimadoKgCarneEuro(Number(e.target.value))}
                  className="input-farm bg-white font-bold text-emerald-900"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-farm-secondary text-xs">
              Cancelar
            </button>
            <button type="submit" className="btn-farm-primary text-xs">
              <Save size={16} /> Guardar Ajustes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
