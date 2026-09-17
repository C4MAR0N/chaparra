import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
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
