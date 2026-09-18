export type Especie = 'Vacuno' | 'Ovino' | 'Caprino' | 'Porcino' | 'Equino' | 'Avicola' | 'Otro';
export type Orientacion = 'Carne' | 'Leche' | 'Mixto';
/*
 * Sustituye a `activo: boolean` + `motivoBaja`. Solo 'Activo' es ganado vivo;
 * 'Nacido muerto' es un parto que no salió adelante y se conserva por el
 * historial de la madre, no porque cuente como animal.
 */
export type CategoriaAnimal = 'Activo' | 'Muerto' | 'Nacido muerto' | 'Vendido';
export type EstadoSanitario =
  'Sano' | 'En tratamiento' | 'En cuarentena' | 'Vacunado' | 'Observación';
export type SexoAnimal = 'Hembra' | 'Macho';
export interface UserRecord {
  id: string;
  nombre: string;
  email: string;
  /*
   * Las cuentas de la nube no guardan contraseña en el dispositivo: la
   * identidad la lleva Supabase y aquí solo queda la sesión. Por eso estos
   * campos son opcionales y solo los tienen las cuentas locales antiguas.
   */
  passwordHash?: string;
  salt?: string;
  iterations?: number;
  algo?: 'PBKDF2-SHA-256';
  /** 'nube' si la identidad la gestiona el servidor. */
  origen?: 'local' | 'nube';
  createdAt: string;
  onboardingCompletedAt?: string;
}
export interface Session {
  userId: string;
  expiresAt: number;
}
export interface Municipio {
  nombre: string;
  provincia: string;
  lat: number;
  lon: number;
  /** Código INE de 5 dígitos, el que usa AEMET para la predicción municipal. */
  codigoIne?: string;
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
  /** Municipio para la previsión meteorológica. */
  municipio?: Municipio;
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
  categoria: CategoriaAnimal;
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
