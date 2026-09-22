import type {
  CategoriaAnimal,
  Especie,
  EstadoSanitario,
  InvoiceCategory,
  Orientacion,
  TipoLote
} from '../types';
export const ESPECIES: Especie[] = [
  'Vacuno',
  'Ovino',
  'Caprino',
  'Porcino',
  'Equino',
  'Avicola',
  'Otro'
];
/*
 * Solo estas cuatro se pueden elegir de nuevo, en la encuesta y en la ficha.
 * `ESPECIES` conserva las antiguas (Equino, Avícola, Otro) porque una
 * explotación ya guardada con una de ellas tiene que seguir validando.
 */
export const ESPECIES_SELECCIONABLES: Especie[] = ['Vacuno', 'Ovino', 'Caprino', 'Porcino'];
export const ORIENTACIONES: Orientacion[] = ['Carne', 'Leche', 'Mixto'];
/** El porcino de esta app siempre es de carne: no hay porcino de leche ni mixto. */
export const orientacionesDe = (especie: Especie): Orientacion[] =>
  especie === 'Porcino' ? ['Carne'] : ORIENTACIONES;
export const CATEGORIAS_ANIMAL: CategoriaAnimal[] = [
  'Activo',
  'Destetado',
  'Muerto',
  'Nacido muerto',
  'Vendido'
];
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
/*
 * Los cuatro tipos de lote, con lo que hay que enseñar en pantalla. El `efecto`
 * es la frase que el ganadero lee ANTES de confirmar: una venta de diez añojos
 * los da de baja de golpe, y eso tiene que estar dicho con todas las letras.
 */
export const TIPOS_LOTE: {
  tipo: TipoLote;
  titulo: string;
  efecto: string;
}[] = [
  {
    tipo: 'Destete',
    titulo: 'Destete',
    efecto: 'Pasan a «Destetado» y se les pone esa fecha de baja. Dejan de contar como activos.'
  },
  {
    tipo: 'Venta',
    titulo: 'Venta',
    efecto: 'Pasan a «Vendido» y se les pone esa fecha de baja. Dejan de contar como activos.'
  },
  {
    tipo: 'Traslado',
    titulo: 'Traslado de ubicación',
    efecto: 'Se les cambia la ubicación a la de destino. Siguen activos.'
  },
  {
    tipo: 'Baja',
    titulo: 'Baja por muerte',
    efecto: 'Pasan a «Muerto» y se les pone esa fecha de baja. Dejan de contar como activos.'
  }
];
export const tipoLoteLabel = (tipo: TipoLote) =>
  TIPOS_LOTE.find(t => t.tipo === tipo)?.titulo ?? tipo;
