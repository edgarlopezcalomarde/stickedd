import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
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

// El <input type="file"> no abre el diálogo en las ventanas transparentes de Tauri: se usa el diálogo nativo.
export async function pickImage(): Promise<Blob | null> {
  const path = await open({ filters: [{ name: "Imágenes", extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp"] }] });
  if (!path) return null;
  const ext = path.split(".").pop()!.toLowerCase();
  return new Blob([await readFile(path)], { type: ext === "jpg" ? "image/jpeg" : `image/${ext}` });
}
