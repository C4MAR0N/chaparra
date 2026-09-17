/*
 * Generador mínimo de archivos .xlsx, sin dependencias.
 *
 * Un .xlsx es un ZIP con varios XML dentro. Se escribe aquí a mano en lugar de
 * usar la librería `xlsx` de npm, que lleva años sin actualizarse en el registro
 * y arrastra vulnerabilidades conocidas.
 *
 * Las entradas del ZIP se guardan sin comprimir (método 0). Para unas cuantas
 * miles de filas el archivo sigue siendo pequeño y el código, mucho más corto y
 * fácil de revisar.
 */

export type ColumnType = 'text' | 'date' | 'money' | 'decimal' | 'integer';

export interface Column {
  header: string;
  /** Ancho en caracteres. Por defecto se calcula a partir del contenido. */
  width?: number;
  type?: ColumnType;
}

export type CellValue = string | number | null | undefined;

export interface Sheet {
  name: string;
  columns: Column[];
  rows: CellValue[][];
}

const ESTILOS: Record<ColumnType, number> = {
  text: 0,
  date: 2,
  money: 3,
  decimal: 4,
  integer: 5
};

const CRC_TABLE = (() => {
  const tabla = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[i] = c >>> 0;
  }
  return tabla;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const codificar = (texto: string) => new TextEncoder().encode(texto);

/*
 * Excel rechaza los caracteres de control salvo tabulador y salto de línea. Se
 * construye desde texto escapado a propósito: escritos directos en la expresión
 * regular acabarían como bytes de control invisibles en este archivo.
 */
const CARACTERES_DE_CONTROL = new RegExp('[\u0000-\u0008\u000B\u000C\u000E-\u001F]', 'g');

function escaparXml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(CARACTERES_DE_CONTROL, '');
}

function letraColumna(indice: number): string {
  let n = indice + 1;
  let letras = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    letras = String.fromCharCode(65 + resto) + letras;
    n = Math.floor((n - 1) / 26);
  }
  return letras;
}

/** Excel cuenta los días desde el 30/12/1899. */
function fechaASerie(valor: string): number | null {
  const coincide = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
  if (!coincide) return null;
  const [, anio, mes, dia] = coincide;
  const ms = Date.UTC(Number(anio), Number(mes) - 1, Number(dia));
  if (Number.isNaN(ms)) return null;
  return Math.round(ms / 86400000) + 25569;
}

/** Excel limita los nombres de hoja a 31 caracteres y prohíbe []:*?/\ */
function nombreHojaValido(nombre: string, indice: number): string {
  const limpio = nombre
    .replace(/[[\]:*?/\\]/g, ' ')
    .trim()
    .slice(0, 31);
  return limpio || `Hoja${indice + 1}`;
}

function celda(fila: number, columna: number, valor: CellValue, tipo: ColumnType): string {
  const ref = `${letraColumna(columna)}${fila}`;
  if (valor === null || valor === undefined || valor === '') return '';

  if (tipo === 'date' && typeof valor === 'string') {
    const serie = fechaASerie(valor);
    if (serie !== null) return `<c r="${ref}" s="${ESTILOS.date}"><v>${serie}</v></c>`;
  }

  if (tipo !== 'text' && tipo !== 'date') {
    const numero = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
    if (Number.isFinite(numero)) {
      return `<c r="${ref}" s="${ESTILOS[tipo]}"><v>${numero}</v></c>`;
    }
  }

  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return `<c r="${ref}"><v>${valor}</v></c>`;
  }

  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escaparXml(String(valor))}</t></is></c>`;
}

function anchoAutomatico(columna: Column, rows: CellValue[][], indice: number): number {
  let maximo = columna.header.length;
  for (const fila of rows) {
    const valor = fila[indice];
    if (valor === null || valor === undefined) continue;
    maximo = Math.max(maximo, String(valor).length);
  }
  return Math.min(Math.max(maximo + 2, 9), 48);
}

function hojaXml(sheet: Sheet): string {
  const anchos = sheet.columns
    .map((columna, i) => {
      const ancho = columna.width ?? anchoAutomatico(columna, sheet.rows, i);
      return `<col min="${i + 1}" max="${i + 1}" width="${ancho}" customWidth="1"/>`;
    })
    .join('');

  const cabecera = sheet.columns
    .map(
      (columna, i) =>
        `<c r="${letraColumna(i)}1" s="1" t="inlineStr"><is><t>${escaparXml(columna.header)}</t></is></c>`
    )
    .join('');

  const cuerpo = sheet.rows
    .map((fila, f) => {
      const numeroFila = f + 2;
      const celdas = sheet.columns
        .map((columna, c) => celda(numeroFila, c, fila[c], columna.type ?? 'text'))
        .join('');
      return `<row r="${numeroFila}">${celdas}</row>`;
    })
    .join('');

  const ultimaColumna = letraColumna(Math.max(sheet.columns.length - 1, 0));
  const ultimaFila = sheet.rows.length + 1;

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetPr><outlinePr summaryBelow="1" summaryRight="1"/></sheetPr>` +
    // Congela la fila de títulos para que no se pierda al bajar por la hoja.
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    `<cols>${anchos}</cols>` +
    `<sheetData><row r="1" ht="22" customHeight="1">${cabecera}</row>${cuerpo}</sheetData>` +
    // Filtros en la fila de títulos: el ganadero puede ordenar y filtrar directamente.
    (sheet.rows.length ? `<autoFilter ref="A1:${ultimaColumna}${ultimaFila}"/>` : '') +
    `</worksheet>`
  );
}

const ESTILOS_XML =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<numFmts count="3">` +
  `<numFmt numFmtId="164" formatCode="dd/mm/yyyy"/>` +
  `<numFmt numFmtId="165" formatCode="#,##0.00\\ &quot;€&quot;"/>` +
  `<numFmt numFmtId="166" formatCode="#,##0.0"/>` +
  `</numFmts>` +
  `<fonts count="2">` +
  `<font><sz val="11"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
  `</fonts>` +
  `<fills count="3">` +
  `<fill><patternFill patternType="none"/></fill>` +
  `<fill><patternFill patternType="gray125"/></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FF1F4A33"/><bgColor indexed="64"/></patternFill></fill>` +
  `</fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="6">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
  `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `</cellXfs>` +
  // Excel y otras herramientas esperan un estilo "Normal" declarado.
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`;

function construirZip(archivos: { nombre: string; contenido: string }[]): Blob {
  const ahora = new Date();
  const hora =
    (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | Math.floor(ahora.getSeconds() / 2);
  const fecha =
    ((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate();

  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let desplazamiento = 0;

  for (const archivo of archivos) {
    const nombre = codificar(archivo.nombre);
    const datos = codificar(archivo.contenido);
    const crc = crc32(datos);

    const cabeceraLocal = new DataView(new ArrayBuffer(30));
    cabeceraLocal.setUint32(0, 0x04034b50, true);
    cabeceraLocal.setUint16(4, 20, true);
    cabeceraLocal.setUint16(6, 0x0800, true); // nombres en UTF-8
    cabeceraLocal.setUint16(8, 0, true); // sin compresión
    cabeceraLocal.setUint16(10, hora, true);
    cabeceraLocal.setUint16(12, fecha, true);
    cabeceraLocal.setUint32(14, crc, true);
    cabeceraLocal.setUint32(18, datos.length, true);
    cabeceraLocal.setUint32(22, datos.length, true);
    cabeceraLocal.setUint16(26, nombre.length, true);
    cabeceraLocal.setUint16(28, 0, true);

    partes.push(new Uint8Array(cabeceraLocal.buffer), nombre, datos);

    const cabeceraCentral = new DataView(new ArrayBuffer(46));
    cabeceraCentral.setUint32(0, 0x02014b50, true);
    cabeceraCentral.setUint16(4, 20, true);
    cabeceraCentral.setUint16(6, 20, true);
    cabeceraCentral.setUint16(8, 0x0800, true);
    cabeceraCentral.setUint16(10, 0, true);
    cabeceraCentral.setUint16(12, hora, true);
    cabeceraCentral.setUint16(14, fecha, true);
    cabeceraCentral.setUint32(16, crc, true);
    cabeceraCentral.setUint32(20, datos.length, true);
    cabeceraCentral.setUint32(24, datos.length, true);
    cabeceraCentral.setUint16(28, nombre.length, true);
    // Desplazamiento de la cabecera local de esta entrada dentro del archivo.
    cabeceraCentral.setUint32(42, desplazamiento, true);

    central.push(new Uint8Array(cabeceraCentral.buffer), nombre);
    desplazamiento += 30 + nombre.length + datos.length;
  }

  const tamanoCentral = central.reduce((suma, p) => suma + p.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, archivos.length, true);
  fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamanoCentral, true);
  fin.setUint32(16, desplazamiento, true);

  const bloques = [...partes, ...central, new Uint8Array(fin.buffer)];
  const total = bloques.reduce((suma, b) => suma + b.length, 0);
  const salida = new Uint8Array(total);
  let posicion = 0;
  for (const bloque of bloques) {
    salida.set(bloque, posicion);
    posicion += bloque.length;
  }

  return new Blob([salida], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

export function crearLibro(sheets: Sheet[]): Blob {
  const utiles = sheets.length ? sheets : [{ name: 'Hoja1', columns: [], rows: [] }];
  const nombres = utiles.map((hoja, i) => nombreHojaValido(hoja.name, i));

  const hojasWorkbook = nombres
    .map(
      (nombre, i) => `<sheet name="${escaparXml(nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
    )
    .join('');

  const relacionesHojas = nombres
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
    )
    .join('');

  const tiposHojas = nombres
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join('');

  const archivos = [
    {
      nombre: '[Content_Types].xml',
      contenido:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        tiposHojas +
        `</Types>`
    },
    {
      nombre: '_rels/.rels',
      contenido:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`
    },
    {
      nombre: 'xl/workbook.xml',
      contenido:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets>${hojasWorkbook}</sheets>` +
        `</workbook>`
    },
    {
      nombre: 'xl/_rels/workbook.xml.rels',
      contenido:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        relacionesHojas +
        `<Relationship Id="rId${nombres.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        `</Relationships>`
    },
    { nombre: 'xl/styles.xml', contenido: ESTILOS_XML },
    ...utiles.map((hoja, i) => ({
      nombre: `xl/worksheets/sheet${i + 1}.xml`,
      contenido: hojaXml(hoja)
    }))
  ];

  return construirZip(archivos);
}
