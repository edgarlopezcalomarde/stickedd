import { useEffect, useState } from "react";
import { applyDefaultsToAll, getDefaults, getToolbar, setDefault, setToolbar, TOOLS, type Defaults, type ToolId } from "./db";
import { CUSTOM_BG, PALETTE, isCustom, shade } from "./theme";
import { ColorPicker } from "./ColorPicker";
import { Icon, P } from "./icons";
import { Updates } from "./Updates";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { WindowControls } from "./WindowFrame";

export function Settings() {
  const [d, setD] = useState<Defaults>();
  const [done, setDone] = useState(false);
  const [picker, setPicker] = useState(false);
  const [auto, setAuto] = useState<boolean>();
  const [bar, setBar] = useState<ToolId[]>([]);
  useEffect(() => { getDefaults().then(setD); getToolbar().then(setBar); isEnabled().then(setAuto).catch(() => setAuto(false)); }, []);
  if (!d) return null;

  const set = <K extends keyof Defaults>(k: K, v: Defaults[K]) => { setD({ ...d, [k]: v }); setDefault(k, v); setDone(false); };
  const saveBar = (t: ToolId[]) => { setBar(t); setToolbar(t); };
  const move = (i: number, dir: -1 | 1) => { const t = [...bar]; [t[i], t[i + dir]] = [t[i + dir], t[i]]; saveBar(t); };
  const hidden = TOOLS.filter((t) => !bar.includes(t.id));
  const row = "flex items-center gap-2 h-11 px-3 rounded-2xl";
  const arrow = "size-8 rounded-full border-0 cursor-pointer disabled:opacity-30 disabled:cursor-default flex items-center justify-center";
  return (
    <div className="min-h-full relative px-6 pb-6 pt-14 text-sm space-y-5" style={{ background: "var(--page)" }}>
      <WindowControls />
      <p style={{ color: "var(--ink-soft)" }}>Valores para las notas nuevas. Usa el botón de abajo para aplicarlos también a las que ya existen. Cada nota se puede cambiar por separado desde su modo edición.</p>
      <div>
        <div className="mb-2 font-display font-semibold text-base">Color</div>
        <div className="flex gap-2.5">
          {PALETTE.map((p) => (
            <button key={p.name} aria-label={p.name} onClick={() => set("color", p.light)}
              className="size-8 rounded-full border-0 p-0 cursor-pointer"
              style={{ background: shade(p.light), boxShadow: d.color === p.light ? "0 0 0 3px var(--page), 0 0 0 5px var(--ink)" : undefined }} />
          ))}
          <button aria-label="Color personalizado" title="Color personalizado" onClick={() => setPicker(!picker)}
            className="size-8 rounded-full border-0 p-0 cursor-pointer"
            style={{ background: isCustom(d.color) ? d.color : CUSTOM_BG, boxShadow: isCustom(d.color) || picker ? "0 0 0 3px var(--page), 0 0 0 5px var(--ink)" : undefined }} />
        </div>
        {picker && <div className="mt-3 p-3 rounded-[20px]" style={{ background: "var(--panel)" }}><ColorPicker value={d.color} onChange={(c) => set("color", c)} /></div>}
      </div>
      <label className="block">
        <div className="mb-1 font-display font-semibold text-base">Tamaño de letra: {d.font_size}px</div>
        <input type="range" min={10} max={40} value={d.font_size} className="w-full" style={{ accentColor: "var(--ink)" }}
          onChange={(e) => set("font_size", Number(e.target.value))} />
      </label>
      <label className="block">
        <div className="mb-1 font-display font-semibold text-base">Opacidad del fondo: {d.opacity}%</div>
        <input type="range" min={30} max={100} value={d.opacity} className="w-full" style={{ accentColor: "var(--ink)" }}
          onChange={(e) => set("opacity", Number(e.target.value))} />
      </label>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="font-display font-semibold text-base">Iniciar con Windows</div>
          <p style={{ color: "var(--ink-soft)" }}>Stickedd se abre solo al encender el ordenador.</p>
        </div>
        <button role="switch" aria-checked={!!auto} aria-label="Iniciar con Windows" disabled={auto === undefined}
          onClick={async () => { try { if (auto) await disable(); else await enable(); setAuto(!auto); } catch { /* sin permiso: se queda como estaba */ } }}
          className="w-12 h-7 rounded-full border-0 cursor-pointer relative shrink-0 transition-colors"
          style={{ background: auto ? "var(--ink)" : "var(--chip)" }}>
          <span className="absolute top-0.5 size-6 rounded-full transition-all"
            style={{ left: auto ? 22 : 2, background: auto ? "var(--panel)" : "var(--ink-soft)" }} />
        </button>
      </div>
      <Updates />
      <div>
        <div className="mb-1 font-display font-semibold text-base">Barra superior de la nota</div>
        <p className="mb-2" style={{ color: "var(--ink-soft)" }}>Elige qué botones ver y en qué orden. Sin ninguno, la nota se ve sin barra. Siempre puedes usar clic derecho (menú) y doble clic (editar).</p>
        <div className="space-y-1.5">
          {bar.map((id, i) => (
            <div key={id} className={row} style={{ background: "var(--panel)" }}>
              <input type="checkbox" checked onChange={() => saveBar(bar.filter((b) => b !== id))} style={{ accentColor: "var(--ink)" }} />
              <span className="flex-1">{TOOLS.find((t) => t.id === id)!.label}</span>
              <button aria-label="Subir" className={arrow} style={{ background: "var(--chip)", color: "var(--ink)" }} disabled={i === 0} onClick={() => move(i, -1)}><Icon d={P.up} size={16} /></button>
              <button aria-label="Bajar" className={arrow} style={{ background: "var(--chip)", color: "var(--ink)" }} disabled={i === bar.length - 1} onClick={() => move(i, 1)}><Icon d={P.down} size={16} /></button>
            </div>
          ))}
          {hidden.map((t) => (
            <div key={t.id} className={row} style={{ background: "var(--panel)", opacity: 0.6 }}>
              <input type="checkbox" checked={false} onChange={() => saveBar([...bar, t.id])} style={{ accentColor: "var(--ink)" }} />
              <span className="flex-1">{t.label}</span>
            </div>
          ))}
        </div>
      </div>
      <button className="w-full h-12 rounded-full border-0 cursor-pointer font-display font-semibold text-base flex items-center justify-center gap-2"
        style={{ background: "var(--ink)", color: "var(--page)" }}
        onClick={async () => { await applyDefaultsToAll(); setDone(true); }}>
        {done ? <><Icon d={P.tick} size={18} />Aplicado a todas</> : "Aplicar a todas las notas"}
      </button>
    </div>
  );
}
