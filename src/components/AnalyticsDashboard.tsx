import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { PieChart as PieIcon, BarChart3, TrendingUp, ShieldCheck, HeartPulse } from 'lucide-react';
import { Animal, InvoiceDoc, FarmConfig } from '../types';

interface AnalyticsDashboardProps {
  animals: Animal[];
  invoices: InvoiceDoc[];
  farmConfig: FarmConfig;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  animals,
  invoices,
  farmConfig
}) => {
  // 1. Health Status Distribution
  const healthCounts: Record<string, number> = {};
  animals.forEach(a => {
    healthCounts[a.estadoSanitario] = (healthCounts[a.estadoSanitario] || 0) + 1;
  });

  const healthData = Object.keys(healthCounts).map(key => ({
    name: key,
    value: healthCounts[key]
  }));

  const HEALTH_COLORS: Record<string, string> = {
    'Sano': '#10B981',
    'En tratamiento': '#F59E0B',
    'En cuarentena': '#EF4444',
    'Vacunado': '#3B82F6',
    'Observación': '#8B5CF6'
  };

  // 2. Milk Production per Cow (Top Milk Producers)
  const milkCowsData = animals
    .filter(a => (a.proposito === 'Ordeño' || a.proposito === 'Mixto') && (a.produccionDiariaLitros || 0) > 0)
    .map(a => ({
      crotal: a.crotal.substring(a.crotal.length - 6), // last 6 digits for chart label readability
      litros: a.produccionDiariaLitros || 0
    }));

  // 3. Financial Comparison: Estimated Meat Value vs Accumulated Expenses
  const totalMeatValue = animals.reduce((acc, a) => acc + (a.precioEstimadoVentaEuro || 1600), 0);
  const totalExpenses = invoices.reduce((acc, i) => acc + i.importeTotalEuro, 0);

  const financialData = [
    { concepto: 'Valor Cabaña (€)', valor: totalMeatValue, fill: '#059669' },
    { concepto: 'Gastos Facturados (€)', valor: totalExpenses, fill: '#DC2626' }
  ];

  // 4. Herd Breed Breakdown
  const breedCounts: Record<string, number> = {};
  animals.forEach(a => {
    breedCounts[a.raza] = (breedCounts[a.raza] || 0) + 1;
  });

  const breedData = Object.keys(breedCounts).map(key => ({
    raza: key,
    cantidad: breedCounts[key]
  }));

  return (
    <div className="space-y-6">
      <div className="card-farm p-5 bg-gradient-to-br from-emerald-900 to-teal-950 text-white shadow-xl">
        <h2 className="text-xl font-extrabold flex items-center gap-2">
          <BarChart3 size={24} className="text-emerald-300" />
          Dashboard de Inteligencia & Analytics Ganadero
        </h2>
        <p className="text-xs text-emerald-100/80 mt-1">
          Visualización en tiempo real del rendimiento sanitario, financiero y productivo de {farmConfig.nombreExplotacion}.
        </p>
      </div>

      {/* Grid of Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Health Status Pie */}
        <div className="card-farm p-5 space-y-4">
          <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-3">
            <HeartPulse size={18} className="text-emerald-700" />
            Distribución del Estado Sanitario de la Cabaña
          </h3>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {healthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={HEALTH_COLORS[entry.name] || '#6B7280'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} reses`, 'Cantidad']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Top Milk Production Bar Chart */}
        <div className="card-farm p-5 space-y-4">
          <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-3">
            <BarChart3 size={18} className="text-blue-700" />
            Producción Láctea Diaria por Crotal (Litros/día)
          </h3>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={milkCowsData}>
                <XAxis dataKey="crotal" tick={{ fontSize: 10 }} />
                <YAxis unit=" L" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val) => [`${val} L/día`, 'Rendimiento']} />
                <Bar dataKey="litros" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Financial Balance Comparison */}
        <div className="card-farm p-5 space-y-4">
          <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-3">
            <TrendingUp size={18} className="text-emerald-700" />
            Balance Patrimonial: Valor Ganado vs Gastos Registrados (€)
          </h3>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData}>
                <XAxis dataKey="concepto" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit=" €" />
                <Tooltip formatter={(val: any) => [`${Number(val).toLocaleString('es-ES')} €`, 'Importe']} />
                <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                  {financialData.map((entry, index) => (
                    <Cell key={`cell-fin-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Breed Composition Bar Chart */}
        <div className="card-farm p-5 space-y-4">
          <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-3">
            <ShieldCheck size={18} className="text-amber-700" />
            Composición de Razas Ganaderas
          </h3>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breedData}>
                <XAxis dataKey="raza" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val) => [`${val} cabezas`, 'Total']} />
                <Bar dataKey="cantidad" fill="#D97706" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
