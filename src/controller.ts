import { TrayIcon } from "@tauri-apps/api/tray";
import { Menu } from "@tauri-apps/api/menu";
import trayUrl from "./tray.png?url";
import { invoke } from "@tauri-apps/api/core";
import { enable } from "@tauri-apps/plugin-autostart";
import { createNote, getDb, listNotes } from "./db";
import { openManage, openNote } from "./windows";

const newNote = async () => openNote(await createNote());

// Ventana "main" oculta: restaura las notas y mantiene la bandeja.
export async function boot() {
  const db = await getDb();
  // Primera ejecución del instalador: arrancar con Windows por defecto (se cambia en Personalizar).
  // Solo en la app instalada, para que `tauri dev` no registre el ejecutable de desarrollo.
  if (import.meta.env.PROD) {
    const done = await db.select<unknown[]>("SELECT 1 FROM settings WHERE key = 'autostart_init'");
    if (!done.length) {
      await enable().catch(() => {});
      await db.execute("INSERT INTO settings (key, value) VALUES ('autostart_init', '1')");
    }
  }
  for (const n of await listNotes(0)) await openNote(n);
  const menu = await Menu.new({
    items: [
      { id: "new", text: "Nueva nota", action: newNote },
      { id: "manage", text: "Gestionar notas", action: openManage },
      { id: "quit", text: "Salir", action: () => invoke("quit") },
    ],
  });
  await TrayIcon.new({
    icon: new Uint8Array(await (await fetch(trayUrl)).arrayBuffer()),
    tooltip: "Stickedd",
    menu,
    showMenuOnLeftClick: false,
    action: (e) => { if (e.type === "Click" && e.button === "Left" && e.buttonState === "Up") newNote(); },
  });
}
