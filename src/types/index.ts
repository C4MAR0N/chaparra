export type Especie = 'Vacuno' | 'Ovino' | 'Caprino' | 'Porcino' | 'Equino' | 'Avicola' | 'Otro';
export type Orientacion = 'Carne' | 'Leche' | 'Mixto';
export type EstadoSanitario =
  'Sano' | 'En tratamiento' | 'En cuarentena' | 'Vacunado' | 'Observación';
export type SexoAnimal = 'Hembra' | 'Macho';
export interface UserRecord {
  id: string;
  nombre: string;
  email: string;
  passwordHash: string;
  salt: string;
  iterations: number;
  algo: 'PBKDF2-SHA-256';
  createdAt: string;
  onboardingCompletedAt?: string;
}
export interface Session {
  userId: string;
  expiresAt: number;
}
export interface FarmProfile {
  nombreExplotacion: string;
  codigoRega?: string;
  provincia?: string;
  titular: string;
  especies: Especie[];
  orientacionPorEspecie: Partial<Record<Especie, Orientacion>>;
  ordenosPorDia?: 1 | 2 | 3;
  precioLitroLecheEuro?: number;
  precioKgCarneEuro?: number;
  moneda: 'EUR';
}
export interface HealthRecord {
  id: string;
  fecha: string;
  estado: EstadoSanitario;
  notas: string;
  costeEuro: number;
}
export interface Animal {
  id: string;
  crotal: string;
  especie: Especie;
  orientacion: Orientacion;
  ubicacion: string;
  numeroPartos: number;
  fechaNacimiento: string;
  criasAsociadas: string[];
  estadoSanitario: EstadoSanitario;
  notasSanitarias?: string;
  raza: string;
  sexo: SexoAnimal;
  produccionDiariaLitros?: number;
  pesoKg?: number;
  pesoCanalKg?: number;
  precioEstimadoVentaEuro?: number;
  costeAcumuladoEuro?: number;
  fotoUrl?: string;
  fechaUltimoControl?: string;
  activo: boolean;
  motivoBaja?: 'Vendido' | 'Muerto' | 'Sacrificado' | 'Otro';
  fechaAlta: string;
  fechaBaja?: string;
  historialSanitario: HealthRecord[];
}
export interface MilkRecord {
  id: string;
  fecha: string;
  animalId?: string;
  litros: number;
  ordeno?: 1 | 2 | 3;
  notas?: string;
}
export interface WeightRecord {
  id: string;
  fecha: string;
  animalId: string;
  pesoKg: number;
  notas?: string;
}
export type InvoiceCategory =
  | 'Pienso/Alimentación'
  | 'Veterinario/Sanidad'
  | 'Maquinaria/Combustible'
  | 'Venta Ganado'
  | 'Venta Leche'
  | 'Otros';
export interface InvoiceDoc {
  id: string;
  tipo: 'Compra / Gasto' | 'Venta';
  titulo: string;
  fecha: string;
  proveedorOCliente: string;
  importeTotalEuro: number;
  categoria: InvoiceCategory;
  imagenUrl?: string;
  notas?: string;
  crotalesRelacionados?: string[];
  documentoVenta?: SaleInvoiceTemplate;
}
export interface SaleInvoiceItem {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitarioEuro: number;
  subtotalEuro: number;
}
export interface SaleInvoiceTemplate {
  numeroFactura: string;
  fechaEmision: string;
  nombreGanadero: string;
  nifCif: string;
  codigoRega: string;
  direccion: string;
  telefono: string;
  email: string;
  logoUrl?: string;
  clienteNombre: string;
  clienteNif: string;
  clienteDireccion: string;
  items: SaleInvoiceItem[];
  regimen: 'REAGP' | 'General';
  ivaPorcentaje: number;
  irpfPorcentaje: number;
  compensacionPorcentaje: number;
  lugarOperacion: string;
  fechaOperacion: string;
  notasPie?: string;
}
export interface FarmData {
  farm: FarmProfile | null;
  animals: Animal[];
  invoices: InvoiceDoc[];
  saleTemplate: SaleInvoiceTemplate;
  milkRecords: MilkRecord[];
  weightRecords: WeightRecord[];
}
export interface Backup {
  format: 'chaparra';
  version: 2;
  exportedAt: string;
  account: { nombre: string; email: string };
  data: FarmData;
}
