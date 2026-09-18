/*
 * Explotación de demostración para las capturas de las tiendas.
 *
 * Inventada de arriba abajo, y a propósito: las imágenes de una ficha pública
 * no pueden enseñar los crotales, los proveedores ni las cuentas de una
 * explotación real. Los crotales tienen formato verosímil pero no existen.
 */

const CERCADOS = ['Cercado del Roble', 'Cercado del Arroyo'];

/*
 * Todas las fechas se calculan hacia atrás desde hoy. Fijarlas en el calendario
 * haría que las capturas envejecieran solas: la aplicación rechaza un ordeño con
 * fecha futura, y un gráfico de «los últimos doce meses» se queda vacío en
 * cuanto pasa un año.
 */
const HOY = new Date();
const iso = d => d.toISOString().slice(0, 10);
const haceDias = n => iso(new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate() - n));
const haceMeses = (n, dia = 12) => iso(new Date(HOY.getFullYear(), HOY.getMonth() - n, dia));
const haceAnos = (n, mes = 3, dia = 14) => iso(new Date(HOY.getFullYear() - n, mes, dia));

const animal = (n, extra) => ({
  id: `demo-animal-${n}`,
  crotal: `ES${String(940000000000 + n * 137).padStart(12, '0')}`,
  especie: 'Vacuno',
  orientacion: 'Mixto',
  ubicacion: CERCADOS[n % 2],
  numeroPartos: 0,
  fechaNacimiento: haceAnos(4),
  criasAsociadas: [],
  estadoSanitario: 'Sano',
  raza: 'Avileña-Negra Ibérica',
  sexo: 'Hembra',
  categoria: 'Activo',
  fechaAlta: haceMeses(10),
  historialSanitario: [],
  ...extra
});

const animales = [
  animal(1, {
    raza: 'Avileña-Negra Ibérica',
    fechaNacimiento: haceAnos(8),
    fechaAlta: haceMeses(11, 2),
    numeroPartos: 4,
    produccionDiariaLitros: 11.5,
    pesoKg: 540,
    fechaUltimoControl: haceDias(20),
    historialSanitario: [
      {
        id: 'demo-h1',
        fecha: haceDias(20),
        estado: 'Vacunado',
        notas: 'Vacunación anual y revisión de pezuñas.',
        costeEuro: 24
      },
      {
        id: 'demo-h2',
        fecha: haceMeses(6, 11),
        estado: 'Sano',
        notas: 'Saneamiento oficial: sin incidencias.',
        costeEuro: 0
      }
    ]
  }),
  animal(2, { fechaNacimiento: haceAnos(7, 4, 2), fechaAlta: haceMeses(10, 19), numeroPartos: 3 }),
  animal(3, {
    fechaNacimiento: haceAnos(5, 1, 20),
    fechaAlta: haceMeses(8, 8),
    estadoSanitario: 'En tratamiento',
    notasSanitarias: 'Mastitis en cuarto trasero derecho. Tratamiento hasta el viernes.'
  }),
  animal(4, {
    sexo: 'Macho',
    raza: 'Limusina',
    fechaNacimiento: haceAnos(5, 8, 30),
    fechaAlta: haceMeses(7, 14),
    pesoKg: 690
  }),
  animal(5, {
    fechaNacimiento: haceAnos(4, 3, 17),
    fechaAlta: haceMeses(6, 5),
    estadoSanitario: 'Vacunado'
  }),
  animal(6, { fechaNacimiento: haceAnos(4, 5, 9), fechaAlta: haceMeses(6, 22), numeroPartos: 1 }),
  animal(7, {
    sexo: 'Macho',
    raza: 'Limusina',
    fechaNacimiento: haceAnos(3, 0, 25),
    fechaAlta: haceMeses(5, 11)
  }),
  animal(8, {
    fechaNacimiento: haceAnos(3, 6, 3),
    fechaAlta: haceMeses(4, 6),
    estadoSanitario: 'Vacunado'
  }),
  animal(9, { fechaNacimiento: haceAnos(2, 1, 12), fechaAlta: haceMeses(3, 18) }),
  animal(10, { sexo: 'Macho', fechaNacimiento: haceAnos(2, 7, 21), fechaAlta: haceMeses(2, 9) }),
  animal(11, { fechaNacimiento: haceAnos(1, 2, 4), fechaAlta: haceMeses(1, 2) }),
  animal(12, { fechaNacimiento: haceMeses(10, 16), fechaAlta: haceDias(9), raza: 'Limusina' })
];

/* Ordeños repartidos por meses: un gráfico con un solo punto no enseña nada.
 * Nunca pasan de ayer, porque la aplicación rechaza una fecha futura. */
const ordenos = [];
for (let mes = 6; mes >= 0; mes--) {
  for (const dia of [4, 11, 18, 25]) {
    const fecha = haceMeses(mes, dia);
    if (fecha >= iso(HOY)) continue;
    ordenos.push({
      id: `demo-ordeno-${mes}-${dia}`,
      fecha,
      litros: 108 + (6 - mes) * 5 + (dia % 7) * 3,
      ordeno: 1
    });
  }
}

const pesadas = [
  { id: 'demo-p1', fecha: haceMeses(3, 14), animalId: 'demo-animal-4', pesoKg: 615 },
  { id: 'demo-p2', fecha: haceMeses(2, 19), animalId: 'demo-animal-4', pesoKg: 652 },
  { id: 'demo-p3', fecha: haceDias(18), animalId: 'demo-animal-4', pesoKg: 690 },
  { id: 'demo-p4', fecha: haceDias(18), animalId: 'demo-animal-7', pesoKg: 430 }
];

const facturas = [
  {
    id: 'demo-f1',
    tipo: 'Compra / Gasto',
    titulo: 'Pienso de vacuno nodriza',
    fecha: haceDias(5),
    proveedorOCliente: 'Proveedor de ejemplo',
    importeTotalEuro: 825,
    categoria: 'Pienso/Alimentación',
    notas: ''
  },
  {
    id: 'demo-f2',
    tipo: 'Compra / Gasto',
    titulo: 'Saneamiento y vacunación',
    fecha: haceDias(20),
    proveedorOCliente: 'Veterinario de ejemplo',
    importeTotalEuro: 360,
    categoria: 'Veterinario/Sanidad',
    notas: ''
  },
  {
    id: 'demo-f3',
    tipo: 'Compra / Gasto',
    titulo: 'Gasóleo B agrícola',
    fecha: haceDias(44),
    proveedorOCliente: 'Suministros de ejemplo',
    importeTotalEuro: 412.5,
    categoria: 'Maquinaria/Combustible',
    notas: ''
  },
  {
    id: 'demo-f4',
    tipo: 'Venta',
    titulo: 'Venta de dos añojos',
    fecha: haceDias(58),
    proveedorOCliente: 'Cliente de ejemplo',
    importeTotalEuro: 2480,
    categoria: 'Venta Ganado',
    notas: ''
  }
];

export const explotacionDemo = {
  farm: {
    nombreExplotacion: 'Dehesa La Encina',
    codigoRega: 'ES000000000000',
    provincia: 'Cáceres',
    titular: 'Ganadería de Prueba',
    especies: ['Vacuno'],
    orientacionPorEspecie: { Vacuno: 'Mixto' },
    ordenosPorDia: 1,
    precioLitroLecheEuro: 0.42,
    precioKgCarneEuro: 5.4,
    municipio: { nombre: 'Trujillo', provincia: 'Cáceres', lat: 39.4585, lon: -5.8822 },
    moneda: 'EUR'
  },
  animals: animales,
  invoices: facturas,
  saleTemplate: {
    numeroFactura: '',
    fechaEmision: iso(HOY),
    nombreGanadero: 'Ganadería de Prueba',
    nifCif: '',
    codigoRega: 'ES000000000000',
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
    fechaOperacion: iso(HOY),
    notasPie: ''
  },
  milkRecords: ordenos,
  weightRecords: pesadas
};

export const usuarioDemo = {
  id: 'demo-tiendas',
  nombre: 'Ganadería de Prueba',
  email: 'demo@ejemplo.es',
  origen: 'nube',
  createdAt: '2025-10-01T09:00:00.000Z',
  onboardingCompletedAt: '2025-10-01T09:05:00.000Z'
};

/** Justificante inventado para la captura del lector: sin logotipos ni datos reales. */
export const facturaDemoPdf = [
  'Proveedor de ejemplo S.L.',
  'CIF B00000000',
  '',
  'FACTURA N 2026/1184',
  `Fecha: ${haceDias(5).split('-').reverse().join('/')}`,
  '',
  'Pienso vacuno nodriza      2.000 kg',
  '',
  'Base imponible                  750,00',
  'IVA 10%                          75,00',
  'TOTAL A PAGAR                   825,00'
];
