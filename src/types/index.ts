export type TipoGanado = 'Vacuno' | 'Ovino' | 'Caprino' | 'Porcino' | 'Otro';
export type PropositoGanado = 'Carne' | 'Ordeño' | 'Mixto';
export type EstadoSanitario = 'Sano' | 'En tratamiento' | 'En cuarentena' | 'Vacunado' | 'Observación';
export type SexoAnimal = 'Hembra' | 'Macho';

export interface Animal {
  id: string;
  crotal: string; // Ear tag code (e.g. ES091234567890)
  tipoGanado: TipoGanado;
  proposito: PropositoGanado;
  ubicacion: string; // Pasture/Barn location
  numeroPartos: number;
  fechaNacimiento: string; // YYYY-MM-DD
  criasAsociadas: string[]; // List of offspring crotals or IDs
  estadoSanitario: EstadoSanitario;
  notasSanitarias?: string;
  raza: string;
  sexo: SexoAnimal;
  
  // Ordeño specific metrics
  produccionDiariaLitros?: number;
  
  // Carne specific metrics
  pesoKg?: number;
  precioEstimadoVentaEuro?: number;
  costeAcumuladoEuro?: number;
  
  fotoUrl?: string;
  fechaUltimoControl?: string;
}

export interface FarmConfig {
  nombreExplotacion: string;
  codigoRega: string; // Código REGA de la explotación ganadera
  titular: string;
  tipoGanadoPrincipal: TipoGanado;
  propositoPrincipal: PropositoGanado;
  vecesOrdenoDia: number; // 1, 2, 3
  precioPorLitroLecheEuro: number;
  precioEstimadoKgCarneEuro: number;
  moneda: '€';
}

export interface InvoiceDoc {
  id: string;
  tipo: 'Compra / Gasto' | 'Venta';
  titulo: string;
  fecha: string;
  proveedorOCliente: string;
  importeTotalEuro: number;
  categoria: 'Pienso/Alimentación' | 'Veterinario/Sanidad' | 'Maquinaria/Combustible' | 'Venta Ganado' | 'Venta Leche' | 'Otros';
  imagenUrl?: string;
  notas?: string;
  crotalesRelacionados?: string[];
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
  ivaPorcentaje: number;
  irpfPorcentaje: number;
  notasPie?: string;
}
