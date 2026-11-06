import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import { updateNote, type Note } from "./db";

const focus = async (w: WebviewWindow) => { await w.show(); await w.setFocus(); };

export async function openNote(n: Note) {
  const ex = await WebviewWindow.getByLabel(`note-${n.id}`);
  if (ex) return focus(ex);
  new WebviewWindow(`note-${n.id}`, {
    url: `index.html#/note/${n.id}`,
    x: n.x, y: n.y, width: n.w, height: n.h, minWidth: 200, minHeight: 190, // cabe el menú contextual
    decorations: false, transparent: true, shadow: false, skipTaskbar: true, resizable: !n.locked, alwaysOnTop: !!n.locked, maximizable: false, // sin esto, doble clic en la barra maximiza la nota
   
  });
}
export async function closeNote(id: number) {
  await (await WebviewWindow.getByLabel(`note-${id}`))?.destroy();
}
// Recoloca una nota en (100,100) por si quedó fuera de pantalla (monitor desconectado).
export async function bringNote(n: Note) {
  await updateNote(n.id, { x: 100, y: 100 });
  const ex = await WebviewWindow.getByLabel(`note-${n.id}`);
  if (ex) { await ex.setPosition(new LogicalPosition(100, 100)); await focus(ex); }
  else await openNote({ ...n, x: 100, y: 100 });
}

async function openTool(label: string, title: string, width: number, height: number) {
  const ex = await WebviewWindow.getByLabel(label);
  if (ex) return focus(ex);
  new WebviewWindow(label, { url: `index.html#/${label}`, title, width, height, minWidth: 360, minHeight: 420, center: true, decorations: false, maximizable: false });
}
export const openManage = () => openTool("manage", "stickedd · Gestionar notas", 920, 600);
export const openSettings = () => openTool("settings", "stickedd · Personalizar", 400, 660);

// Paneles (color / tamaño de letra) como ventana propia junto a la nota, para que no queden recortados por ella.
export async function closePanel(id: number) {
  await (await WebviewWindow.getByLabel(`panel-${id}`))?.destroy();
}
export async function openPanel(id: number, kind: "color" | "size" | "bg") {
  await closePanel(id);
  const nw = await WebviewWindow.getByLabel(`note-${id}`);
  if (!nw) return;
  const s = await nw.scaleFactor();
  const p = (await nw.outerPosition()).toLogical(s);
  const z = (await nw.outerSize()).toLogical(s);
  const W = 300;
  let x = p.x + z.width + 6; // a la derecha de la nota; si no cabe, a la izquierda
  if (x + W > screen.availWidth) x = Math.max(0, p.x - W - 6);
  const y = Math.min(p.y, Math.max(0, screen.availHeight - 420));
  new WebviewWindow(`panel-${id}`, {
    url: `index.html#/panel/${id}/${kind}`, x, y, width: W, height: 200,
    decorations: false, transparent: true, shadow: false, skipTaskbar: true, alwaysOnTop: true,
    resizable: false, maximizable: false, focus: true,
  });
}
