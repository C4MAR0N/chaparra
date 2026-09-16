import React from 'react';
import { X, Calendar, MapPin, Baby, Activity, Euro, Edit, Trash2, Tag, FileText, CheckCircle2, AlertTriangle, Scale } from 'lucide-react';
import { Animal, EstadoSanitario } from '../types';

interface AnimalDetailModalProps {
  animal: Animal | null;
  onClose: () => void;
  onEdit: (animal: Animal) => void;
  onDelete: (id: string) => void;
  allAnimals: Animal[];
}

export const AnimalDetailModal: React.FC<AnimalDetailModalProps> = ({
  animal,
  onClose,
  onEdit,
  onDelete,
  allAnimals
}) => {
  if (!animal) return null;

  const calculateAge = (birthDateStr: string) => {
    const birth = new Date(birthDateStr);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    return `${years} años y ${months} meses`;
  };

  const getStatusBadge = (estado: EstadoSanitario) => {
    switch (estado) {
      case 'Sano':
        return 'badge-sano';
      case 'En tratamiento':
        return 'badge-tratamiento';
      case 'En cuarentena':
        return 'badge-cuarentena';
      case 'Vacunado':
        return 'badge-vacunado';
      case 'Observación':
        return 'badge-observacion';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const estimatedValue = animal.precioEstimadoVentaEuro || 1600;
  const accumulatedCost = animal.costeAcumuladoEuro || 650;
  const netMargin = estimatedValue - accumulatedCost;

  return (
    <div className="modal-overlay">
      <div className="modal-container p-6 space-y-6">
        {/* Header Modal */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-800 text-emerald-100 p-3 rounded-2xl font-mono text-xl font-black shadow-inner">
              🏷️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-gray-900 font-mono tracking-tight">{animal.crotal}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(animal.estadoSanitario)}`}>
                  {animal.estadoSanitario}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {animal.raza} • {animal.sexo} • {animal.tipoGanado} ({animal.proposito})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Visual Crotal Ear Tag Badge */}
        <div className="bg-amber-100 border-2 border-amber-300 rounded-2xl p-4 flex items-center justify-between text-amber-950 shadow-sm">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">Crotal Oficial España / UE</span>
            <p className="text-xl font-black font-mono tracking-wider">{animal.crotal}</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-amber-900 block">Explotación</span>
            <span className="text-xs font-bold text-amber-800">REG. OFICIAL ACREDITADO</span>
          </div>
        </div>

        {/* Main Grid Info */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200/80">
            <span className="text-xs text-gray-500 font-semibold flex items-center gap-1">
              <Calendar size={13} className="text-emerald-700" /> Nacimiento
            </span>
            <p className="font-bold text-gray-900 text-sm mt-1">{animal.fechaNacimiento}</p>
            <p className="text-[11px] text-gray-500">{calculateAge(animal.fechaNacimiento)}</p>
          </div>

          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200/80">
            <span className="text-xs text-gray-500 font-semibold flex items-center gap-1">
              <Baby size={13} className="text-emerald-700" /> Partos Registrados
            </span>
            <p className="font-bold text-gray-900 text-sm mt-1">{animal.numeroPartos} partos</p>
            <p className="text-[11px] text-gray-500">{animal.criasAsociadas.length} crías asociadas</p>
          </div>

          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200/80 col-span-2 sm:col-span-1">
            <span className="text-xs text-gray-500 font-semibold flex items-center gap-1">
              <MapPin size={13} className="text-emerald-700" /> Ubicación Actual
            </span>
            <p className="font-bold text-emerald-900 text-sm mt-1">{animal.ubicacion}</p>
            <p className="text-[11px] text-gray-500">Último cambio trazado</p>
          </div>
        </div>

        {/* Offspring Lineage (Crías Asociadas) */}
        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-2">
          <h3 className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
            <Baby size={16} className="text-emerald-700" />
            Crías Asociadas y Genealogía ({animal.criasAsociadas.length})
          </h3>
          {animal.criasAsociadas.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {animal.criasAsociadas.map((crotalCria) => {
                const matchedCria = allAnimals.find(a => a.crotal === crotalCria);
                return (
                  <div
                    key={crotalCria}
                    className="bg-white px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-mono font-bold text-emerald-900 flex items-center gap-2 shadow-xs"
                  >
                    <span>🍼 {crotalCria}</span>
                    {matchedCria && (
                      <span className="font-sans text-[10px] text-gray-500 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {matchedCria.raza}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">No hay crotales de crías asociadas a esta res aún.</p>
          )}
        </div>

        {/* Production & Profitability in EUROS (€) */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
            <Euro size={16} className="text-emerald-700" />
            Balance Económico & Rentabilidad de la Res
          </h3>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
              <span className="text-gray-600 font-semibold block">Valor Venta (€)</span>
              <span className="text-emerald-900 font-extrabold text-sm mt-0.5 block">{estimatedValue.toLocaleString('es-ES')} €</span>
            </div>

            <div className="bg-red-50 p-2.5 rounded-lg border border-red-100">
              <span className="text-gray-600 font-semibold block">Coste Acumulado (€)</span>
              <span className="text-red-900 font-extrabold text-sm mt-0.5 block">{accumulatedCost.toLocaleString('es-ES')} €</span>
            </div>

            <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-100">
              <span className="text-gray-600 font-semibold block">Margen Neto (€)</span>
              <span className="text-blue-900 font-extrabold text-sm mt-0.5 block">+{netMargin.toLocaleString('es-ES')} €</span>
            </div>
          </div>
        </div>

        {/* Health & Clinical Notes */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
          <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Activity size={15} className="text-emerald-700" /> Historial de Registro Sanitario
          </h3>
          <p className="text-xs text-gray-700 leading-relaxed bg-white p-3 rounded-lg border border-gray-200">
            {animal.notasSanitarias || 'Sin observaciones veterinarias registradas. Estado de salud conforme.'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <button
            onClick={() => {
              if (window.confirm(`¿Estás seguro de eliminar el registro de la res ${animal.crotal}?`)) {
                onDelete(animal.id);
                onClose();
              }
            }}
            className="text-red-600 hover:text-red-800 text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 size={16} /> Eliminar Res
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onEdit(animal);
                onClose();
              }}
              className="btn-farm-secondary text-xs"
            >
              <Edit size={16} /> Editar Datos
            </button>
            <button
              onClick={onClose}
              className="btn-farm-primary text-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
