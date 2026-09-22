import type { Animal, FarmData, FarmProfile, UserRecord } from '../types';
import { crearLibro, type Sheet } from '../lib/xlsx';
import { CATEGORIAS_ANIMAL, especieLabel, tipoLoteLabel } from '../lib/constants';
import { age, today } from '../lib/domain';

/*
 * Exportación a Excel: el papel que el ganadero le da al veterinario o a la
 * administración. Es solo el registro de animales, sin nada productivo ni
 * económico: ni ordeño, ni pesadas, ni facturas, ni importes.
 *
 * No sirve para restaurar la app: para eso está la copia de seguridad en JSON.
 *
 * Se puede exportar la explotación entera o solo un grupo de animales —una
 * manada, lo que haya filtrado en pantalla—. Al acotar, la sanidad se recorta
 * a esos animales: un cuaderno del Pantano con la sanidad de la Virgen dentro
 * no sería un cuaderno del Pantano.
 */

function hojaRebano(data: FarmData): Sheet {
  // La madre se deduce de quién tiene al animal entre sus crías.
  const madres = new Map<string, string>();
  for (const posible of data.animals) {
    for (const cria of posible.criasAsociadas) madres.set(cria, posible.crotal);
  }

  const columns: Sheet['columns'] = [
    { header: 'Crotal', type: 'text' },
    { header: 'Especie', type: 'text' },
    { header: 'Raza', type: 'text' },
    { header: 'Sexo', type: 'text' },
    { header: 'Madre', type: 'text' },
    { header: 'Fecha de nacimiento', type: 'date' },
    { header: 'Edad', type: 'text' },
    { header: 'Ubicación', type: 'text' },
    { header: 'Estado sanitario', type: 'text' },
    { header: 'Partos', type: 'integer' },
    { header: 'Categoría', type: 'text' },
    { header: 'Fecha de alta', type: 'date' },
    { header: 'Fecha de baja', type: 'date' },
    { header: 'Último control', type: 'date' },
    { header: 'Observaciones', type: 'text' }
  ];

  const rows = data.animals.map(animal => [
    animal.crotal,
    especieLabel(animal.especie),
    animal.raza,
    animal.sexo,
    madres.get(animal.id) ?? null,
    animal.fechaNacimiento,
    age(animal.fechaNacimiento),
    animal.ubicacion,
    animal.estadoSanitario,
    animal.numeroPartos,
    animal.categoria,
    animal.fechaAlta,
    animal.fechaBaja ?? null,
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
      { header: 'Notas', type: 'text' }
    ],
    rows
  };
}

/*
 * Una fila por animal y lote, no una fila por lote con los crotales apelotonados
 * en una celda. Así el veterinario puede filtrar por fecha o por tipo en el
 * propio Excel, que es para lo que sirve un Excel.
 */
function hojaLotes(data: FarmData): Sheet {
  const porId = new Map(data.animals.map(a => [a.id, a]));
  const rows = data.lotes
    .flatMap(lote =>
      lote.animalIds.map(id => [
        lote.fecha,
        tipoLoteLabel(lote.tipo),
        porId.get(id)?.crotal ?? null,
        lote.ubicacionDestino ?? null,
        lote.notas ?? null
      ])
    )
    .filter(fila => fila[2] !== null);
  rows.sort(
    (a, b) =>
      String(b[0]).localeCompare(String(a[0])) ||
      String(a[2]).localeCompare(String(b[2]), 'es', { numeric: true })
  );

  return {
    name: 'Lotes',
    columns: [
      { header: 'Fecha', type: 'date' },
      { header: 'Operación', type: 'text' },
      { header: 'Crotal', type: 'text' },
      { header: 'Ubicación de destino', type: 'text' },
      { header: 'Notas', type: 'text' }
    ],
    rows
  };
}

function hojaResumen(user: UserRecord, data: FarmData, farm: FarmProfile, ambito: string): Sheet {
  const filas: [string, string | number][] = [
    ['Explotación', farm.nombreExplotacion],
    ['Contenido de este archivo', ambito],
    ['Titular', farm.titular],
    ['Código REGA', farm.codigoRega || 'Sin indicar'],
    ['Provincia', farm.provincia || 'Sin indicar'],
    ['Especies', farm.especies.map(especieLabel).join(', ')],
    ...CATEGORIAS_ANIMAL.map((categoria): [string, number] => [
      `Animales: ${categoria}`,
      data.animals.filter(a => a.categoria === categoria).length
    ]),
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

export interface AmbitoExcel {
  /** Qué se exporta, tal cual aparece en la hoja Resumen y en el nombre del archivo. */
  etiqueta: string;
  animales: Animal[];
}

/** Recorta la explotación a los animales elegidos, arrastrando lo que cuelga de ellos. */
export function acotar(data: FarmData, animales: Animal[]): FarmData {
  const ids = new Set(animales.map(a => a.id));
  const crotales = new Set(animales.map(a => a.crotal));
  return {
    ...data,
    animals: animales,
    // Un ordeño del rebaño entero no es de ninguna manada en concreto.
    milkRecords: data.milkRecords.filter(r => r.animalId && ids.has(r.animalId)),
    weightRecords: data.weightRecords.filter(r => ids.has(r.animalId)),
    // Las facturas no se llevan por cercado: solo viajan las que citan crotales.
    invoices: data.invoices.filter(f => (f.crotalesRelacionados ?? []).some(c => crotales.has(c))),
    /*
     * De un lote solo viaja la parte que cae dentro de lo exportado. Si se saca
     * el cercado del Pantano, el destete que mezclaba Pantano y Virgen aparece
     * con los corderos del Pantano, no con los de la Virgen.
     */
    lotes: data.lotes
      .map(l => ({ ...l, animalIds: l.animalIds.filter(id => ids.has(id)) }))
      .filter(l => l.animalIds.length)
  };
}

export function descargarExcel(user: UserRecord, data: FarmData, ambito?: AmbitoExcel) {
  const farm = data.farm;
  if (!farm) throw new Error('No hay ninguna explotación configurada.');
  if (ambito && !ambito.animales.length)
    throw new Error('No hay animales en esta selección para exportar.');

  const alcance = ambito ? acotar(data, ambito.animales) : data;
  const etiqueta = ambito ? ambito.etiqueta : 'Explotación completa';

  const hojas: Sheet[] = [hojaResumen(user, alcance, farm, etiqueta), hojaRebano(alcance)];
  if (alcance.animals.some(a => a.historialSanitario.length)) hojas.push(hojaSanidad(alcance));
  if (alcance.lotes.length) hojas.push(hojaLotes(alcance));

  const blob = crearLibro(hojas);
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  const limpio = (texto: string) => texto.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '');
  const nombre = limpio(farm.nombreExplotacion) || 'Chaparra';
  const sufijo = ambito ? '_' + limpio(ambito.etiqueta) : '';
  enlace.download = `${nombre}${sufijo}_${today()}.xlsx`;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
