const IMAGENES = ['image/jpeg', 'image/png', 'image/webp'];
/* Un PDF no se puede reducir sin reescribirlo, así que se guarda tal cual y el
 * tope es el que aguanta el navegador y la cuenta del servidor sin resentirse. */
const MAX_PDF = 10 * 1024 * 1024;
/*
 * Tope de entrada, solo para no ahogar al navegador con algo absurdo. NO es el
 * tamaño que se guarda: la foto se reduce antes, y una de móvil de 8 MB acaba
 * pesando menos de medio mega.
 */
const MAX_ENTRADA = 40 * 1024 * 1024;
/*
 * Lado mayor al que se reduce la foto.
 *
 * 2000 px y no 1280: con 1280 el lector se comía los importes de un ticket de
 * letra pequeña, y leer bien el papel es justo para lo que se hace la foto.
 * A esta medida un ticket cabe de sobra y la imagen sigue pesando poco.
 */
const LADO_MAYOR = 2000;
/* Tope de la validación para un justificante guardado, en caracteres. */
const MAX_GUARDADO = 3_000_000;

export async function compressImage(file: File): Promise<string> {
  if (!IMAGENES.includes(file.type)) throw new Error('Elige una imagen JPEG, PNG o WebP.');
  /*
   * El tamaño se mira DESPUÉS de reducir, no antes. Antes se rechazaba todo lo
   * que pasara de 2 MB, y la cámara de cualquier móvil de hoy saca fotos de 3 a
   * 12 MB: quedaba fuera justo el caso para el que existe esto, que es sacarle
   * una foto al ticket.
   */
  if (file.size > MAX_ENTRADA)
    throw new Error('La imagen es enorme. Hazla otra vez con menos resolución.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('No se ha podido abrir esta imagen.'));
      image.src = url;
    });
    const factor = Math.min(1, LADO_MAYOR / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * factor);
    canvas.height = Math.round(img.height * factor);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se ha podido preparar la imagen.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    /*
     * El resultado tiene que caber en lo que acepta la validación. Si no
     * cupiera, la ficha de la factura dejaría de ser válida y al recargar la
     * aplicación se descartarían TODAS las facturas, no solo esta. Antes de
     * arriesgar eso se baja la calidad, que en un ticket no se nota.
     */
    for (const calidad of [0.8, 0.6, 0.45, 0.3]) {
      const salida = canvas.toDataURL('image/jpeg', calidad);
      if (salida.length <= MAX_GUARDADO) return salida;
    }
    throw new Error('La foto es demasiado grande. Hazla otra vez desde un poco más lejos.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const esPdf = (dataUrl: string) => dataUrl.startsWith('data:application/pdf');

function leerPdf(file: File): Promise<string> {
  if (file.size > MAX_PDF)
    throw new Error('El PDF supera 10 MB. Adjunta solo las páginas que necesites.');
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(new Error('No se ha podido leer este PDF.'));
    lector.readAsDataURL(file);
  });
}

/** Justificante de una factura: foto que se comprime, o PDF que se guarda entero. */
export async function prepararAdjunto(file: File): Promise<string> {
  if (file.type === 'application/pdf') return leerPdf(file);
  if (!IMAGENES.includes(file.type)) throw new Error('Elige una foto (JPEG, PNG o WebP) o un PDF.');
  return compressImage(file);
}

/*
 * Abre el adjunto en otra pestaña. Los navegadores bloquean navegar a una URL
 * `data:`, así que hay que pasar por un Blob. La URL temporal se libera al rato:
 * antes no, porque el visor todavía la está cargando.
 */
export function abrirAdjunto(dataUrl: string) {
  const coma = dataUrl.indexOf(',');
  const cabecera = dataUrl.slice(5, coma);
  const tipo = cabecera.slice(0, cabecera.indexOf(';')) || 'application/octet-stream';
  const binario = atob(dataUrl.slice(coma + 1));
  const bytes = new Uint8Array(binario.length);
  for (let n = 0; n < binario.length; n++) bytes[n] = binario.charCodeAt(n);
  const url = URL.createObjectURL(new Blob([bytes], { type: tipo }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
