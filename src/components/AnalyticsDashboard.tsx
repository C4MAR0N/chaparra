import { useMemo, useState } from 'react';
import { useFarm } from '../context/FarmContext';
import {
  altasPorMes,
  animalMeat,
  daysBetween,
  edadTexto,
  euro,
  hasMeat,
  hasMilk,
  milkSeries,
  number,
  porUbicacion,
  today,
  weightStats
} from '../lib/domain';
import { especieLabel } from '../lib/constants';
import type { MilkRecord } from '../types';
import { Button, Card, EmptyState, Field, Input, StatTile } from './ui';
import { DataChart, SeriesChart } from './Charts';

function distribution(values: string[]) {
  const counts: Record<string, number> = {};
  values.forEach(value => {
    counts[value] = (counts[value] ?? 0) + 1;
  });
  return Object.entries(counts).map(([label, value]) => ({ label, value }));
}

/* Un año de ordeños diarios son trescientas y pico columnas ilegibles. A partir
 * de dos meses la leche se agrupa por meses. */
const DIAS_PARA_AGRUPAR = 62;

function litrosPorMes(records: MilkRecord[]) {
  const meses = new Map<string, number>();
  for (const r of records) {
    const mes = r.fecha.slice(0, 7);
    meses.set(mes, (meses.get(mes) ?? 0) + r.litros);
  }
  return [...meses.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, value]) => ({
      label: new Date(mes + '-01T12:00:00').toLocaleDateString('es-ES', {
        month: 'short',
        year: '2-digit'
      }),
      value
    }));
}

/** Primer día del mes que empieza el periodo por defecto: los últimos 12 meses. */
function haceUnAno(referencia: string) {
  const d = new Date(referencia + 'T12:00:00');
  d.setMonth(d.getMonth() - 11, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function AnalyticsDashboard() {
  const { data, farm } = useFarm();
  const hoy = today();
  const [desde, setDesde] = useState(() => haceUnAno(hoy));
  const [hasta, setHasta] = useState(hoy);
  const [campoAltas, setCampoAltas] = useState<'fechaAlta' | 'fechaNacimiento'>('fechaAlta');
  const rangoValido = Boolean(desde && hasta) && hasta >= desde;
  const enRango = (fecha: string | undefined) =>
    rangoValido && !!fecha && fecha >= desde && fecha <= hasta;

  const active = data.animals.filter(a => a.activo);
  const invoices = data.invoices.filter(i => enRango(i.fecha));
  const expenses = invoices
      .filter(i => i.tipo === 'Compra / Gasto')
      .reduce((sum, i) => sum + i.importeTotalEuro, 0),
    income = invoices
      .filter(i => i.tipo === 'Venta')
      .reduce((sum, i) => sum + i.importeTotalEuro, 0);
  const ordenos = data.milkRecords.filter(r => enRango(r.fecha));
  const liters = ordenos.reduce((sum, r) => sum + r.litros, 0);
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
  const dias = rangoValido ? daysBetween(desde, hasta) + 1 : 0;
  const manadas = useMemo(() => porUbicacion(data.animals), [data.animals]);
  /* Una gráfica de una sola barra no informa de nada: si la explotación tiene
   * una especie, el reparto por especie sobra. */
  const variasEspecies = new Set(active.map(a => a.especie)).size > 1;
  const altas = useMemo(
    () => (rangoValido ? altasPorMes(data.animals, desde, hasta, campoAltas) : []),
    [data.animals, desde, hasta, campoAltas, rangoValido]
  );

  const atajo = (nuevoDesde: string, nuevoHasta: string) => () => {
    setDesde(nuevoDesde);
    setHasta(nuevoHasta);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-heading">Informes</h1>
        <p className="mt-2 text-sm text-stone-600">
          Una visión clara de tu explotación y sus cuentas.
        </p>
      </div>
      <Card className="space-y-4">
        <div className="form-grid">
          <Field label="Desde">
            <Input
              type="date"
              value={desde}
              max={hasta || undefined}
              onChange={e => setDesde(e.target.value)}
            />
          </Field>
          <Field
            label="Hasta"
            error={
              desde && hasta && hasta < desde
                ? 'La fecha final es anterior a la inicial.'
                : undefined
            }
          >
            <Input
              type="date"
              value={hasta}
              min={desde || undefined}
              onChange={e => setHasta(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={atajo(hoy.slice(0, 8) + '01', hoy)}>
            Este mes
          </Button>
          <Button variant="secondary" size="sm" onClick={atajo(hoy.slice(0, 4) + '-01-01', hoy)}>
            Este año
          </Button>
          <Button variant="secondary" size="sm" onClick={atajo(haceUnAno(hoy), hoy)}>
            Últimos 12 meses
          </Button>
        </div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Animales activos hoy" value={active.length} />
        <StatTile
          label="Altas del periodo"
          value={data.animals.filter(a => enRango(a.fechaAlta)).length}
        />
        <StatTile
          label="Bajas del periodo"
          value={data.animals.filter(a => enRango(a.fechaBaja)).length}
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
            <StatTile label="Litros del periodo" value={number(liters) + ' L'} />
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
      <SeriesChart
        title={
          campoAltas === 'fechaAlta' ? 'Animales registrados mes a mes' : 'Nacimientos mes a mes'
        }
        data={altas}
        series={[
          { key: 'hembras', label: 'Hembras', color: '#1F4A33' },
          { key: 'machos', label: 'Machos', color: '#A8630F' }
        ]}
        unit="animales"
        vacio="No hay altas registradas en el periodo elegido. Prueba a ampliarlo."
        aside={
          <div className="flex gap-2">
            <Button
              variant={campoAltas === 'fechaAlta' ? 'primary' : 'secondary'}
              size="sm"
              aria-pressed={campoAltas === 'fechaAlta'}
              onClick={() => setCampoAltas('fechaAlta')}
            >
              Por fecha de alta
            </Button>
            <Button
              variant={campoAltas === 'fechaNacimiento' ? 'primary' : 'secondary'}
              size="sm"
              aria-pressed={campoAltas === 'fechaNacimiento'}
              onClick={() => setCampoAltas('fechaNacimiento')}
            >
              Por nacimiento
            </Button>
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <DataChart
          title="Animales activos por ubicación"
          data={manadas.map(m => ({ label: m.ubicacion, value: m.total }))}
          unit="animales"
        />
        {variasEspecies && (
          <DataChart
            title="Animales activos por especie"
            data={distribution(active.map(a => especieLabel(a.especie)))}
            unit="animales"
          />
        )}
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
            title={dias > DIAS_PARA_AGRUPAR ? 'Producción de leche por mes' : 'Producción de leche'}
            data={
              !ordenos.length
                ? []
                : dias > DIAS_PARA_AGRUPAR
                  ? litrosPorMes(ordenos)
                  : milkSeries(ordenos, dias, hasta)
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
      {manadas.length > 0 && (
        <Card className="space-y-3">
          <h3 className="section-heading">Animales por ubicación</h3>
          {/* Lista y no tabla: cinco columnas de cifras no caben en un móvil sin
              partir las palabras por la mitad. */}
          <ul className="divide-y divide-stone-200">
            {manadas.map(m => (
              <li key={m.ubicacion} className="flex items-baseline gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{m.ubicacion}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {m.hembras} {m.hembras === 1 ? 'hembra' : 'hembras'} · {m.machos}{' '}
                    {m.machos === 1 ? 'macho' : 'machos'} · edad media {edadTexto(m.mesesMedios)}
                  </p>
                </div>
                <p className="shrink-0 text-right">
                  <span className="text-xl font-bold tabular-nums text-brand-900">{m.total}</span>
                  <span className="block text-xs text-stone-600">animales</span>
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <p className="text-xs text-stone-600">
        Las distribuciones por ubicación, especie y sanidad muestran el estado actual del ganado
        activo. El balance usa las facturas del periodo seleccionado; las estimaciones de producción
        no son ingresos cobrados.
      </p>
    </div>
  );
}
