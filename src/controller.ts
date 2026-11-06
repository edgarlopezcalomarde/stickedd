import { TrayIcon } from "@tauri-apps/api/tray";
import { Menu } from "@tauri-apps/api/menu";
import trayUrl from "./tray.png?url";
import { getAllWindows } from "@tauri-apps/api/window";
import { createNote, getDb, listNotes } from "./db";
import { openManage, openNote } from "./windows";

const newNote = async () => openNote(await createNote());

// Ventana "main" oculta: restaura las notas y mantiene la bandeja.
export async function boot() {
  await getDb();
  for (const n of await listNotes(0)) await openNote(n);
  const menu = await Menu.new({
    items: [
      { id: "new", text: "Nueva nota", action: newNote },
      { id: "manage", text: "Gestionar notas", action: openManage },
      // Destruir todas las ventanas cierra la app (no hay comando Rust de salida).
      { id: "quit", text: "Salir", action: async () => { for (const w of await getAllWindows()) await w.destroy(); } },
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
