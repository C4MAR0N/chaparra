export async function compressImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Elige una imagen JPEG, PNG o WebP.');
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
