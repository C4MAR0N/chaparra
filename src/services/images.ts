const IMAGENES = ['image/jpeg', 'image/png', 'image/webp'];
/* Un PDF no se puede reducir sin reescribirlo, así que se guarda tal cual y el
 * tope es el que aguanta el navegador y la cuenta del servidor sin resentirse. */
const MAX_PDF = 2 * 1024 * 1024;

export async function compressImage(file: File): Promise<string> {
  if (!IMAGENES.includes(file.type)) throw new Error('Elige una imagen JPEG, PNG o WebP.');
  if (file.size > 2 * 1024 * 1024)
    throw new Error('La imagen supera 2 MB. Reduce su tamaño antes de adjuntarla.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('No se ha podido abrir esta imagen.'));
      image.src = url;
    });
    const factor = Math.min(1, 1280 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * factor);
    canvas.height = Math.round(img.height * factor);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se ha podido preparar la imagen.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const esPdf = (dataUrl: string) => dataUrl.startsWith('data:application/pdf');

function leerPdf(file: File): Promise<string> {
  if (file.size > MAX_PDF)
    throw new Error('El PDF supera 2 MB. Adjunta solo las páginas que necesites.');
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
