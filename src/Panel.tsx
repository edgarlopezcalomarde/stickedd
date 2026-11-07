import { useEffect, useRef, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { emit, listen } from "@tauri-apps/api/event";
import { getNote, updateNote, type Note } from "./db";
import { CUSTOM_BG, PALETTE, isCustom, shade } from "./theme";
import { ColorPicker } from "./ColorPicker";
import { readImage } from "./image";
import { Icon, P } from "./icons";

const win = getCurrentWebviewWindow();
const W = 280;
const PAD = 10; // margen transparente para la sombra

function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...a: A) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

const SIZES = [{ l: "S", v: 14 }, { l: "M", v: 16 }, { l: "L", v: 20 }, { l: "XL", v: 26 }];

// Ventana flotante junto a la nota (colores / tamaño de letra): así no se corta con una nota pequeña.
export function Panel({ id, kind }: { id: number; kind: "color" | "size" | "bg" }) {
  const [note, setNote] = useState<Note>();
  const [picker, setPicker] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const picking = useRef(false); // el diálogo de archivos quita el foco al panel: no cerrarlo entonces
  const fileInput = useRef<HTMLInputElement>(null);
  const setOpacity = useRef(debounce((o: number) => updateNote(id, { opacity: o }), 80)).current;
  const setColor = useRef(debounce((c: string) => updateNote(id, { color: c }), 80)).current;

  useEffect(() => {
    const load = async () => {
      const n = await getNote(id);
      if (!n || n.archived) return void win.destroy();
      setNote((cur) => (cur && picker ? cur : n)); // mientras arrastras el selector manda el estado local
    };
    load();
    const un = listen("db-changed", load);
    const close = async () => { await emit("panel-closed", { id, kind }); win.destroy(); };
    const uf = win.onFocusChanged(({ payload }) => { if (payload) picking.current = false; else if (!picking.current) close(); });
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    addEventListener("keydown", esc);
    return () => { removeEventListener("keydown", esc); un.then((f) => f()); uf.then((f) => f()); };
  }, [id, kind, picker]);

  useEffect(() => { // la ventana se ajusta al contenido
    if (!box.current) return;
    const fit = () => win.setSize(new LogicalSize(W + PAD * 2, box.current!.offsetHeight + PAD * 2));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [note === undefined]);

  if (!note) return null;
  const ring = "0 0 0 3px var(--panel), 0 0 0 5px var(--ink)";
  const chip = "size-11 rounded-full border-0 cursor-pointer font-display font-bold text-base";

  return (
    <div className="h-full" style={{ padding: PAD }}>
      <div ref={box} className="p-4 rounded-[22px] flex flex-col gap-3" style={{
        background: "var(--panel)", color: "var(--ink)", width: W,
        boxShadow: "0 3px 0 rgba(43,33,64,.08), 0 14px 28px -10px rgba(43,33,64,.45)",
      }}>
        {kind === "color" ? (
          <>
            <div className="font-display font-semibold text-base">Color y transparencia</div>
            <div className="flex flex-wrap items-center gap-2.5">
              {PALETTE.map((p) => (
                <button key={p.name} aria-label={p.name} title={p.name} onClick={() => { setNote({ ...note, color: p.light }); updateNote(id, { color: p.light }); }}
                  className="size-8 rounded-full border-0 p-0 cursor-pointer"
                  style={{ background: shade(p.light), boxShadow: note.color === p.light ? ring : undefined }} />
              ))}
              <button aria-label="Color personalizado" title="Color personalizado" onClick={() => setPicker(!picker)}
                className="size-8 rounded-full border-0 p-0 cursor-pointer"
                style={{ background: isCustom(note.color) ? note.color : CUSTOM_BG, boxShadow: isCustom(note.color) || picker ? ring : undefined }} />
            </div>
            {picker && <ColorPicker value={note.color} onChange={(c) => { setNote({ ...note, color: c }); setColor(c); }} />}
            <label className="flex items-center gap-3 text-sm">
              <span className="shrink-0">Opacidad</span>
              <input type="range" min={30} max={100} value={note.opacity} className="flex-1 min-w-0" style={{ accentColor: "var(--ink)" }}
                onChange={(e) => { const opacity = +e.target.value; setNote({ ...note, opacity }); setOpacity(opacity); }} />
              <span className="w-10 text-right font-display font-semibold">{note.opacity}%</span>
            </label>
          </>
        ) : kind === "bg" ? (
          <>
            <div className="font-display font-semibold text-base">Fondo de la nota</div>
            {note.bg_image ? (
              <div className="h-28 rounded-2xl" style={{ backgroundImage: `url("${note.bg_image}")`, backgroundSize: "cover", backgroundPosition: "center" }} />
            ) : (
              <p className="m-0 text-sm" style={{ color: "var(--ink-soft)" }}>Pon una imagen que cubra toda la nota. Se ajusta sola cuando cambias el tamaño de la nota.</p>
            )}
            <button className="h-10 rounded-full border-0 cursor-pointer font-display font-semibold text-[15px] flex items-center justify-center gap-2"
              style={{ background: "var(--ink)", color: "var(--panel)" }}
              onClick={() => { picking.current = true; fileInput.current?.click(); }}>
              <Icon d={P.image} size={16} />{note.bg_image ? "Cambiar imagen" : "Elegir imagen"}
            </button>
            {note.bg_image && (
              <button className="h-10 rounded-full border-0 cursor-pointer font-display font-semibold text-[15px] flex items-center justify-center gap-2"
                style={{ background: "var(--chip)", color: "var(--ink)" }}
                onClick={() => { setNote({ ...note, bg_image: "" }); updateNote(id, { bg_image: "" }); }}>
                <Icon d={P.trash} size={16} />Quitar fondo
              </button>
            )}
            <input ref={fileInput} type="file" accept="image/*" hidden
              onChange={async (e) => {
                const f = e.target.files?.[0]; e.target.value = ""; picking.current = false;
                if (f) { const src = await readImage(f, 1600); setNote({ ...note, bg_image: src }); updateNote(id, { bg_image: src }); }
              }} />
          </>
        ) : (
          <>
            <div className="font-display font-semibold text-base">Tamaño de letra</div>
            <div className="flex items-center justify-between">
              <button aria-label="Reducir letra" className={chip} style={{ background: "var(--chip)", color: "var(--ink)" }}
                onClick={() => updateNote(id, { font_size: Math.max(10, note.font_size - 1) })}>A−</button>
              <span className="font-display font-semibold text-2xl">{note.font_size} px</span>
              <button aria-label="Aumentar letra" className={chip} style={{ background: "var(--chip)", color: "var(--ink)" }}
                onClick={() => updateNote(id, { font_size: Math.min(40, note.font_size + 1) })}>A+</button>
            </div>
            <div className="flex p-1 gap-1 rounded-full" style={{ background: "var(--chip)" }}>
              {SIZES.map((s) => (
                <button key={s.l} onClick={() => updateNote(id, { font_size: s.v })}
                  className="flex-1 h-9 rounded-full border-0 cursor-pointer font-display font-semibold text-[15px]"
                  style={note.font_size === s.v ? { background: "var(--ink)", color: "var(--panel)" } : { background: "transparent", color: "var(--ink)" }}>{s.l}</button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
