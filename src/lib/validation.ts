import type {
  Animal,
  Backup,
  FarmData,
  FarmProfile,
  HealthRecord,
  InvoiceDoc,
  Lote,
  MilkRecord,
  SaleInvoiceTemplate,
  WeightRecord
} from '../types';
import {
  CATEGORIAS,
  CATEGORIAS_ANIMAL,
  ESPECIES,
  ESTADOS,
  ORIENTACIONES,
  PROVINCIAS,
  TIPOS_LOTE
} from './constants';
import { today } from './domain';
export const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === 'string' && v.length <= 20000;
const nonempty = (v: unknown): v is string => str(v) && v.trim().length > 0;
export const nonnegative = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e12;
const optional = (v: unknown, check: (v: unknown) => boolean) => v === undefined || check(v);
const oneOf = (v: unknown, values: readonly unknown[]) => values.includes(v);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(str);
export const validDate = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
const pastDate = (v: unknown) => validDate(v) && v <= today();
const image = (v: unknown) =>
  typeof v === 'string' &&
  v.length <= 3_000_000 &&
  /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(v);
/* El justificante de una factura llega tal como lo manda el proveedor: foto del
 * albarán o el PDF que viene por correo. El tope en caracteres deja pasar un PDF
 * de 2 MB, que es el que acepta el formulario. */
const justificante = (v: unknown) =>
  image(v) ||
  (typeof v === 'string' &&
    v.length <= 3_000_000 &&
    /^data:application\/pdf;base64,[A-Za-z0-9+/]+=*$/.test(v));
const uniqueIds = (rows: { id: string }[]) => new Set(rows.map(r => r.id)).size === rows.length;
export function isFarm(v: unknown): v is FarmProfile {
  return (
    object(v) &&
    nonempty(v.nombreExplotacion) &&
    str(v.titular) &&
    optional(v.codigoRega, str) &&
    optional(v.provincia, x => x === '' || oneOf(x, PROVINCIAS)) &&
    Array.isArray(v.especies) &&
    v.especies.length > 0 &&
    new Set(v.especies).size === v.especies.length &&
    v.especies.every(s => oneOf(s, ESPECIES)) &&
    object(v.orientacionPorEspecie) &&
    v.especies.every(
      s =>
        typeof s === 'string' &&
        object(v.orientacionPorEspecie) &&
        oneOf(v.orientacionPorEspecie[s], ORIENTACIONES)
    ) &&
    optional(v.ordenosPorDia, x => oneOf(x, [1, 2, 3])) &&
    optional(v.precioLitroLecheEuro, nonnegative) &&
    optional(v.precioKgCarneEuro, nonnegative) &&
    optional(
      v.municipio,
      m =>
        object(m) &&
        nonempty(m.nombre) &&
        str(m.provincia) &&
        typeof m.lat === 'number' &&
        Math.abs(m.lat) <= 90 &&
        typeof m.lon === 'number' &&
        Math.abs(m.lon) <= 180 &&
        optional(m.codigoIne, x => typeof x === 'string' && /^\d{5}$/.test(x))
    ) &&
    v.moneda === 'EUR'
  );
}
function isHealth(v: unknown): v is HealthRecord {
  return (
    object(v) &&
    nonempty(v.id) &&
    pastDate(v.fecha) &&
    oneOf(v.estado, ESTADOS) &&
    str(v.notas) &&
    nonnegative(v.costeEuro)
  );
}
/*
 * Hasta esta versión el animal llevaba `activo: boolean` + `motivoBaja`. La
 * migración vive aquí, en la validación, para que una ficha guardada con el
 * formato viejo se siga leyendo (235 vacas de un ganadero real dependen de
 * esto): `activo: true` -> 'Activo'; `motivoBaja: 'Vendido'` -> 'Vendido';
 * cualquier otra baja (incluida 'Sacrificado') -> 'Muerto'. Si ya trae
 * `categoria` no se toca: no se pisa un dato ya migrado, ni uno corrupto.
 */
/**
 * Migra una ficha suelta sin tocar el original. La necesita la sincronización:
 * lo que baja del servidor no pasa por `isAnimal`, así que sin esto una cuenta
 * con fichas antiguas entraría en la aplicación sin categoría y el ganadero
 * vería su explotación vacía.
 */
export function migrarAnimalGuardado(datos: unknown): unknown {
  if (!object(datos) || 'categoria' in datos) return datos;
  const copia = { ...datos };
  migrarCategoria(copia);
  return copia;
}
function migrarCategoria(v: Record<string, unknown>): void {
  if ('categoria' in v || typeof v.activo !== 'boolean') return;
  v.categoria = v.activo ? 'Activo' : v.motivoBaja === 'Vendido' ? 'Vendido' : 'Muerto';
  delete v.activo;
  delete v.motivoBaja;
}
export function isAnimal(v: unknown): v is Animal {
  if (!object(v)) return false;
  migrarCategoria(v);
  return (
    nonempty(v.id) &&
    nonempty(v.crotal) &&
    oneOf(v.especie, ESPECIES) &&
    oneOf(v.orientacion, ORIENTACIONES) &&
    str(v.ubicacion) &&
    nonnegative(v.numeroPartos) &&
    Number.isInteger(v.numeroPartos) &&
    pastDate(v.fechaNacimiento) &&
    strings(v.criasAsociadas) &&
    oneOf(v.estadoSanitario, ESTADOS) &&
    optional(v.notasSanitarias, str) &&
    str(v.raza) &&
    oneOf(v.sexo, ['Hembra', 'Macho']) &&
    [
      'produccionDiariaLitros',
      'pesoKg',
      'pesoCanalKg',
      'precioEstimadoVentaEuro',
      'costeAcumuladoEuro'
    ].every(k => optional(v[k], nonnegative)) &&
    optional(v.fotoUrl, image) &&
    optional(v.fechaUltimoControl, pastDate) &&
    oneOf(v.categoria, CATEGORIAS_ANIMAL) &&
    pastDate(v.fechaAlta) &&
    optional(v.fechaBaja, pastDate) &&
    (v.categoria === 'Activo' || !!v.fechaBaja) &&
    Array.isArray(v.historialSanitario) &&
    v.historialSanitario.every(isHealth) &&
    uniqueIds(v.historialSanitario)
  );
}
export function isMilk(v: unknown): v is MilkRecord {
  return (
    object(v) &&
    nonempty(v.id) &&
    pastDate(v.fecha) &&
    optional(v.animalId, nonempty) &&
    nonnegative(v.litros) &&
    optional(v.ordeno, x => oneOf(x, [1, 2, 3])) &&
    optional(v.notas, str)
  );
}
export function isWeight(v: unknown): v is WeightRecord {
  return (
    object(v) &&
    nonempty(v.id) &&
    pastDate(v.fecha) &&
    nonempty(v.animalId) &&
    nonnegative(v.pesoKg) &&
    v.pesoKg > 0 &&
    optional(v.notas, str)
  );
}
export function isSaleTemplate(v: unknown): v is SaleInvoiceTemplate {
  return (
    object(v) &&
    [
      'numeroFactura',
      'nombreGanadero',
      'nifCif',
      'codigoRega',
      'direccion',
      'telefono',
      'email',
      'clienteNombre',
      'clienteNif',
      'clienteDireccion',
      'lugarOperacion'
    ].every(k => str(v[k])) &&
    validDate(v.fechaEmision) &&
    validDate(v.fechaOperacion) &&
    oneOf(v.regimen, ['REAGP', 'General']) &&
    ['ivaPorcentaje', 'irpfPorcentaje', 'compensacionPorcentaje'].every(
      k => nonnegative(v[k]) && Number(v[k]) <= 100
    ) &&
    optional(v.logoUrl, image) &&
    optional(v.notasPie, str) &&
    Array.isArray(v.items) &&
    v.items.every(
      i =>
        object(i) &&
        nonempty(i.id) &&
        str(i.descripcion) &&
        nonnegative(i.cantidad) &&
        nonnegative(i.precioUnitarioEuro) &&
        nonnegative(i.subtotalEuro)
    ) &&
    new Set(v.items.map(i => (i as { id: string }).id)).size === v.items.length
  );
}
export function isInvoice(v: unknown): v is InvoiceDoc {
  return (
    object(v) &&
    nonempty(v.id) &&
    oneOf(v.tipo, ['Compra / Gasto', 'Venta']) &&
    nonempty(v.titulo) &&
    validDate(v.fecha) &&
    str(v.proveedorOCliente) &&
    nonnegative(v.importeTotalEuro) &&
    oneOf(v.categoria, CATEGORIAS) &&
    optional(v.imagenUrl, justificante) &&
    optional(v.notas, str) &&
    optional(v.crotalesRelacionados, strings) &&
    optional(v.documentoVenta, isSaleTemplate)
  );
}
export function isLote(v: unknown): v is Lote {
  return (
    object(v) &&
    nonempty(v.id) &&
    oneOf(
      v.tipo,
      TIPOS_LOTE.map(t => t.tipo)
    ) &&
    pastDate(v.fecha) &&
    strings(v.animalIds) &&
    v.animalIds.length > 0 &&
    new Set(v.animalIds).size === v.animalIds.length &&
    optional(v.ubicacionDestino, str) &&
    optional(v.notas, str)
  );
}
export const arrayOf = <T>(v: unknown, check: (row: unknown) => row is T): v is T[] =>
  Array.isArray(v) && v.length <= 100000 && v.every(check);
export function isFarmData(v: unknown): v is FarmData {
  /*
   * Los lotes llegaron después. Una copia de seguridad de antes no los trae, y
   * exigirlos dejaría al ganadero sin poder restaurarla: se dan por vacíos.
   */
  if (object(v) && v.lotes === undefined) v.lotes = [];
  if (
    !object(v) ||
    !(v.farm === null || isFarm(v.farm)) ||
    !arrayOf(v.animals, isAnimal) ||
    !arrayOf(v.invoices, isInvoice) ||
    !isSaleTemplate(v.saleTemplate) ||
    !arrayOf(v.milkRecords, isMilk) ||
    !arrayOf(v.weightRecords, isWeight) ||
    !arrayOf(v.lotes, isLote)
  )
    return false;
  const animals = v.animals;
  const milk = v.milkRecords;
  const ids = new Set(animals.map(a => a.id));
  return (
    [animals, v.invoices, v.milkRecords, v.weightRecords, v.lotes].every(uniqueIds) &&
    // Un lote que cita animales que ya no existen no se puede volver a abrir.
    v.lotes.every(l => l.animalIds.every(id => ids.has(id))) &&
    new Set(animals.map(a => a.crotal.trim().toUpperCase())).size === animals.length &&
    animals.every(a => a.criasAsociadas.every(id => id !== a.id && ids.has(id))) &&
    v.weightRecords.every(r => ids.has(r.animalId)) &&
    v.milkRecords.every(r => !r.animalId || ids.has(r.animalId)) &&
    new Set(v.weightRecords.map(r => r.animalId + ':' + r.fecha)).size === v.weightRecords.length &&
    new Set(v.milkRecords.map(r => [r.fecha, r.ordeno ?? 1, r.animalId ?? ''].join(':'))).size ===
      v.milkRecords.length &&
    milk.every(
      r =>
        !milk.some(
          other =>
            other.fecha === r.fecha &&
            (other.ordeno ?? 1) === (r.ordeno ?? 1) &&
            !!other.animalId !== !!r.animalId
        )
    )
  );
}
export function parseBackup(value: unknown): Backup {
  if (
    !object(value) ||
    value.format !== 'chaparra' ||
    value.version !== 2 ||
    !str(value.exportedAt) ||
    !object(value.account) ||
    !nonempty(value.account.nombre) ||
    !str(value.account.email) ||
    !isFarmData(value.data) ||
    !value.data.farm
  )
    throw new Error(
      'La copia no es válida: debe ser un JSON de Chaparra v2 con fechas, importes y relaciones coherentes. No se ha modificado ningún dato.'
    );
  return {
    format: 'chaparra',
    version: 2,
    exportedAt: value.exportedAt,
    account: { nombre: value.account.nombre, email: value.account.email },
    data: value.data
  };
}
