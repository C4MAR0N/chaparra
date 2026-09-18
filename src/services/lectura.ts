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
 * Por debajo de esta confianza del lector no se propone nada.
 *
 * Estaba en 70, y con tickets reales fotografiados ninguno llegaba: se quedaban
 * entre 50 y 63 aun leyendo bien el total y la fecha. Se baja a 50 porque el
 * importe ya no depende solo de esto: no se propone nada sin una palabra que
 * diga «total», y lo que salga tiene que cuadrar con la base y los impuestos.
 * Son esas dos reglas las que impiden un número falso, no el listón.
 */
const CONFIANZA_MINIMA = 50;
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
 * peor funciona: con un ticket de verdad la confianza salía en 23 sobre 100 y
 * el texto era ruido.
 *
 * Se divide cada píxel por el brillo medio de su entorno amplio. Eso estima el
 * papel y lo cancela: se van de golpe la sombra del propio móvil, el reflejo de
 * la ventana y el color de la mesa, y queda tinta sobre blanco aunque el
 * original tuviera poquísimo contraste. Después se separa en dos tonos con el
 * umbral de Otsu, que lo elige a partir de la propia imagen en vez de con un
 * número fijo.
 *
 * Con el mismo ticket, esto sube la confianza de 23 a más de 60 y encima tarda
 * siete veces menos, porque a Tesseract le cuesta mucho menos una imagen ya
 * binarizada que una fotografía.
 *
 * Se probó antes el umbral por vecindario pequeño (comparar cada píxel con la
 * media de lo que tiene al lado). Con letra impresa sobre papel blanco va bien,
 * pero con un ticket térmico descolorido la letra apenas es más oscura que su
 * entorno inmediato y desaparecía entera: el lector devolvía texto vacío.
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
    const gris = new Float32Array(width * height);
    for (let i = 0, p = 0; i < data.length; i += 4, p++)
      gris[p] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

    /*
     * Imagen integral: da la media de cualquier recuadro en cuatro sumas, así
     * que estimar el fondo cuesta lo mismo con una foto de doce megapíxeles que
     * con una pequeña.
     */
    const integral = new Float64Array((width + 1) * (height + 1));
    for (let y = 0; y < height; y++) {
      let fila = 0;
      for (let x = 0; x < width; x++) {
        fila += gris[y * width + x];
        integral[(y + 1) * (width + 1) + x + 1] = integral[y * (width + 1) + x + 1] + fila;
      }
    }

    // Radio amplio a propósito: tiene que abarcar el papel, no la letra.
    const radio = Math.max(12, Math.round(Math.min(width, height) / 12));
    const normal = new Float32Array(width * height);
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
        const fondo = Math.max(1, suma / area);
        normal[y * width + x] = Math.min(255, (gris[y * width + x] / fondo) * 200);
      }
    }

    // Otsu: el corte que mejor separa los dos montones de la propia imagen.
    const histograma = new Array<number>(256).fill(0);
    for (const v of normal) histograma[Math.min(255, v | 0)]++;
    const total = normal.length;
    let suma = 0;
    for (let t = 0; t < 256; t++) suma += t * histograma[t];
    let sumaFondo = 0,
      pesoFondo = 0,
      mejor = 0,
      umbral = 180;
    for (let t = 0; t < 256; t++) {
      pesoFondo += histograma[t];
      if (!pesoFondo) continue;
      const pesoFrente = total - pesoFondo;
      if (!pesoFrente) break;
      sumaFondo += t * histograma[t];
      const media = sumaFondo / pesoFondo - (suma - sumaFondo) / pesoFrente;
      const entre = pesoFondo * pesoFrente * media * media;
      if (entre > mejor) {
        mejor = entre;
        umbral = t;
      }
    }

    for (let p = 0; p < normal.length; p++) {
      const v = normal[p] > umbral ? 255 : 0;
      const i = p * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
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
     * La de columna única gana casi siempre con un ticket, que es una tira
     * estrecha; la automática, con una factura A4 repartida en zonas. Medido
     * sobre cuatro tickets reales: la de columna ganó en tres.
     */
    await worker.setParameters({ tessedit_pageseg_mode: '4' as never });
    const columna = await worker.recognize(fuente);
    await worker.setParameters({ tessedit_pageseg_mode: '3' as never });
    const automatica = await worker.recognize(fuente);
    const { data } = columna.data.confidence >= automatica.data.confidence ? columna : automatica;
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
