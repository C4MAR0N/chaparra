import React, { useState, useMemo } from 'react';
import { Search, Filter, Plus, Eye, LayoutGrid, Table, Activity, MapPin, Calendar, Baby, Euro } from 'lucide-react';
import { Animal, EstadoSanitario, PropositoGanado, TipoGanado } from '../types';

interface CrotalListProps {
  animals: Animal[];
  onSelectAnimal: (animal: Animal) => void;
  onAddAnimal: () => void;
}

export const CrotalList: React.FC<CrotalListProps> = ({ animals, onSelectAnimal, onAddAnimal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUbicacion, setSelectedUbicacion] = useState<string>('TODAS');
  const [selectedEstado, setSelectedEstado] = useState<string>('TODOS');
  const [selectedProposito, setSelectedProposito] = useState<string>('TODOS');
  const [selectedTipo, setSelectedTipo] = useState<string>('TODOS');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Extract unique locations
  const ubicaciones = useMemo(() => {
    const locs = Array.from(new Set(animals.map(a => a.ubicacion))).filter(Boolean);
    return ['TODAS', ...locs];
  }, [animals]);

  // Filtered animals logic
  const filteredAnimals = useMemo(() => {
    return animals.filter(animal => {
      const matchesSearch = 
        animal.crotal.toLowerCase().includes(searchTerm.toLowerCase()) ||
        animal.raza.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (animal.notasSanitarias && animal.notasSanitarias.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesUbicacion = selectedUbicacion === 'TODAS' || animal.ubicacion === selectedUbicacion;
      const matchesEstado = selectedEstado === 'TODOS' || animal.estadoSanitario === selectedEstado;
      const matchesProposito = selectedProposito === 'TODOS' || animal.proposito === selectedProposito;
      const matchesTipo = selectedTipo === 'TODOS' || animal.tipoGanado === selectedTipo;

      return matchesSearch && matchesUbicacion && matchesEstado && matchesProposito && matchesTipo;
    });
  }, [animals, searchTerm, selectedUbicacion, selectedEstado, selectedProposito, selectedTipo]);

  const calculateAge = (birthDateStr: string) => {
    const birth = new Date(birthDateStr);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    if (years === 0) return `${months} meses`;
    return `${years} año${years > 1 ? 's' : ''}${months > 0 ? ` y ${months}m` : ''}`;
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

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-farm p-3.5 bg-gradient-to-br from-emerald-50 to-emerald-100/40 border-emerald-200">
          <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Cabaña Total</p>
          <p className="text-2xl font-extrabold text-emerald-950 mt-1">{filteredAnimals.length} <span className="text-sm font-medium text-emerald-700">reses</span></p>
        </div>

        <div className="card-farm p-3.5 bg-gradient-to-br from-blue-50 to-blue-100/40 border-blue-200">
          <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Lote de Ordeño</p>
          <p className="text-2xl font-extrabold text-blue-950 mt-1">
            {filteredAnimals.filter(a => a.proposito === 'Ordeño' || a.proposito === 'Mixto').length}
            <span className="text-sm font-medium text-blue-700"> cabezas</span>
          </p>
        </div>

        <div className="card-farm p-3.5 bg-gradient-to-br from-amber-50 to-amber-100/40 border-amber-200">
          <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">En Tratamiento</p>
          <p className="text-2xl font-extrabold text-amber-950 mt-1">
            {filteredAnimals.filter(a => a.estadoSanitario === 'En tratamiento' || a.estadoSanitario === 'En cuarentena').length}
            <span className="text-sm font-medium text-amber-700"> en atención</span>
          </p>
        </div>

        <div className="card-farm p-3.5 bg-gradient-to-br from-green-50 to-emerald-100/60 border-green-200">
          <p className="text-xs font-bold text-green-800 uppercase tracking-wider">Valor Estimado (€)</p>
          <p className="text-2xl font-extrabold text-green-950 mt-1">
            {filteredAnimals.reduce((acc, a) => acc + (a.precioEstimadoVentaEuro || 1500), 0).toLocaleString('es-ES')} €
          </p>
        </div>
      </div>

      {/* Control & Search Bar */}
      <div className="card-farm p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Crotal Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por Crotal (ej. ES09100...), raza o notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-farm pl-10 pr-4"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 p-1 rounded-xl flex items-center border border-gray-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg font-medium text-xs flex items-center gap-1 transition-all ${
                  viewMode === 'grid' ? 'bg-white shadow-sm text-emerald-800 font-bold' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <LayoutGrid size={16} />
                <span className="hidden sm:inline">Tarjetas</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg font-medium text-xs flex items-center gap-1 transition-all ${
                  viewMode === 'table' ? 'bg-white shadow-sm text-emerald-800 font-bold' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Table size={16} />
                <span className="hidden sm:inline">Tabla</span>
              </button>
            </div>

            <button
              onClick={onAddAnimal}
              className="btn-farm-primary whitespace-nowrap text-sm"
            >
              <Plus size={18} />
              <span>Añadir Res</span>
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Ubicación / Pastizal</label>
            <select
              value={selectedUbicacion}
              onChange={(e) => setSelectedUbicacion(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2 px-2.5 focus:outline-none focus:border-emerald-600 font-medium"
            >
              {ubicaciones.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Estado Sanitario</label>
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2 px-2.5 focus:outline-none focus:border-emerald-600 font-medium"
            >
              <option value="TODOS">TODOS</option>
              <option value="Sano">Sano</option>
              <option value="En tratamiento">En tratamiento</option>
              <option value="En cuarentena">En cuarentena</option>
              <option value="Vacunado">Vacunado</option>
              <option value="Observación">Observación</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Aprovechamiento</label>
            <select
              value={selectedProposito}
              onChange={(e) => setSelectedProposito(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2 px-2.5 focus:outline-none focus:border-emerald-600 font-medium"
            >
              <option value="TODOS">TODOS</option>
              <option value="Carne">Carne</option>
              <option value="Ordeño">Ordeño</option>
              <option value="Mixto">Mixto</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de Ganado</label>
            <select
              value={selectedTipo}
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2 px-2.5 focus:outline-none focus:border-emerald-600 font-medium"
            >
              <option value="TODOS">TODOS</option>
              <option value="Vacuno">Vacuno</option>
              <option value="Ovino">Ovino</option>
              <option value="Caprino">Caprino</option>
              <option value="Porcino">Porcino</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredAnimals.length === 0 && (
        <div className="card-farm p-8 text-center space-y-3">
          <div className="bg-emerald-50 text-emerald-700 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
            <Search size={24} />
          </div>
          <h3 className="font-bold text-gray-800 text-lg">No se encontraron reses</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Prueba a cambiar el texto del crotal o ajustar los filtros de ubicación y estado sanitario.
          </p>
          <button onClick={() => { setSearchTerm(''); setSelectedUbicacion('TODAS'); setSelectedEstado('TODOS'); setSelectedProposito('TODOS'); }} className="btn-farm-secondary text-xs">
            Restablecer Filtros
          </button>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && filteredAnimals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAnimals.map(animal => (
            <div
              key={animal.id}
              onClick={() => onSelectAnimal(animal)}
              className="card-farm p-4 cursor-pointer hover:border-emerald-400 transition-all flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Header Crotal & Status */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="bg-emerald-900 text-white font-extrabold px-3 py-1 rounded-xl text-sm tracking-wider font-mono shadow-sm flex items-center gap-1.5">
                    <span className="text-xs text-emerald-300 font-sans">🏷️</span>
                    {animal.crotal}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(animal.estadoSanitario)}`}>
                    {animal.estadoSanitario}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span className="font-medium text-gray-800 flex items-center gap-1">
                      <MapPin size={13} className="text-emerald-700" />
                      {animal.ubicacion}
                    </span>
                    <span className="bg-gray-100 text-gray-700 font-semibold px-2 py-0.5 rounded">
                      {animal.raza}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs border-t border-gray-100 text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar size={13} className="text-gray-400" />
                      <span>Edad: <strong>{calculateAge(animal.fechaNacimiento)}</strong></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Baby size={13} className="text-gray-400" />
                      <span>Partos: <strong>{animal.numeroPartos}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Offspring preview if any */}
                {animal.criasAsociadas.length > 0 && (
                  <div className="mt-3 bg-emerald-50/70 p-2 rounded-lg border border-emerald-100 flex items-center justify-between text-xs">
                    <span className="text-emerald-800 font-semibold flex items-center gap-1">
                      <Baby size={13} /> Crías vinculadas:
                    </span>
                    <span className="font-mono text-emerald-950 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
                      {animal.criasAsociadas.length} {animal.criasAsociadas.length === 1 ? 'cría' : 'crías'}
                    </span>
                  </div>
                )}

                {/* Milk / Meat Stats badge */}
                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs font-semibold">
                  {animal.proposito === 'Ordeño' || animal.proposito === 'Mixto' ? (
                    <span className="text-blue-700 flex items-center gap-1">
                      🥛 Ordeño: <strong>{animal.produccionDiariaLitros || 0} L/día</strong>
                    </span>
                  ) : (
                    <span className="text-amber-800 flex items-center gap-1">
                      🥩 Peso: <strong>{animal.pesoKg || 0} kg</strong>
                    </span>
                  )}

                  <span className="text-emerald-800 font-bold flex items-center gap-0.5">
                    <Euro size={12} />
                    {(animal.precioEstimadoVentaEuro || 1500).toLocaleString('es-ES')} €
                  </span>
                </div>
              </div>

              {/* View button hover effect */}
              <div className="mt-3 pt-2 flex items-center justify-end text-xs font-bold text-emerald-700 group-hover:underline gap-1">
                <Eye size={14} /> Ver Ficha Completa
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && filteredAnimals.length > 0 && (
        <div className="card-farm overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-emerald-900 text-white font-semibold">
                <th className="p-3">Crotal</th>
                <th className="p-3">Raza / Tipo</th>
                <th className="p-3">Ubicación</th>
                <th className="p-3">Partos</th>
                <th className="p-3">Crías</th>
                <th className="p-3">Sanidad</th>
                <th className="p-3">Prod. / Peso</th>
                <th className="p-3 text-right">Valor (€)</th>
                <th className="p-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredAnimals.map(animal => (
                <tr key={animal.id} className="hover:bg-emerald-50/50 transition-colors">
                  <td className="p-3 font-mono font-bold text-emerald-950">{animal.crotal}</td>
                  <td className="p-3">{animal.raza} ({animal.sexo[0]})</td>
                  <td className="p-3">{animal.ubicacion}</td>
                  <td className="p-3 text-center font-bold">{animal.numeroPartos}</td>
                  <td className="p-3 font-mono text-emerald-800">{animal.criasAsociadas.length}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(animal.estadoSanitario)}`}>
                      {animal.estadoSanitario}
                    </span>
                  </td>
                  <td className="p-3">
                    {animal.proposito === 'Ordeño' ? `${animal.produccionDiariaLitros || 0} L/día` : `${animal.pesoKg || 0} kg`}
                  </td>
                  <td className="p-3 text-right font-bold text-emerald-900">
                    {(animal.precioEstimadoVentaEuro || 0).toLocaleString('es-ES')} €
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onSelectAnimal(animal)}
                      className="p-1.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-lg transition-all"
                      title="Ver Detalle"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
