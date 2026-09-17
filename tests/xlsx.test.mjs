import assert from 'node:assert/strict';
import test from 'node:test';
import { crearLibro } from '../src/lib/xlsx.ts';

const leer = async blob => Buffer.from(await blob.arrayBuffer());

const LIBRO = () =>
  crearLibro([
    {
      name: 'Rebaño',
      columns: [
        { header: 'Crotal', type: 'text' },
        { header: 'Nacimiento', type: 'date' },
        { header: 'Peso', type: 'decimal' },
        { header: 'Valor', type: 'money' },
        { header: 'Partos', type: 'integer' }
      ],
      rows: [
        ['ES09 & "1"', '2023-04-10', 540.5, 1850, 3],
        ['ES092', '', null, undefined, 0]
      ]
    },
    { name: 'Sin datos', columns: [{ header: 'Nada' }], rows: [] }
  ]);

test('genera un ZIP con las piezas que exige el formato xlsx', async () => {
  const bytes = await leer(LIBRO());
  assert.equal(bytes.subarray(0, 4).toString('hex'), '504b0304', 'debe empezar por la firma PK');
  // Firma del registro de fin del directorio central: sin ella no es un ZIP válido.
  assert.ok(bytes.includes(Buffer.from('504b0506', 'hex')), 'falta el directorio central');
  const texto = bytes.toString('latin1');
  for (const pieza of [
    '[Content_Types].xml',
    '_rels/.rels',
    'xl/workbook.xml',
    'xl/_rels/workbook.xml.rels',
    'xl/styles.xml',
    'xl/worksheets/sheet1.xml',
    'xl/worksheets/sheet2.xml'
  ]) {
    assert.ok(texto.includes(pieza), `falta ${pieza}`);
  }
});

test('convierte las fechas a la numeración de Excel', async () => {
  const texto = (await leer(LIBRO())).toString('utf8');
  // 2023-04-10 son 45026 días desde el 30/12/1899, origen que usa Excel.
  assert.ok(texto.includes('<v>45026</v>'), 'la fecha no se convirtió a número de serie');
});

test('escapa el XML en lugar de romper el archivo', async () => {
  const texto = (await leer(LIBRO())).toString('utf8');
  assert.ok(texto.includes('ES09 &amp; &quot;1&quot;'), 'no se escaparon & ni comillas');
  assert.ok(!texto.includes('ES09 & "1"'), 'quedó texto sin escapar');
});

test('omite las celdas vacías y mantiene las hojas sin filas', async () => {
  const texto = (await leer(LIBRO())).toString('utf8');
  // La segunda fila solo declara crotal y partos; el resto va vacío.
  assert.ok(texto.includes('<row r="3">'), 'falta la segunda fila de datos');
  assert.ok(!texto.includes('r="B3"'), 'la fecha vacía no debería generar celda');
  assert.ok(texto.includes('<sheetData><row r="1"'), 'la hoja vacía debe conservar su cabecera');
});

test('respeta los límites de Excel en los nombres de hoja', async () => {
  const blob = crearLibro([
    { name: 'Nombre larguísimo que supera con creces el límite de Excel', columns: [], rows: [] },
    { name: 'Con/barras:y*signos?', columns: [], rows: [] }
  ]);
  const texto = (await leer(blob)).toString('utf8');
  const nombres = [...texto.matchAll(/<sheet name="([^"]+)"/g)].map(m => m[1]);
  assert.equal(nombres.length, 2);
  for (const nombre of nombres) {
    assert.ok(nombre.length <= 31, `"${nombre}" supera los 31 caracteres`);
    assert.ok(!/[[\]:*?/\\]/.test(nombre), `"${nombre}" conserva caracteres prohibidos`);
  }
});
