import type { Especie, EstadoSanitario, InvoiceCategory, Orientacion } from '../types';
export const ESPECIES: Especie[] = [
  'Vacuno',
  'Ovino',
  'Caprino',
  'Porcino',
  'Equino',
  'Avicola',
  'Otro'
];
export const ORIENTACIONES: Orientacion[] = ['Carne', 'Leche', 'Mixto'];
export const ESTADOS: EstadoSanitario[] = [
  'Sano',
  'En tratamiento',
  'En cuarentena',
  'Vacunado',
  'Observación'
];
/*
 * Los tres estados que significan «este animal necesita que vayas a verlo».
 * Vacunado y Sano son anotaciones del historial, no avisos.
 */
export const ESTADOS_ATENCION: EstadoSanitario[] = [
  'En tratamiento',
  'En cuarentena',
  'Observación'
];
export const CATEGORIAS: InvoiceCategory[] = [
  'Pienso/Alimentación',
  'Veterinario/Sanidad',
  'Maquinaria/Combustible',
  'Venta Ganado',
  'Venta Leche',
  'Otros'
];
export const PROVINCIAS = [
  'A Coruña',
  'Álava',
  'Albacete',
  'Alicante',
  'Almería',
  'Asturias',
  'Ávila',
  'Badajoz',
  'Barcelona',
  'Bizkaia',
  'Burgos',
  'Cáceres',
  'Cádiz',
  'Cantabria',
  'Castellón',
  'Ciudad Real',
  'Córdoba',
  'Cuenca',
  'Gipuzkoa',
  'Girona',
  'Granada',
  'Guadalajara',
  'Huelva',
  'Huesca',
  'Illes Balears',
  'Jaén',
  'La Rioja',
  'Las Palmas',
  'León',
  'Lleida',
  'Lugo',
  'Madrid',
  'Málaga',
  'Murcia',
  'Navarra',
  'Ourense',
  'Palencia',
  'Pontevedra',
  'Salamanca',
  'Santa Cruz de Tenerife',
  'Segovia',
  'Sevilla',
  'Soria',
  'Tarragona',
  'Teruel',
  'Toledo',
  'Valencia',
  'Valladolid',
  'Zamora',
  'Zaragoza'
];
export const especieLabel = (especie: Especie) => (especie === 'Avicola' ? 'Avícola' : especie);
