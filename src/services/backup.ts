import type { Backup, FarmData, UserRecord } from '../types';
import { parseBackup } from '../lib/validation';
import { today } from '../lib/domain';
export function createBackup(user: UserRecord, data: FarmData): Backup {
  return {
    format: 'chaparra',
    version: 2,
    exportedAt: new Date().toISOString(),
    account: { nombre: user.nombre, email: user.email },
    data
  };
}
export function downloadBackup(user: UserRecord, data: FarmData) {
  const blob = new Blob([JSON.stringify(createBackup(user, data), null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Chaparra_copia_${today()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function readBackup(file: File): Promise<Backup> {
  if (file.size > 20 * 1024 * 1024) throw new Error('La copia supera el límite de 20 MB.');
  let value: unknown;
  try {
    value = JSON.parse(await file.text()) as unknown;
  } catch {
    throw new Error('El archivo no contiene JSON válido.');
  }
  return parseBackup(value);
}
