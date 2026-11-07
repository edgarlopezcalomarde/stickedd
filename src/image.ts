// Reduce la imagen (ancho máx. `max` px; PNG se mantiene PNG para conservar la transparencia, el resto JPEG) para no inflar la base de datos con fotos de varios MB.
export function readImage(file: Blob, max = 800): Promise<string> {
  return new Promise((ok, fail) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / img.width);
      const c = document.createElement("canvas");
      c.width = img.width * k; c.height = img.height * k;
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(file.type === "image/png" ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = fail;
    img.src = url;
  });
}
