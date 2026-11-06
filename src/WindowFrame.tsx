import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Icon, P } from "./icons";

// Ventanas sin marco nativo: franja de arrastre + botones con el estilo de la app.
export function WindowControls() {
  const win = getCurrentWebviewWindow();
  const b = "size-8 rounded-full border-0 cursor-pointer flex items-center justify-center";
  return (
    <>
      <div data-tauri-drag-region className="absolute top-0 inset-x-0 h-11 z-40" />
      <div className="absolute top-2 right-3 z-50 flex gap-1.5">
        <button aria-label="Minimizar" className={b} style={{ background: "var(--chip)", color: "var(--ink)" }} onClick={() => win.minimize()}><Icon d={P.minimize} size={15} /></button>
        <button aria-label="Cerrar" className={b} style={{ background: "var(--ink)", color: "var(--panel)" }} onClick={() => win.destroy()}><Icon d={P.close} size={15} /></button>
      </div>
    </>
  );
}
