import type { FarmData, FarmProfile, UserRecord } from '../types';
import { crearLibro, type Sheet } from '../lib/xlsx';
import { especieLabel } from '../lib/constants';
import { accumulatedCost, age, hasMeat, hasMilk, today } from '../lib/domain';

/*
 * Exportación a Excel: pensada para consultar, filtrar y llevar los datos al
 * gestor o al veterinario. Cada hoja lleva la fila de títulos congelada y con
 * filtros, y solo se incluyen las hojas que tienen sentido según la orientación
 * declarada en la encuesta.
 *
 * No sirve para restaurar la app: para eso está la copia de seguridad en JSON.
 */

const crotalPorId = (data: FarmData) => {
  const mapa = new Map<string, string>();
  for (const animal of data.animals) mapa.set(animal.id, animal.crotal);
  return mapa;
};

function hojaRebano(data: FarmData, farm: FarmProfile): Sheet {
  const leche = hasMilk(farm);
  const carne = hasMeat(farm);

  const columns: Sheet['columns'] = [
    { header: 'Crotal', type: 'text' },
    { header: 'Especie', type: 'text' },
    { header: 'Raza', type: 'text' },
    { header: 'Sexo', type: 'text' },
    { header: 'Fecha de nacimiento', type: 'date' },
    { header: 'Edad', type: 'text' },
    { header: 'Ubicación', type: 'text' },
    { header: 'Estado sanitario', type: 'text' },
    { header: 'Partos', type: 'integer' },
    { header: 'Situación', type: 'text' },
    ...(leche ? ([{ header: 'Litros/día', type: 'decimal' }] as const) : []),
    ...(carne
      ? ([
          { header: 'Peso vivo (kg)', type: 'decimal' },
          { header: 'Valor estimado', type: 'money' }
        ] as const)
      : []),
    { header: 'Coste acumulado', type: 'money' },
    { header: 'Último control', type: 'date' },
    { header: 'Observaciones', type: 'text' }
  ];

  const rows = data.animals.map(animal => [
    animal.crotal,
    especieLabel(animal.especie),
    animal.raza,
    animal.sexo,
    animal.fechaNacimiento,
    age(animal.fechaNacimiento),
    animal.ubicacion,
    animal.estadoSanitario,
    animal.numeroPartos,
    animal.activo ? 'Activo' : `Baja${animal.motivoBaja ? ` · ${animal.motivoBaja}` : ''}`,
    ...(leche ? [animal.produccionDiariaLitros ?? null] : []),
    ...(carne ? [animal.pesoKg ?? null, animal.precioEstimadoVentaEuro ?? null] : []),
    accumulatedCost(animal),
    animal.fechaUltimoControl ?? null,
    animal.notasSanitarias ?? null
  ]);

  return { name: 'Rebaño', columns, rows };
}

function hojaSanidad(data: FarmData): Sheet {
  const rows = data.animals.flatMap(animal =>
    animal.historialSanitario.map(registro => [
      registro.fecha,
      animal.crotal,
      registro.estado,
      registro.costeEuro,
      registro.notas
    ])
  );
  rows.sort((a, b) => String(b[0]).localeCompare(String(a[0])));

  return {
    name: 'Sanidad',
    columns: [
      { header: 'Fecha', type: 'date' },
      { header: 'Crotal', type: 'text' },
      { header: 'Estado', type: 'text' },
      { header: 'Coste', type: 'money' },
      { header: 'Notas', type: 'text' }
    ],
    rows
  };
}

function hojaOrdeno(data: FarmData, farm: FarmProfile): Sheet {
  const crotales = crotalPorId(data);
  const precio = farm.precioLitroLecheEuro ?? 0;
  const rows = [...data.milkRecords]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map(registro => [
      registro.fecha,
      registro.animalId ? (crotales.get(registro.animalId) ?? '') : 'Total del rebaño',
      registro.ordeno ?? null,
      registro.litros,
      registro.litros * precio,
      registro.notas ?? null
    ]);

  return {
    name: 'Ordeño',
    columns: [
      { header: 'Fecha', type: 'date' },
      { header: 'Animal', type: 'text' },
      { header: 'Ordeño', type: 'integer' },
      { header: 'Litros', type: 'decimal' },
      { header: 'Ingreso estimado', type: 'money' },
      { header: 'Notas', type: 'text' }
    ],
    rows
  };
}

function hojaPesadas(data: FarmData): Sheet {
  const crotales = crotalPorId(data);
  const rows = [...data.weightRecords]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map(registro => [
      registro.fecha,
      crotales.get(registro.animalId) ?? '',
      registro.pesoKg,
      registro.notas ?? null
    ]);

  return {
    name: 'Pesadas',
    columns: [
      { header: 'Fecha', type: 'date' },
      { header: 'Crotal', type: 'text' },
      { header: 'Peso (kg)', type: 'decimal' },
      { header: 'Notas', type: 'text' }
    ],
    rows
  };
}

function hojaFacturas(data: FarmData): Sheet {
  const rows = [...data.invoices]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map(factura => [
      factura.fecha,
      factura.tipo,
      factura.categoria,
      factura.titulo,
      factura.proveedorOCliente,
      // Los gastos en negativo, para que la suma de la columna dé el balance.
      factura.tipo === 'Venta' ? factura.importeTotalEuro : -factura.importeTotalEuro,
      (factura.crotalesRelacionados ?? []).join(', ') || null,
      factura.notas ?? null
    ]);

  return {
    name: 'Facturas',
    columns: [
      { header: 'Fecha', type: 'date' },
      { header: 'Tipo', type: 'text' },
      { header: 'Categoría', type: 'text' },
      { header: 'Concepto', type: 'text' },
      { header: 'Proveedor o cliente', type: 'text' },
      { header: 'Importe', type: 'money' },
      { header: 'Crotales', type: 'text' },
      { header: 'Notas', type: 'text' }
    ],
    rows
  };
}

function hojaResumen(user: UserRecord, data: FarmData, farm: FarmProfile): Sheet {
  const activos = data.animals.filter(a => a.activo);
  const ingresos = data.invoices
    .filter(f => f.tipo === 'Venta')
    .reduce((suma, f) => suma + f.importeTotalEuro, 0);
  const gastos = data.invoices
    .filter(f => f.tipo !== 'Venta')
    .reduce((suma, f) => suma + f.importeTotalEuro, 0);

  const filas: [string, string | number][] = [
    ['Explotación', farm.nombreExplotacion],
    ['Titular', farm.titular],
    ['Código REGA', farm.codigoRega || 'Sin indicar'],
    ['Provincia', farm.provincia || 'Sin indicar'],
    ['Especies', farm.especies.map(especieLabel).join(', ')],
    ['Animales activos', activos.length],
    ['Animales de baja', data.animals.length - activos.length],
    ['Facturas registradas', data.invoices.length],
    ['Ingresos acumulados', ingresos],
    ['Gastos acumulados', gastos],
    ['Balance', ingresos - gastos],
    ['Exportado por', `${user.nombre} (${user.email})`],
    ['Fecha de exportación', today()]
  ];

  return {
    name: 'Resumen',
    columns: [
      { header: 'Dato', type: 'text', width: 26 },
      { header: 'Valor', type: 'text', width: 46 }
    ],
    rows: filas.map(([etiqueta, valor]) => [etiqueta, valor])
  };
}

export function descargarExcel(user: UserRecord, data: FarmData) {
  const farm = data.farm;
  if (!farm) throw new Error('No hay ninguna explotación configurada.');

  const hojas: Sheet[] = [hojaResumen(user, data, farm), hojaRebano(data, farm)];
  if (data.animals.some(a => a.historialSanitario.length)) hojas.push(hojaSanidad(data));
  if (hasMilk(farm)) hojas.push(hojaOrdeno(data, farm));
  if (hasMeat(farm)) hojas.push(hojaPesadas(data));
  hojas.push(hojaFacturas(data));

  const blob = crearLibro(hojas);
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  const nombre = farm.nombreExplotacion.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '');
  enlace.download = `${nombre || 'Chaparra'}_${today()}.xlsx`;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
