// Contenido de una nota = lista de bloques guardada como JSON en notes.content.
export type Block =
  | { t: "text" | "bullet" | "check"; v: string; done?: boolean }
  | { t: "img"; v: string; w?: number; h?: number; z?: number; ox?: number; oy?: number }
  | { t: "table"; rows: string[][] };
// img: v = data URL; marco: w = ancho en % (10-100), h = alto en px (sin h = proporción original);
// imagen dentro del marco: z = zoom (1-4), ox/oy = desplazamiento como fracción del marco.
export type ImgBlock = Extract<Block, { t: "img" }>;
export type TextBlock = Exclude<Block, { t: "img" } | { t: "table" }>;
export type TableBlock = Extract<Block, { t: "table" }>;
export const isText = (b: Block): b is TextBlock => b.t === "text" || b.t === "bullet" || b.t === "check";

export function parseBlocks(content: string): Block[] {
  try {
    const b = JSON.parse(content);
    if (Array.isArray(b) && b.length) return b;
  } catch { /* texto plano de la v1 */ }
  return [{ t: "text", v: content }];
}

// Vista previa para el gestor: primeras líneas de texto de la nota.
export function preview(content: string): string {
  return parseBlocks(content).flatMap((b) => (b.t === "img" ? [] : b.t === "table" ? b.rows.flat() : [b.v])).filter(Boolean).join(" · ");
}
