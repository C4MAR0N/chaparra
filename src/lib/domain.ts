import type { Animal, FarmProfile, MilkRecord, SaleInvoiceTemplate, WeightRecord } from '../types';
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const uid = () => crypto.randomUUID();
export const number = (value: number, digits = 1) =>
  value.toLocaleString('es-ES', { maximumFractionDigits: digits });
export const euro = (value: number) =>
  value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
export const euroRate = (value: number, unit: string) =>
  value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
  ` €/${unit}`;
export const dateLabel = (value: string) =>
  new Date(value + 'T12:00:00').toLocaleDateString('es-ES');
export const roundMoney = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const hasMilk = (farm: FarmProfile) =>
  farm.especies.some(s => ['Leche', 'Mixto'].includes(farm.orientacionPorEspecie[s] || ''));
export const hasMeat = (farm: FarmProfile) =>
  farm.especies.some(s => ['Carne', 'Mixto'].includes(farm.orientacionPorEspecie[s] || ''));
export const animalMilk = (a: Animal, f: FarmProfile) => hasMilk(f) && a.orientacion !== 'Carne';
export const animalMeat = (a: Animal, f: FarmProfile) => hasMeat(f) && a.orientacion !== 'Leche';
export const herdLabel = (f: FarmProfile) =>
  f.especies.some(s => s === 'Ovino' || s === 'Caprino') ? 'rebaño' : 'ganado';
export function age(birth: string, reference = today()) {
  const b = new Date(birth + 'T12:00:00'),
    n = new Date(reference + 'T12:00:00');
  let months = (n.getFullYear() - b.getFullYear()) * 12 + n.getMonth() - b.getMonth();
  if (n.getDate() < b.getDate()) months--;
  months = Math.max(0, months);
  const years = Math.floor(months / 12),
    rest = months % 12;
  return `${years} ${years === 1 ? 'año' : 'años'} y ${rest} ${rest === 1 ? 'mes' : 'meses'}`;
}
export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000);
export function milkSeries(records: MilkRecord[], days: number, end = today()) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(end + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - (days - 1 - i));
    const fecha = d.toISOString().slice(0, 10);
    return {
      fecha,
      label: dateLabel(fecha).slice(0, 5),
      value: records.filter(r => r.fecha === fecha).reduce((sum, r) => sum + r.litros, 0)
    };
  });
}
export function weightStats(animal: Animal, records: WeightRecord[], reference = today()) {
  const history = records
    .filter(r => r.animalId === animal.id && r.fecha <= reference)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const last = history.at(-1),
    previous = history.at(-2);
  const days = last && previous ? daysBetween(previous.fecha, last.fecha) : 0;
  const gmd = last && previous && days > 0 ? (last.pesoKg - previous.pesoKg) / days : null;
  const stale = !!last && daysBetween(last.fecha, reference) > 30;
  const current =
    last && !stale
      ? Math.max(0, last.pesoKg + (gmd ?? 0) * daysBetween(last.fecha, reference))
      : null;
  return { last, previous, gmd, current, stale };
}
export function saleTotals(template: SaleInvoiceTemplate) {
  const base = roundMoney(
    template.items.reduce(
      (sum, item) => sum + roundMoney(item.cantidad * item.precioUnitarioEuro),
      0
    )
  );
  const rate =
    template.regimen === 'REAGP' ? template.compensacionPorcentaje : template.ivaPorcentaje;
  const tax = roundMoney((base * rate) / 100);
  const withholding = roundMoney((base * template.irpfPorcentaje) / 100);
  return { base, tax, withholding, total: roundMoney(base + tax - withholding) };
}
export function accumulatedCost(animal: Animal) {
  return (
    (animal.costeAcumuladoEuro ?? 0) +
    animal.historialSanitario.reduce((sum, r) => sum + r.costeEuro, 0)
  );
}
