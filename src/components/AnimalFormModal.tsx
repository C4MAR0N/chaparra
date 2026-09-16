import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { Animal, EstadoSanitario, PropositoGanado, SexoAnimal, TipoGanado } from '../types';

interface AnimalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (animal: Omit<Animal, 'id'> | Animal) => void;
  initialAnimal?: Animal | null;
  existingAnimals: Animal[];
}

export const AnimalFormModal: React.FC<AnimalFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialAnimal,
  existingAnimals
}) => {
  const [crotal, setCrotal] = useState('');
  const [tipoGanado, setTipoGanado] = useState<TipoGanado>('Vacuno');
  const [proposito, setProposito] = useState<PropositoGanado>('Mixto');
  const [ubicacion, setUbicacion] = useState('Cercado Dehesa Sur');
  const [numeroPartos, setNumeroPartos] = useState<number>(0);
  const [fechaNacimiento, setFechaNacimiento] = useState('2022-01-01');
  const [criasAsociadas, setCriasAsociadas] = useState<string[]>([]);
  const [nuevaCriaCrotal, setNuevaCriaCrotal] = useState('');
  const [estadoSanitario, setEstadoSanitario] = useState<EstadoSanitario>('Sano');
  const [notasSanitarias, setNotasSanitarias] = useState('');
  const [raza, setRaza] = useState('Retinta');
  const [sexo, setSexo] = useState<SexoAnimal>('Hembra');
  const [produccionDiariaLitros, setProduccionDiariaLitros] = useState<number>(25);
  const [pesoKg, setPesoKg] = useState<number>(550);
  const [precioEstimadoVentaEuro, setPrecioEstimadoVentaEuro] = useState<number>(1650);

  useEffect(() => {
    if (initialAnimal) {
      setCrotal(initialAnimal.crotal);
      setTipoGanado(initialAnimal.tipoGanado);
      setProposito(initialAnimal.proposito);
      setUbicacion(initialAnimal.ubicacion);
      setNumeroPartos(initialAnimal.numeroPartos);
      setFechaNacimiento(initialAnimal.fechaNacimiento);
      setCriasAsociadas(initialAnimal.criasAsociadas || []);
      setEstadoSanitario(initialAnimal.estadoSanitario);
      setNotasSanitarias(initialAnimal.notasSanitarias || '');
      setRaza(initialAnimal.raza);
      setSexo(initialAnimal.sexo);
      setProduccionDiariaLitros(initialAnimal.produccionDiariaLitros || 25);
      setPesoKg(initialAnimal.pesoKg || 550);
      setPrecioEstimadoVentaEuro(initialAnimal.precioEstimadoVentaEuro || 1650);
    } else {
      // Auto-generate Crotal suggestion
      generateRandomCrotal();
    }
  }, [initialAnimal, isOpen]);

  const generateRandomCrotal = () => {
    const randomDigits = Math.floor(1000000000 + Math.random() * 9000000000);
    setCrotal(`ES09${randomDigits}`);
  };

  const handleAddCria = () => {
    if (nuevaCriaCrotal.trim() && !criasAsociadas.includes(nuevaCriaCrotal.trim())) {
      setCriasAsociadas([...criasAsociadas, nuevaCriaCrotal.trim().toUpperCase()]);
      setNuevaCriaCrotal('');
    }
  };

  const handleRemoveCria = (crotalToRemove: string) => {
    setCriasAsociadas(criasAsociadas.filter(c => c !== crotalToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!crotal.trim()) {
      alert('El código de Crotal es obligatorio.');
      return;
    }

    const payload = {
      crotal: crotal.trim().toUpperCase(),
      tipoGanado,
      proposito,
      ubicacion,
      numeroPartos: Number(numeroPartos),
      fechaNacimiento,
      criasAsociadas,
      estadoSanitario,
      notasSanitarias,
      raza,
      sexo,
      produccionDiariaLitros: proposito === 'Ordeño' || proposito === 'Mixto' ? Number(produccionDiariaLitros) : undefined,
      pesoKg: proposito === 'Carne' || proposito === 'Mixto' ? Number(pesoKg) : undefined,
      precioEstimadoVentaEuro: Number(precioEstimadoVentaEuro),
      costeAcumuladoEuro: initialAnimal?.costeAcumuladoEuro || 600,
      fechaUltimoControl: new Date().toISOString().split('T')[0]
    };

    if (initialAnimal) {
      onSave({ ...payload, id: initialAnimal.id });
    } else {
      onSave(payload);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container p-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>🐄</span>
            {initialAnimal ? 'Editar Ficha de Res' : 'Alta de Nueva Res (Crotal)'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Crotal input with Generator */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Número de Crotal (Oficial)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={crotal}
                onChange={(e) => setCrotal(e.target.value.toUpperCase())}
                placeholder="ej. ES091004581299"
                className="input-farm font-mono font-bold uppercase tracking-wider"
                required
              />
              <button
                type="button"
                onClick={generateRandomCrotal}
                className="btn-farm-secondary whitespace-nowrap text-xs"
                title="Generar Crotal de Ejemplo"
              >
                <RefreshCw size={14} /> Auto
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Especie / Tipo</label>
              <select
                value={tipoGanado}
                onChange={(e) => setTipoGanado(e.target.value as TipoGanado)}
                className="input-farm"
              >
                <option value="Vacuno">Vacuno / Bovino</option>
                <option value="Ovino">Ovino / Oveja</option>
                <option value="Caprino">Caprino / Cabra</option>
                <option value="Porcino">Porcino / Cerdo</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Aprovechamiento</label>
              <select
                value={proposito}
                onChange={(e) => setProposito(e.target.value as PropositoGanado)}
                className="input-farm font-bold text-emerald-800"
              >
                <option value="Mixto">Mixto (Carne & Ordeño)</option>
                <option value="Carne">Carne</option>
                <option value="Ordeño">Ordeño / Leche</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Raza</label>
              <input
                type="text"
                value={raza}
                onChange={(e) => setRaza(e.target.value)}
                placeholder="ej. Retinta, Frisona, Limusina"
                className="input-farm"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Sexo</label>
              <select
                value={sexo}
                onChange={(e) => setSexo(e.target.value as SexoAnimal)}
                className="input-farm"
              >
                <option value="Hembra">Hembra</option>
                <option value="Macho">Macho</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Ubicación / Pastizal</label>
              <input
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="ej. Cercado Las Encinas"
                className="input-farm"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Fecha de Nacimiento</label>
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="input-farm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Número de Partos</label>
              <input
                type="number"
                min="0"
                value={numeroPartos}
                onChange={(e) => setNumeroPartos(Number(e.target.value))}
                className="input-farm font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Estado Sanitario</label>
              <select
                value={estadoSanitario}
                onChange={(e) => setEstadoSanitario(e.target.value as EstadoSanitario)}
                className="input-farm font-bold text-emerald-900"
              >
                <option value="Sano">Sano</option>
                <option value="En tratamiento">En tratamiento</option>
                <option value="En cuarentena">En cuarentena</option>
                <option value="Vacunado">Vacunado</option>
                <option value="Observación">Observación</option>
              </select>
            </div>
          </div>

          {/* Offspring Lineage Adder */}
          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 space-y-2">
            <label className="block font-bold text-emerald-900">Asociar Crotal de Crías Nativas</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nuevaCriaCrotal}
                onChange={(e) => setNuevaCriaCrotal(e.target.value.toUpperCase())}
                placeholder="Crotal de la cría..."
                className="input-farm bg-white font-mono uppercase"
              />
              <button
                type="button"
                onClick={handleAddCria}
                className="btn-farm-secondary text-xs"
              >
                <Plus size={14} /> Vincular
              </button>
            </div>

            {criasAsociadas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {criasAsociadas.map(cria => (
                  <span key={cria} className="bg-white border border-emerald-200 px-2 py-1 rounded font-mono font-bold text-emerald-900 flex items-center gap-1">
                    🍼 {cria}
                    <button type="button" onClick={() => handleRemoveCria(cria)} className="text-red-500 hover:text-red-700 ml-1">
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Specific metrics by purpose */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 grid grid-cols-2 gap-3">
            {(proposito === 'Ordeño' || proposito === 'Mixto') && (
              <div>
                <label className="block font-semibold text-blue-900 mb-1">Litros Ordeño / Día</label>
                <input
                  type="number"
                  step="0.5"
                  value={produccionDiariaLitros}
                  onChange={(e) => setProduccionDiariaLitros(Number(e.target.value))}
                  className="input-farm font-bold text-blue-800"
                />
              </div>
            )}

            {(proposito === 'Carne' || proposito === 'Mixto') && (
              <div>
                <label className="block font-semibold text-amber-900 mb-1">Peso Aproximado (kg)</label>
                <input
                  type="number"
                  value={pesoKg}
                  onChange={(e) => setPesoKg(Number(e.target.value))}
                  className="input-farm font-bold text-amber-800"
                />
              </div>
            )}

            <div className="col-span-2">
              <label className="block font-semibold text-emerald-900 mb-1">Precio Estimado de Venta (€)</label>
              <input
                type="number"
                value={precioEstimadoVentaEuro}
                onChange={(e) => setPrecioEstimadoVentaEuro(Number(e.target.value))}
                className="input-farm font-extrabold text-emerald-900 text-base"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Observaciones Sanitarias / Tratamientos</label>
            <textarea
              value={notasSanitarias}
              onChange={(e) => setNotasSanitarias(e.target.value)}
              rows={2}
              placeholder="Vacunaciones, desparasitaciones o alertas médicas..."
              className="input-farm"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-farm-secondary text-xs">
              Cancelar
            </button>
            <button type="submit" className="btn-farm-primary text-xs">
              <Save size={16} />
              <span>{initialAnimal ? 'Guardar Cambios' : 'Registrar Res'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
