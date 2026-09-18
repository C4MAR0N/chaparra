import workerPdf from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

/*
 * Sacar el texto de un justificante para poder proponer los datos de la factura.
 *
 * Todo ocurre en el dispositivo. Ni la foto ni el PDF salen del móvil: leerlos
 * en un servidor sería más preciso, pero significaría mandar las cuentas del
 * ganadero a un tercero, y eso no se hace sin motivo.
 *
 * Tres caminos, del bueno al malo:
 *   1. PDF con texto dentro (el que llega por correo) -> se lee exacto.
 *   2. Foto, con el lector de textos del propio sistema -> gratis e inmediato,
 *      pero solo lo tienen algunos navegadores, sobre todo en Android.
 *   3. Foto, con Tesseract -> funciona en todas partes, pero hay que descargar
 *      el motor la primera vez y acierta menos con un papel arrugado.
 */

export type Progreso = (paso: string) => void;

/** Más páginas que esto en una factura de campo es un listado, no una factura. */
const MAX_PAGINAS = 5;
/** Con menos texto que esto, el PDF es un escaneo: hay que pasarlo por el lector. */
const MINIMO_TEXTO = 40;
/*
 * Por debajo de esta confianza del lector no se propone nada. Tesseract la da
 * de 0 a 100 y con una foto legible ronda el 90; cuando baja de aquí, lo que
 * devuelve ya no son erratas sueltas sino cifras distintas de las del papel.
 */
const CONFIANZA_MINIMA = 70;
/** Ancho al que se rasteriza un PDF escaneado: por debajo, el lector no acierta. */
const ANCHO_OCR = 2000;

export const esPdf = (dataUrl: string) => dataUrl.startsWith('data:application/pdf');

function bytesDe(dataUrl: string): Uint8Array {
  const binario = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes = new Uint8Array(binario.length);
  for (let n = 0; n < binario.length; n++) bytes[n] = binario.charCodeAt(n);
  return bytes;
}

async function abrirPdf(dataUrl: string) {
  /* pdf.js 4 da por hecho `Promise.withResolvers`, que Safari no tuvo hasta
   * 17.4. Sin este apaño, en un iPhone de hace dos años no abre nada. */
  const P = Promise as unknown as { withResolvers?: unknown };
  if (typeof P.withResolvers !== 'function') {
    P.withResolvers = function <T>() {
      let resolve!: (value: T) => void, reject!: (motivo?: unknown) => void;
      const promise = new Promise<T>((s, n) => {
        resolve = s;
        reject = n;
      });
      return { promise, resolve, reject };
    };
  }
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = workerPdf;
  return pdfjs.getDocument({ data: bytesDe(dataUrl), isEvalSupported: false }).promise;
}

async function textoDelPdf(dataUrl: string, avisar: Progreso) {
  avisar('Abriendo el PDF…');
  const doc = await abrirPdf(dataUrl);
  const paginas = Math.min(doc.numPages, MAX_PAGINAS);
  const trozos: string[] = [];
  for (let n = 1; n <= paginas; n++) {
    const pagina = await doc.getPage(n);
    const contenido = await pagina.getTextContent();
    /* Los fragmentos vienen sueltos y sin saltos de línea. `hasEOL` marca dónde
     * acababa cada renglón, y el renglón importa: «TOTAL» y su importe tienen
     * que quedar en la misma línea para que el intérprete los relacione. */
    let linea = '';
    for (const pieza of contenido.items) {
      if (!('str' in pieza)) continue;
      linea += pieza.str;
      if (pieza.hasEOL) {
        trozos.push(linea);
        linea = '';
      }
    }
    if (linea) trozos.push(linea);
  }
  return { doc, texto: trozos.join('\n') };
}

/** Dibuja la primera página en un lienzo para poder pasarla por el lector. */
async function rasterizar(doc: Awaited<ReturnType<typeof abrirPdf>>): Promise<Blob> {
  const pagina = await doc.getPage(1);
  const base = pagina.getViewport({ scale: 1 });
  const viewport = pagina.getViewport({ scale: Math.min(4, ANCHO_OCR / base.width) });
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(viewport.width);
  lienzo.height = Math.round(viewport.height);
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('Este navegador no puede preparar la imagen del PDF.');
  await pagina.render({ canvasContext: ctx, viewport }).promise;
  return new Promise<Blob>((resolve, reject) =>
    lienzo.toBlob(
      b => (b ? resolve(b) : reject(new Error('No se ha podido leer el PDF.'))),
      'image/png'
    )
  );
}

interface DetectorDeTexto {
  detect: (fuente: ImageBitmap) => Promise<{ rawValue: string }[]>;
}

/*
 * Lector del propio sistema operativo. En Android va muy bien y no descarga
 * nada; donde no exista, se devuelve null y se tira del motor propio.
 */
async function leerConElSistema(fuente: Blob): Promise<string | null> {
  const Detector = (window as unknown as { TextDetector?: new () => DetectorDeTexto }).TextDetector;
  if (!Detector) return null;
  try {
    const bitmap = await createImageBitmap(fuente);
    try {
      const bloques = await new Detector().detect(bitmap);
      const texto = bloques.map(b => b.rawValue).join('\n');
      return texto.trim().length >= MINIMO_TEXTO ? texto : null;
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
}

/*
 * Preparar la foto antes de leerla.
 *
 * Tesseract no espera una fotografía: espera algo parecido a un escaneo, negro
 * sobre blanco. Darle el JPEG en color tal como sale de la cámara es lo que
 * peor funciona, porque el papel nunca es blanco uniforme —tiene la sombra del
 * propio móvil, el reflejo de la ventana y el color de la mesa—.
 *
 * Se pasa a gris y se umbraliza por zonas: cada píxel se compara con la media
 * de su vecindario en vez de con un valor fijo. Así una esquina en penumbra se
 * binariza con su propio listón y no se convierte en un manchón negro, que es
 * lo que arruina la lectura de un ticket fotografiado encima de una mesa.
 */
async function prepararParaLeer(fuente: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(fuente);
  try {
    const lienzo = document.createElement('canvas');
    lienzo.width = bitmap.width;
    lienzo.height = bitmap.height;
    const ctx = lienzo.getContext('2d', { willReadFrequently: true });
    if (!ctx) return fuente;
    ctx.drawImage(bitmap, 0, 0);
    const imagen = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
    const { data, width, height } = imagen;

    // Gris por luminancia, que respeta cómo ve el ojo y separa mejor la tinta.
    const gris = new Uint8ClampedArray(width * height);
    for (let i = 0, p = 0; i < data.length; i += 4, p++)
      gris[p] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;

    /*
     * Media por zonas con una imagen integral: permite calcular la media de
     * cualquier recuadro en cuatro sumas, así que el umbral por vecindario sale
     * igual de rápido para una foto de doce megapíxeles que para una pequeña.
     */
    const integral = new Float64Array((width + 1) * (height + 1));
    for (let y = 0; y < height; y++) {
      let fila = 0;
      for (let x = 0; x < width; x++) {
        fila += gris[y * width + x];
        integral[(y + 1) * (width + 1) + x + 1] = integral[y * (width + 1) + x + 1] + fila;
      }
    }
    const radio = Math.max(8, Math.round(Math.min(width, height) / 40));
    for (let y = 0; y < height; y++) {
      const y0 = Math.max(0, y - radio),
        y1 = Math.min(height - 1, y + radio);
      for (let x = 0; x < width; x++) {
        const x0 = Math.max(0, x - radio),
          x1 = Math.min(width - 1, x + radio);
        const area = (x1 - x0 + 1) * (y1 - y0 + 1);
        const suma =
          integral[(y1 + 1) * (width + 1) + x1 + 1] -
          integral[y0 * (width + 1) + x1 + 1] -
          integral[(y1 + 1) * (width + 1) + x0] +
          integral[y0 * (width + 1) + x0];
        /* El 88 % de la media local: el margen evita que el ruido del papel en
         * blanco se convierta en puntos negros por todas partes. */
        const claro = gris[y * width + x] * 100 > (suma / area) * 88;
        const v = claro ? 255 : 0;
        const i = (y * width + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = v;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(imagen, 0, 0);
    return await new Promise<Blob>(r => lienzo.toBlob(b => r(b ?? fuente), 'image/png'));
  } catch {
    // Si algo falla, mejor leer la foto original que no leer nada.
    return fuente;
  } finally {
    bitmap.close();
  }
}

async function leerConTesseract(fuente: Blob, avisar: Progreso): Promise<string> {
  avisar('Preparando el lector…');
  const { createWorker } = await import('tesseract.js');
  /*
   * Motor y diccionario salen de este mismo dominio, no de un CDN: así la app
   * no depende de un tercero y, una vez descargados, el lector funciona también
   * sin cobertura.
   */
  const base = new URL('ocr/', document.baseURI).href;
  const worker = await createWorker('spa', 1, {
    workerPath: base + 'worker.min.js',
    corePath: base,
    langPath: base,
    gzip: true,
    legacyCore: false,
    legacyLang: false,
    logger: m => {
      if (m.status === 'recognizing text') avisar('Leyendo la imagen…');
      else if (String(m.status).includes('loading')) avisar('Descargando el lector…');
    }
  });
  try {
    /*
     * Dos pasadas con distinta segmentación y se queda la mejor. La automática
     * acierta con una factura A4; la de bloque único va mejor con un ticket
     * estrecho, donde la automática se empeña en ver columnas que no existen.
     */
    await worker.setParameters({ tessedit_pageseg_mode: '6' as never });
    const bloque = await worker.recognize(fuente);
    await worker.setParameters({ tessedit_pageseg_mode: '3' as never });
    const automatica = await worker.recognize(fuente);
    const { data } = bloque.data.confidence >= automatica.data.confidence ? bloque : automatica;
    /*
     * Una foto mala no se queda a medias: inventa. En las pruebas, una imagen
     * pequeña, movida y con poco contraste devolvió 0,33 € donde ponía 674,43,
     * y 6,22 donde ponía 6.229,83. Un importe equivocado que parece verosímil
     * es mucho peor que ninguno, porque se cuela en las cuentas sin que nadie
     * lo note. Por debajo de este listón se prefiere no proponer nada.
     */
    if (data.confidence < CONFIANZA_MINIMA)
      throw new Error(
        'La foto no se lee con garantías: sale muy movida o con poca luz. Haz otra con más luz y ' +
          'el papel plano, o escribe los datos a mano.'
      );
    return data.text;
  } finally {
    await worker.terminate();
  }
}

async function leerImagen(fuente: Blob, avisar: Progreso): Promise<string> {
  avisar('Leyendo la imagen…');
  const delSistema = await leerConElSistema(fuente);
  if (delSistema) return delSistema;
  avisar('Preparando la foto…');
  return leerConTesseract(await prepararParaLeer(fuente), avisar);
}

/**
 * Devuelve el texto de un justificante, sea PDF o foto. Lanza si no hay nada
 * legible: proponer campos a partir de ruido sería peor que no proponer nada.
 */
export async function leerJustificante(dataUrl: string, avisar: Progreso = () => {}) {
  if (esPdf(dataUrl)) {
    const { doc, texto } = await textoDelPdf(dataUrl, avisar);
    if (texto.trim().length >= MINIMO_TEXTO) return texto;
    // PDF sin capa de texto: es un escaneo disfrazado de PDF.
    avisar('El PDF es un escaneo: hay que leerlo como una imagen…');
    return leerImagen(await rasterizar(doc), avisar);
  }
  const respuesta = await fetch(dataUrl);
  return leerImagen(await respuesta.blob(), avisar);
}
