import type { FarmData, FarmProfile, SaleInvoiceTemplate } from '../types';
import {
  arrayOf,
  isAnimal,
  isFarm,
  isInvoice,
  isLote,
  isMilk,
  isSaleTemplate,
  isWeight
} from '../lib/validation';
import { today } from '../lib/domain';
import { readJson, warnStorage, writeJson, writeBatchJson } from './storage';
export const dataKey = (userId: string, kind: keyof FarmData) => `chaparra:v2:u:${userId}:${kind}`;
export function emptySaleTemplate(farm: FarmProfile | null): SaleInvoiceTemplate {
  return {
    numeroFactura: '',
    fechaEmision: today(),
    nombreGanadero: farm?.titular ?? '',
    nifCif: '',
    codigoRega: farm?.codigoRega ?? '',
    direccion: '',
    telefono: '',
    email: '',
    clienteNombre: '',
    clienteNif: '',
    clienteDireccion: '',
    items: [],
    regimen: 'REAGP',
    ivaPorcentaje: 10,
    compensacionPorcentaje: 10.5,
    irpfPorcentaje: 2,
    lugarOperacion: '',
    fechaOperacion: today(),
    notasPie: ''
  };
}
function read<T>(
  userId: string,
  kind: keyof FarmData,
  check: (v: unknown) => v is T,
  fallback: T
): T {
  const value = readJson(dataKey(userId, kind));
  if (value === null) return fallback;
  if (check(value)) return value;
  warnStorage(
    'Hay un registro local con formato incorrecto. No se ha borrado. Revisa una copia de seguridad antes de sustituirlo.'
  );
  return fallback;
}
export function loadData(userId: string): FarmData {
  const farm = read(userId, 'farm', isFarm, null);
  return {
    farm,
    animals: read(userId, 'animals', (v): v is FarmData['animals'] => arrayOf(v, isAnimal), []),
    invoices: read(userId, 'invoices', (v): v is FarmData['invoices'] => arrayOf(v, isInvoice), []),
    saleTemplate: read(userId, 'saleTemplate', isSaleTemplate, emptySaleTemplate(farm)),
    milkRecords: read(
      userId,
      'milkRecords',
      (v): v is FarmData['milkRecords'] => arrayOf(v, isMilk),
      []
    ),
    weightRecords: read(
      userId,
      'weightRecords',
      (v): v is FarmData['weightRecords'] => arrayOf(v, isWeight),
      []
    ),
    lotes: read(userId, 'lotes', (v): v is FarmData['lotes'] => arrayOf(v, isLote), [])
  };
}
export function saveData<K extends keyof FarmData>(userId: string, kind: K, value: FarmData[K]) {
  return writeJson(dataKey(userId, kind), value);
}
export function replaceData(userId: string, data: FarmData) {
  return writeBatchJson(
    Object.entries(data).map(([kind, value]) => [dataKey(userId, kind as keyof FarmData), value])
  );
}
