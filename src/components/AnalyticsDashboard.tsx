import { useState } from 'react';
import { useFarm } from '../context/FarmContext';
import {
  animalMeat,
  euro,
  hasMeat,
  hasMilk,
  milkSeries,
  number,
  today,
  weightStats
} from '../lib/domain';
import { especieLabel } from '../lib/constants';
import { Card, EmptyState, Field, Input, StatTile } from './ui';
import { DataChart } from './Charts';
function distribution(values: string[]) {
  const counts: Record<string, number> = {};
  values.forEach(value => {
    counts[value] = (counts[value] ?? 0) + 1;
  });
  return Object.entries(counts).map(([label, value]) => ({ label, value }));
}
export function AnalyticsDashboard() {
  const { data, farm } = useFarm();
  const [month, setMonth] = useState(today().slice(0, 7));
  const period = month || today().slice(0, 7);
  const active = data.animals.filter(a => a.activo),
    invoices = data.invoices.filter(i => i.fecha.startsWith(period));
  const expenses = invoices
      .filter(i => i.tipo === 'Compra / Gasto')
      .reduce((sum, i) => sum + i.importeTotalEuro, 0),
    income = invoices
      .filter(i => i.tipo === 'Venta')
      .reduce((sum, i) => sum + i.importeTotalEuro, 0);
  const liters = data.milkRecords
    .filter(r => r.fecha.startsWith(period))
    .reduce((sum, r) => sum + r.litros, 0);
  const expensesByCategory: Record<string, number> = {};
  invoices
    .filter(i => i.tipo === 'Compra / Gasto')
    .forEach(i => {
      expensesByCategory[i.categoria] = (expensesByCategory[i.categoria] ?? 0) + i.importeTotalEuro;
    });
  const meatAnimals = active.filter(a => animalMeat(a, farm));
  const meatValue = meatAnimals.reduce(
    (sum, a) =>
      sum +
      (a.precioEstimadoVentaEuro ??
        (weightStats(a, data.weightRecords).current ?? 0) * (farm.precioKgCarneEuro ?? 0)),
    0
  );
  const days = new Date(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0).getDate();
  const end = period + '-' + String(days).padStart(2, '0');
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-heading">Informes</h1>
          <p className="mt-2 text-sm text-stone-600">
            Una visión clara de tu explotación y sus cuentas.
          </p>
        </div>
        <Field label="Periodo del informe">
          <Input type="month" value={month} onChange={e => setMonth(e.target.value)} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Animales activos hoy" value={active.length} />
        <StatTile
          label="Altas del mes"
          value={data.animals.filter(a => a.fechaAlta.startsWith(period)).length}
        />
        <StatTile
          label="Bajas del mes"
          value={data.animals.filter(a => a.fechaBaja?.startsWith(period)).length}
        />
        <StatTile
          label="Balance del periodo"
          value={euro(income - expenses)}
          help="Ingresos registrados menos gastos."
        />
        <StatTile label="Ingresos registrados" value={euro(income)} />
        <StatTile label="Gastos registrados" value={euro(expenses)} />
        {hasMilk(farm) && (
          <>
            <StatTile label="Litros del mes" value={number(liters) + ' L'} />
            <StatTile
              label="Ingreso lácteo estimado"
              value={euro(liters * (farm.precioLitroLecheEuro ?? 0))}
              help="No se suma al balance de facturas."
            />
          </>
        )}
        {hasMeat(farm) && (
          <StatTile
            label="Valor estimado de carne hoy"
            value={euro(meatValue)}
            help="Solo animales activos; usa el precio actual de Ajustes."
          />
        )}
      </div>
      {!data.animals.length && !data.invoices.length && !data.milkRecords.length && (
        <Card>
          <EmptyState
            title="Tus informes se construirán contigo"
            description="Da de alta animales y registra producción o facturas. Aquí verás únicamente los resultados de tus datos."
          />
        </Card>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <DataChart
          title="Animales activos por especie"
          data={distribution(active.map(a => especieLabel(a.especie)))}
          unit="animales"
        />
        <DataChart
          title="Estado sanitario actual"
          data={distribution(active.map(a => a.estadoSanitario))}
          unit="animales"
        />
        <DataChart
          title="Gastos por categoría"
          data={Object.entries(expensesByCategory).map(([label, value]) => ({
            label: label
              .replace('Pienso/Alimentación', 'Alimentación')
              .replace('Veterinario/Sanidad', 'Sanidad')
              .replace('Maquinaria/Combustible', 'Maquinaria'),
            value
          }))}
          unit="€"
        />
        {hasMilk(farm) && (
          <DataChart
            title="Producción de leche del mes"
            data={
              data.milkRecords.some(r => r.fecha.startsWith(period))
                ? milkSeries(data.milkRecords, days, end)
                : []
            }
            unit="L"
            line
          />
        )}
        <DataChart
          title="Ingresos y gastos del periodo"
          data={
            invoices.length
              ? [
                  { label: 'Ingresos', value: income },
                  { label: 'Gastos', value: expenses }
                ]
              : []
          }
          unit="€"
        />
      </div>
      <p className="text-xs text-stone-600">
        Las distribuciones muestran el estado actual. El balance usa las facturas del periodo
        seleccionado; las estimaciones de producción no son ingresos cobrados.
      </p>
    </div>
  );
}
