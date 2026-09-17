import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { ReactNode } from 'react';
import { Card, EmptyState } from './ui';
import { number } from '../lib/domain';
export interface ChartRow {
  label: string;
  value: number;
}
const COLORS = ['#1F4A33', '#3E7554', '#7F4A0C', '#5F9373', '#A8630F', '#57534E', '#173928'];
export function DataChart({
  title,
  data,
  unit = '',
  line = false
}: {
  title: string;
  data: ChartRow[];
  unit?: string;
  line?: boolean;
}) {
  return (
    <Card className="space-y-4">
      <h3 className="section-heading">{title}</h3>
      {!data.length ? (
        <EmptyState
          title="Todavía no hay datos"
          description="La gráfica aparecerá cuando registres información."
        />
      ) : (
        <>
          <div className="h-72 min-w-0" role="img" aria-label={title}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              {line ? (
                <LineChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="#E7E5E4" vertical={false} />
                  <XAxis dataKey="label" minTickGap={30} />
                  <YAxis width={56} />
                  <Tooltip
                    formatter={value => [
                      number(Number(value), 2) + (unit ? ' ' + unit : ''),
                      'Cantidad'
                    ]}
                  />
                  <Line
                    name="Cantidad"
                    type="linear"
                    dataKey="value"
                    stroke="#2D5F42"
                    strokeWidth={3}
                    dot={data.length < 10}
                    isAnimationActive={false}
                  />
                </LineChart>
              ) : (
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ top: 0, right: 22, bottom: 0, left: 0 }}
                >
                  <CartesianGrid stroke="#E7E5E4" horizontal={false} />
                  <XAxis type="number" allowDecimals={unit !== 'animales'} />
                  <YAxis type="category" dataKey="label" width={126} tick={{ fontSize: 13 }} />
                  <Tooltip
                    formatter={value => [
                      number(Number(value), 2) + (unit ? ' ' + unit : ''),
                      'Cantidad'
                    ]}
                  />
                  <Bar
                    name="Cantidad"
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}
                  >
                    {data.map((row, index) => (
                      <Cell key={row.label} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          <ul className="sr-only">
            {data.map(row => (
              <li key={row.label}>
                {row.label}: {number(row.value, 2)} {unit}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

/*
 * Gráfica de columnas con dos o más series apiladas a lo largo del tiempo.
 *
 * `DataChart` compara categorías entre sí y por eso dibuja barras horizontales.
 * Aquí lo que se compara es un mes con el siguiente, así que las columnas van
 * en vertical: el eje del tiempo se lee de izquierda a derecha, como un
 * calendario. Apiladas porque interesan a la vez el total del mes y de qué está
 * hecho ese total.
 */
export function SeriesChart({
  title,
  data,
  series,
  unit = '',
  aside,
  vacio = 'La gráfica aparecerá cuando registres información.'
}: {
  title: string;
  data: Record<string, string | number>[];
  series: { key: string; label: string; color: string }[];
  unit?: string;
  aside?: ReactNode;
  vacio?: string;
}) {
  const hayDatos = data.some(row => series.some(s => Number(row[s.key]) > 0));
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="section-heading">{title}</h3>
        {aside}
      </div>
      {!hayDatos ? (
        <EmptyState title="Todavía no hay datos" description={vacio} />
      ) : (
        <>
          <div className="h-72 min-w-0" role="img" aria-label={title}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#E7E5E4" vertical={false} />
                <XAxis dataKey="label" minTickGap={8} tick={{ fontSize: 12 }} />
                <YAxis width={40} allowDecimals={false} />
                <Tooltip
                  formatter={(value, name) => [
                    number(Number(value), 0) + (unit ? ' ' + unit : ''),
                    name
                  ]}
                />
                <Legend />
                {series.map(s => (
                  <Bar
                    key={s.key}
                    name={s.label}
                    dataKey={s.key}
                    stackId="total"
                    fill={s.color}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="sr-only">
            {data.map(row => (
              <li key={String(row.label)}>
                {String(row.label)}:{' '}
                {series.map(s => `${s.label} ${number(Number(row[s.key]), 0)}`).join(', ')}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
