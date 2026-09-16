import React, { useState } from 'react';
import { Milk, Scale, Euro, TrendingUp, AlertCircle, RefreshCw, CheckCircle, Calculator, PieChart } from 'lucide-react';
import { Animal, FarmConfig } from '../types';

interface ProductionModuleProps {
  farmConfig: FarmConfig;
  animals: Animal[];
  onUpdateFarmConfig: (config: FarmConfig) => void;
  onUpdateAnimal: (animal: Animal) => void;
}

export const ProductionModule: React.FC<ProductionModuleProps> = ({
  farmConfig,
  animals,
  onUpdateFarmConfig,
  onUpdateAnimal
}) => {
  const [activeTab, setActiveTab] = useState<'ordeno' | 'carne'>(
    farmConfig.propositoPrincipal === 'Ordeño' ? 'ordeno' : 'carne'
  );

  // Ordeño Metrics
  const milkingCows = animals.filter(a => a.proposito === 'Ordeño' || a.proposito === 'Mixto');
  const totalDailyLiters = milkingCows.reduce((acc, a) => acc + (a.produccionDiariaLitros || 0), 0);
  const dailyMilkRevenueEuro = totalDailyLiters * farmConfig.precioPorLitroLecheEuro;
  const monthlyMilkRevenueEuro = dailyMilkRevenueEuro * 30;

  // Carne Metrics
  const meatCows = animals.filter(a => a.proposito === 'Carne' || a.proposito === 'Mixto');
  const totalMeatAssetValueEuro = meatCows.reduce((acc, a) => acc + (a.precioEstimadoVentaEuro || (a.pesoKg ? a.pesoKg * farmConfig.precioEstimadoKgCarneEuro : 1600)), 0);
  const totalCostsEuro = meatCows.reduce((acc, a) => acc + (a.costeAcumuladoEuro || 650), 0);
  const totalMeatNetMarginEuro = totalMeatAssetValueEuro - totalCostsEuro;
  const marginPercentage = totalCostsEuro > 0 ? ((totalMeatNetMarginEuro / totalCostsEuro) * 100).toFixed(1) : '0';

  const handleMilkingFrequencyChange = (veces: number) => {
    onUpdateFarmConfig({
      ...farmConfig,
      vecesOrdenoDia: veces
    });
  };

  const handleMilkPriceChange = (price: number) => {
    onUpdateFarmConfig({
      ...farmConfig,
      precioPorLitroLecheEuro: price
    });
  };

  const handleMeatPriceChange = (pricePerKg: number) => {
    onUpdateFarmConfig({
      ...farmConfig,
      precioEstimadoKgCarneEuro: pricePerKg
    });
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="card-farm p-2 bg-emerald-950/5 border-emerald-200/60 flex items-center gap-2">
        <button
          onClick={() => setActiveTab('ordeno')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'ordeno'
              ? 'bg-emerald-800 text-white shadow-md'
              : 'text-gray-600 hover:text-emerald-900 hover:bg-white/50'
          }`}
        >
          <Milk size={18} />
          <span>Explotación de Ordeño / Leche</span>
        </button>

        <button
          onClick={() => setActiveTab('carne')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'carne'
              ? 'bg-emerald-800 text-white shadow-md'
              : 'text-gray-600 hover:text-emerald-900 hover:bg-white/50'
          }`}
        >
          <Scale size={18} />
          <span>Explotación de Carne & Rentabilidad</span>
        </button>
      </div>

      {/* SECTION 1: ORDEÑO (MILKING) */}
      {activeTab === 'ordeno' && (
        <div className="space-y-6">
          {/* Farm Ordeño Config Banner */}
          <div className="card-farm p-5 bg-gradient-to-br from-blue-900 to-indigo-950 text-white space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/15 pb-4">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-widest text-blue-300">Configuración de Ordeño</span>
                <h2 className="text-xl font-extrabold text-white mt-0.5">Control de Frecuencia y Rendimiento Lácteo</h2>
              </div>
              <div className="bg-white/10 px-3 py-1.5 rounded-xl text-xs font-mono text-blue-200 border border-white/20">
                Lote activo: {milkingCows.length} reses
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Milking frequency picker */}
              <div className="bg-white/10 p-3.5 rounded-xl border border-white/10 space-y-2">
                <label className="block font-bold text-blue-200">Veces que se ordeñan al día</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleMilkingFrequencyChange(num)}
                      className={`flex-1 py-2 rounded-lg font-extrabold text-sm transition-all border ${
                        farmConfig.vecesOrdenoDia === num
                          ? 'bg-blue-400 text-blue-950 border-white shadow-md'
                          : 'bg-white/5 text-white hover:bg-white/20 border-white/20'
                      }`}
                    >
                      {num} {num === 1 ? 'Ordeño / día' : 'Ordeños / día'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price per Liter Config */}
              <div className="bg-white/10 p-3.5 rounded-xl border border-white/10 space-y-2">
                <label className="block font-bold text-blue-200">Precio Cobrado por Litro de Leche (€/L)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={farmConfig.precioPorLitroLecheEuro}
                    onChange={(e) => handleMilkPriceChange(Number(e.target.value))}
                    className="w-full bg-white text-gray-900 font-extrabold text-base px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <span className="font-extrabold text-blue-300 text-base">€ / Litro</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ordeño Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-farm p-4 border-blue-200 bg-blue-50/50">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Producción Diaria Total</span>
              <p className="text-3xl font-black text-blue-950 mt-1">
                {totalDailyLiters.toFixed(1)} <span className="text-base font-bold text-blue-700">Litros / día</span>
              </p>
              <p className="text-xs text-blue-700 mt-1 font-medium">
                Promedio: {(milkingCows.length ? totalDailyLiters / milkingCows.length : 0).toFixed(1)} L/vaca
              </p>
            </div>

            <div className="card-farm p-4 border-emerald-200 bg-emerald-50/50">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Ingreso Estimado Diario</span>
              <p className="text-3xl font-black text-emerald-950 mt-1">
                {dailyMilkRevenueEuro.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </p>
              <p className="text-xs text-emerald-700 mt-1 font-medium">
                A {farmConfig.precioPorLitroLecheEuro} €/L
              </p>
            </div>

            <div className="card-farm p-4 border-indigo-200 bg-indigo-50/50">
              <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Proyección Mensual (30d)</span>
              <p className="text-3xl font-black text-indigo-950 mt-1">
                {monthlyMilkRevenueEuro.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </p>
              <p className="text-xs text-indigo-700 mt-1 font-medium">
                {farmConfig.vecesOrdenoDia} turnos diarios programados
              </p>
            </div>
          </div>

          {/* Table of Milking Animals */}
          <div className="card-farm p-5 space-y-3">
            <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
              <span>🥛</span> Rendimiento por Vaca de Ordeño
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 font-bold">
                    <th className="p-3">Crotal</th>
                    <th className="p-3">Raza</th>
                    <th className="p-3">Partos</th>
                    <th className="p-3">Litros / Día</th>
                    <th className="p-3 text-right">Ingreso Diario (€)</th>
                    <th className="p-3 text-center">Ajuste Rápido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {milkingCows.map((animal) => {
                    const cowRevenue = (animal.produccionDiariaLitros || 0) * farmConfig.precioPorLitroLecheEuro;
                    return (
                      <tr key={animal.id} className="hover:bg-blue-50/40">
                        <td className="p-3 font-mono font-bold text-blue-950">{animal.crotal}</td>
                        <td className="p-3">{animal.raza}</td>
                        <td className="p-3 font-bold">{animal.numeroPartos}</td>
                        <td className="p-3">
                          <span className="font-extrabold text-blue-900 text-sm">{animal.produccionDiariaLitros || 0} L</span>
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-800">
                          {cowRevenue.toFixed(2)} €
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            step="0.5"
                            value={animal.produccionDiariaLitros || 0}
                            onChange={(e) => {
                              onUpdateAnimal({
                                ...animal,
                                produccionDiariaLitros: Number(e.target.value)
                              });
                            }}
                            className="w-20 bg-white border border-gray-300 rounded px-2 py-1 text-center font-bold text-xs"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: CARNE & RENTABILIDAD (MEAT & PROFITABILITY) */}
      {activeTab === 'carne' && (
        <div className="space-y-6">
          {/* Farm Meat Config Banner */}
          <div className="card-farm p-5 bg-gradient-to-br from-emerald-900 to-green-950 text-white space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/15 pb-4">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-300">Cálculo de Rentabilidad Ganadera</span>
                <h2 className="text-xl font-extrabold text-white mt-0.5">Control de Costes y Margen de Venta de Carne (€)</h2>
              </div>
              <div className="bg-white/10 px-3 py-1.5 rounded-xl text-xs font-mono text-emerald-200 border border-white/20">
                Lote de carne: {meatCows.length} reses
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Meat Price per Kg Config */}
              <div className="bg-white/10 p-3.5 rounded-xl border border-white/10 space-y-2">
                <label className="block font-bold text-emerald-200">Precio de Venta Estimado de Carne (€/kg en vivo)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.10"
                    value={farmConfig.precioEstimadoKgCarneEuro}
                    onChange={(e) => handleMeatPriceChange(Number(e.target.value))}
                    className="w-full bg-white text-gray-900 font-extrabold text-base px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <span className="font-extrabold text-emerald-300 text-base">€ / kg</span>
                </div>
              </div>

              {/* Profitability Index Summary */}
              <div className="bg-white/10 p-3.5 rounded-xl border border-white/10 flex flex-col justify-between">
                <span className="font-bold text-emerald-200">Índice de Rentabilidad Explotación</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-emerald-300">+{marginPercentage}%</span>
                  <span className="text-emerald-100/80 text-xs">Retorno estimado sobre costes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Profitability Summary Cards in EUROS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-farm p-4 border-green-200 bg-green-50/50">
              <span className="text-xs font-bold text-green-800 uppercase tracking-wider">Valor Bruto Venta Lote</span>
              <p className="text-3xl font-black text-green-950 mt-1">
                {totalMeatAssetValueEuro.toLocaleString('es-ES')} €
              </p>
              <p className="text-xs text-green-700 mt-1 font-medium">
                {meatCows.length} reses valoradas
              </p>
            </div>

            <div className="card-farm p-4 border-red-200 bg-red-50/50">
              <span className="text-xs font-bold text-red-800 uppercase tracking-wider">Costes Acumulados (Pienso+Vet)</span>
              <p className="text-3xl font-black text-red-950 mt-1">
                {totalCostsEuro.toLocaleString('es-ES')} €
              </p>
              <p className="text-xs text-red-700 mt-1 font-medium">
                Inversión en alimentación y sanidad
              </p>
            </div>

            <div className="card-farm p-4 border-emerald-300 bg-emerald-100/60">
              <span className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider">MARGEN NETO LIMPIO</span>
              <p className="text-3xl font-black text-emerald-950 mt-1">
                +{totalMeatNetMarginEuro.toLocaleString('es-ES')} €
              </p>
              <p className="text-xs text-emerald-800 mt-1 font-bold">
                Beneficio real de la explotación ganadera
              </p>
            </div>
          </div>

          {/* Detailed Animal Rentability Table */}
          <div className="card-farm p-5 space-y-3">
            <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
              <span>🥩</span> Desglose de Rentabilidad por Crotal
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-emerald-900 text-white font-bold">
                    <th className="p-3">Crotal</th>
                    <th className="p-3">Raza</th>
                    <th className="p-3">Peso (kg)</th>
                    <th className="p-3">Valor Est. (€)</th>
                    <th className="p-3">Coste Acum. (€)</th>
                    <th className="p-3 text-right">Beneficio Neto (€)</th>
                    <th className="p-3 text-center">Estado Rentabilidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {meatCows.map((animal) => {
                    const value = animal.precioEstimadoVentaEuro || (animal.pesoKg ? animal.pesoKg * farmConfig.precioEstimadoKgCarneEuro : 1600);
                    const cost = animal.costeAcumuladoEuro || 650;
                    const margin = value - cost;
                    const isHighMargin = margin > 800;

                    return (
                      <tr key={animal.id} className="hover:bg-emerald-50/40">
                        <td className="p-3 font-mono font-bold text-emerald-950">{animal.crotal}</td>
                        <td className="p-3">{animal.raza}</td>
                        <td className="p-3 font-bold">{animal.pesoKg || 0} kg</td>
                        <td className="p-3 font-extrabold text-gray-900">{value.toLocaleString('es-ES')} €</td>
                        <td className="p-3 text-red-700 font-semibold">{cost.toLocaleString('es-ES')} €</td>
                        <td className="p-3 text-right font-black text-emerald-900 text-sm">
                          +{margin.toLocaleString('es-ES')} €
                        </td>
                        <td className="p-3 text-center">
                          {isHighMargin ? (
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px] border border-emerald-300">
                              Alta Rentabilidad
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold text-[10px] border border-amber-300">
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
