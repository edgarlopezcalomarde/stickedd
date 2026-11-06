// Contenido de una nota = lista de bloques guardada como JSON en notes.content.
export type Block =
  | { t: "text" | "bullet" | "check"; v: string; done?: boolean }
  | { t: "img"; v: string; w?: number; h?: number; z?: number; ox?: number; oy?: number };
// img: v = data URL; marco: w = ancho en % (10-100), h = alto en px (sin h = proporción original);
// imagen dentro del marco: z = zoom (1-4), ox/oy = desplazamiento como fracción del marco.
export type ImgBlock = Extract<Block, { t: "img" }>;

export function parseBlocks(content: string): Block[] {
  try {
    const b = JSON.parse(content);
    if (Array.isArray(b) && b.length) return b;
  } catch { /* texto plano de la v1 */ }
  return [{ t: "text", v: content }];
}

// Vista previa para el gestor: primeras líneas de texto de la nota.
export function preview(content: string): string {
  return parseBlocks(content).filter((b) => b.t !== "img").map((b) => b.v).filter(Boolean).join(" · ");
}
