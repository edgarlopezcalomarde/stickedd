import { useEffect, useRef, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import { deleteNote, getNote, getToolbar, updateNote, type Note as NoteT, type ToolId } from "./db";
import { ink, inkOn, shade } from "./theme";
import { parseBlocks, type Block, type ImgBlock } from "./blocks";
import { readImage } from "./image";
import { Icon, P } from "./icons";
import { closePanel, openPanel } from "./windows";

const win = getCurrentWebviewWindow();
const MENU_W = 184;
const MENU_H = 196;
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...a: A) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function Btn({ label, on, size = 28, onClick, children }: { label: string; on?: boolean; size?: number; onClick: () => void; children: React.ReactNode }) {
  return (
    <button aria-label={label} title={label} onClick={onClick}
      className="rounded-full flex items-center justify-center cursor-pointer border-0 p-0 shrink-0 font-display font-bold"
      style={{ width: size, height: size, background: on ? ink() : "rgba(255,255,255,0.55)", color: on ? "#fff" : ink() }}>
      {children}
    </button>
  );
}

export function Note({ id }: { id: number }) {
  const [note, setNote] = useState<NoteT>();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [editing, setEditing] = useState(false);
  const [panel, setPanel] = useState<"color" | "size" | "bg" | null>(null);
  const panelRef = useRef<"color" | "size" | "bg" | null>(null); // espejo de `panel` para el listener
  const closedKind = useRef<string | null>(null);
  const closedAt = useRef(0); // cuándo se cerró el panel flotante (se cierra solo al perder el foco)
  const [toolbar, setToolbar] = useState<ToolId[]>([]);
  const [confirmDel, setConfirmDel] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [, bump] = useState(0); // fuerza reajuste de alturas al cambiar el ancho de la ventana
  const first = useRef(true);
  const refs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const focus = useRef<number | null>(null); // bloque enfocado
  const pending = useRef<number | null>(null); // bloque a enfocar tras renderizar
  const fileInput = useRef<HTMLInputElement>(null);
  const press = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const load = async () => {
      const n = await getNote(id);
      if (!n) return void win.destroy();
      setNote(n);
      setToolbar(await getToolbar());
      win.setResizable(!n.locked);
      win.setAlwaysOnTop(!!n.locked);
      // título y bloques solo se cargan una vez: no pisar lo que se está escribiendo
      if (first.current) {
        first.current = false;
        const b = parseBlocks(n.content);
        if (n.title) { b.unshift({ t: "text", v: n.title }); updateNote(id, { title: "", content: JSON.stringify(b) }); }
        setBlocks(b);
      }
    };
    load();
    const un = listen("db-changed", load);
    const up = listen<{ id: number; kind: string }>("panel-closed", (e) => {
      // ignora avisos de un panel viejo (p. ej. el de color al pasar a tamaño de letra)
      if (e.payload.id === id && e.payload.kind === panelRef.current) { closedAt.current = Date.now(); closedKind.current = e.payload.kind; setPanel(null); }
    });
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setEditing(false); setPanel(null); closePanel(id); setConfirmDel(false); setMenu(null); }
    };
    addEventListener("keydown", esc);
    const savePos = debounce(async () => {
      const s = await win.scaleFactor();
      const p = (await win.outerPosition()).toLogical(s);
      const z = (await win.innerSize()).toLogical(s);
      updateNote(id, { x: Math.round(p.x), y: Math.round(p.y), w: Math.round(z.width), h: Math.round(z.height) });
    }, 400);
    const um = win.onMoved(savePos);
    const ur = win.onResized(() => { savePos(); bump((t) => t + 1); });
    return () => { removeEventListener("keydown", esc); up.then((f) => f()); un.then((f) => f()); um.then((f) => f()); ur.then((f) => f()); };
  }, [id]);

  useEffect(() => { // enfoque tras insertar/convertir un bloque
    if (pending.current != null) { refs.current[pending.current]?.focus(); pending.current = null; }
  });

  const save = useRef(debounce((b: Block[]) => updateNote(id, { content: JSON.stringify(b) }), 400)).current;
  panelRef.current = panel;
  if (!note) return null;

  const commit = (b: Block[]) => { setBlocks(b); save(b); };
  const setBlock = (i: number, p: Partial<Block>) => commit(blocks.map((b, j) => (j === i ? { ...b, ...p } as Block : b)));
  const insertAfter = (i: number, b: Block) => {
    const next = [...blocks]; next.splice(i + 1, 0, b); pending.current = i + 1; commit(next);
  };
  const insertImage = (i: number, src: string) => { // tras la imagen siempre queda una línea donde seguir escribiendo
    const next = [...blocks]; const add: Block[] = [{ t: "img", v: src, w: 100 }];
    if (i >= blocks.length - 1) add.push({ t: "text", v: "" });
    next.splice(i + 1, 0, ...add); commit(next);
  };
  const remove = (i: number) => {
    const next = blocks.filter((_, j) => j !== i);
    pending.current = Math.max(0, i - 1);
    commit(next.length ? next : [{ t: "text", v: "" }]);
  };
  const convert = (t: "bullet" | "check") => { // alterna el tipo del bloque enfocado, o añade uno nuevo
    const i = focus.current;
    if (i != null && blocks[i] && blocks[i].t !== "img") {
      const cur = blocks[i];
      setBlock(i, { t: cur.t === t ? "text" : t, done: false } as Partial<Block>);
      pending.current = i;
    } else insertAfter(blocks.length - 1, { t, v: "", done: false });
  };
  const hop = (from: number, dir: -1 | 1) => { // salta al texto anterior/siguiente (ignora imágenes)
    for (let k = from + dir; k >= 0 && k < blocks.length; k += dir) if (blocks[k].t !== "img") { refs.current[k]?.focus(); return true; }
    return false;
  };
  const addImage = async (blob: Blob) => insertImage(focus.current ?? blocks.length - 1, await readImage(blob));
  const pasteImage = (e: { clipboardData: DataTransfer | null; preventDefault: () => void }) => { // imagen copiada de la web: como archivo o como <img src> en el HTML
    const d = e.clipboardData; if (!d) return;
    const f = [...d.items].find((it) => it.type.startsWith("image/"))?.getAsFile();
    const src = new DOMParser().parseFromString(d.getData("text/html"), "text/html").querySelector("img")?.src;
    if (f) { e.preventDefault(); addImage(f); }
    else if (src && !d.getData("text/plain").trim()) { // shortcut: depende del CORS de la web de origen, si falla no se inserta nada
      e.preventDefault(); fetch(src).then((r) => r.blob()).then(addImage).catch(() => {});
    }
  };
  const startResize = (e: React.PointerEvent, i: number) => { // asa del marco: ancho (en %) y alto (en px) libres
    e.preventDefault(); e.stopPropagation();
    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture(e.pointerId);
    const frame = handle.parentElement!;
    const full = frame.parentElement!.clientWidth, sw = frame.clientWidth, sh = frame.clientHeight, sx = e.clientX, sy = e.clientY;
    const move = (ev: PointerEvent) => setBlock(i, {
      w: clamp(Math.round(((sw + ev.clientX - sx) / full) * 100), 10, 100),
      h: clamp(Math.round(sh + ev.clientY - sy), 40, 1600),
    });
    const up = () => { handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); };
    handle.addEventListener("pointermove", move); handle.addEventListener("pointerup", up);
  };
  const startPan = (e: React.PointerEvent, i: number, b: ImgBlock) => { // arrastrar la imagen dentro de su marco
    if ((e.target as HTMLElement).closest("button,[data-handle]")) return;
    const lim = ((b.z ?? 1) - 1) / 2;
    if (lim <= 0) return;
    const frame = e.currentTarget as HTMLElement;
    frame.setPointerCapture(e.pointerId);
    const fw = frame.clientWidth, fh = frame.clientHeight, sx = e.clientX, sy = e.clientY, ox0 = b.ox ?? 0, oy0 = b.oy ?? 0;
    const move = (ev: PointerEvent) => setBlock(i, { ox: clamp(ox0 + (ev.clientX - sx) / fw, -lim, lim), oy: clamp(oy0 + (ev.clientY - sy) / fh, -lim, lim) });
    const up = () => { frame.removeEventListener("pointermove", move); frame.removeEventListener("pointerup", up); };
    frame.addEventListener("pointermove", move); frame.addEventListener("pointerup", up);
  };
  const zoom = (e: React.MouseEvent, i: number, b: ImgBlock, d: number) => { // zoom de la imagen dentro del marco
    const z = clamp(Math.round(((b.z ?? 1) + d) * 100) / 100, 1, 4), lim = (z - 1) / 2;
    const frame = (e.currentTarget as HTMLElement).closest("[data-frame]") as HTMLElement;
    setBlock(i, { z, h: b.h ?? frame.clientHeight, ox: clamp(b.ox ?? 0, -lim, lim), oy: clamp(b.oy ?? 0, -lim, lim) });
  };

  const toggleEdit = () => { setEditing(!editing); setPanel(null); closePanel(id); };
  const togglePanel = (kind: "color" | "size" | "bg") => {
    // el clic que cerró ESTE panel por perder el foco no debe reabrirlo; si es el del otro botón, sí abre
    if (kind === closedKind.current && Date.now() - closedAt.current < 300) return;
    if (panel === kind) { setPanel(null); closePanel(id); } else { setPanel(kind); openPanel(id, kind); }
  };
  const togglePin = () => updateNote(id, { locked: note.locked ? 0 : 1 });
  const archive = async () => { await updateNote(id, { archived: 1 }); win.destroy(); };
  const tools: Record<ToolId, { label: string; on: boolean; fill?: boolean; icon: React.ReactNode; run: () => void }> = {
    edit: { label: editing ? "Terminar edición" : "Editar", on: editing, icon: P.edit, run: toggleEdit },
    pin: { label: note.locked ? "Desfijar del escritorio" : "Fijar en el escritorio", on: !!note.locked, fill: !!note.locked, icon: P.pin, run: togglePin },
    archive: { label: "Archivar nota", on: false, icon: P.archive, run: archive },
  };
  const menuItems: { label: string; icon: React.ReactNode; run: () => void; danger?: boolean }[] = [
    { label: editing ? "Terminar edición" : "Editar", icon: P.edit, run: toggleEdit },
    { label: note.locked ? "Desfijar" : "Fijar", icon: P.pin, run: togglePin },
    { label: "Archivar", icon: P.archive, run: archive },
    { label: "Eliminar", icon: P.trash, run: () => setConfirmDel(true), danger: true },
  ];

  const fg = inkOn(shade(note.color));
  const bg = `color-mix(in srgb, ${shade(note.color)} ${note.opacity}%, transparent)`;
  const drag = note.locked ? {} : { "data-tauri-drag-region": true };
  const fs = note.font_size;
  // Sin botones visibles y fuera de edición: el contenido gana todo el espacio; si solo hay una imagen, la llena entera
  const bare = toolbar.length === 0 && !editing;
  const fill = bare && blocks.filter((b) => b.t === "img").length === 1 && blocks.every((b) => b.t === "img" || !b.v.trim());
  const canGrab = !editing && !note.locked; // en modo visión y sin fijar se mueve agarrando cualquier parte

  return (
    <div className="h-full p-[2px] pb-[5px]"
      onContextMenu={(e) => { e.preventDefault(); setMenu({ x: clamp(e.clientX, 6, innerWidth - MENU_W - 6), y: clamp(e.clientY, 6, innerHeight - MENU_H - 6) }); }}
      onPaste={editing ? pasteImage : undefined}
      onDoubleClick={(e) => { // en edición, doble clic fuera del texto (que selecciona palabras) termina la edición
        const t = e.target as HTMLElement;
        if (t.closest("button,textarea,input,[data-handle]")) return;
        if (editing) toggleEdit(); else setEditing(true);
      }}
      onMouseDown={(e) => {
        const t = e.target as HTMLElement;
        press.current = canGrab && e.button === 0 && !t.closest("button,input[type=checkbox],[data-tauri-drag-region]") ? { x: e.clientX, y: e.clientY } : null;
      }}
      onMouseMove={(e) => { // arrastra solo tras moverse unos px, así el clic y el doble clic siguen funcionando
        const p = press.current;
        if (p && e.buttons === 1 && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 4) { press.current = null; win.startDragging(); }
      }}
      onMouseUp={() => (press.current = null)}>
      <div className="h-full flex flex-col overflow-hidden relative isolate" style={{
        background: note.bg_image ? "transparent" : bg, color: fg, borderRadius: 22, // con imagen de fondo, el PNG transparente deja ver el escritorio
        boxShadow: note.bg_image ? undefined : "inset 0 1px 0 rgba(255,255,255,.6), 0 3px 0 rgba(43,33,64,.10)",
      }}>
        {note.bg_image && (
          <div className="absolute inset-0 -z-10 pointer-events-none" style={{
            backgroundImage: `url("${note.bg_image}")`, backgroundSize: "cover", backgroundPosition: "center", opacity: note.opacity / 100,
          }} />
        )}
        {/* barra superior: botones y orden configurables; sin botones = nota sin barra */}
        {toolbar.length > 0 ? (
          <div className="flex items-center justify-between shrink-0 h-10 pl-4 pr-2.5" style={{ background: "rgba(43,33,64,.09)" }} {...drag}>
            <div className="flex-1 h-full" {...drag} />
            <div className="flex gap-1">
              {toolbar.map((t) => (
                <Btn key={t} label={tools[t].label} on={tools[t].on} onClick={tools[t].run}><Icon d={tools[t].icon} fill={tools[t].fill} /></Btn>
              ))}
            </div>
          </div>
        ) : (
          <div className="absolute top-0 inset-x-0 h-3 z-10" {...drag} /> // franja invisible para poder mover la nota
        )}

        {/* contenido */}
        <div className={`flex-1 min-h-0 overflow-y-auto ${fill ? "p-0" : bare ? "px-4 py-3" : "px-[22px] pt-4 pb-3"} flex flex-col gap-2.5 ${editing ? "" : "select-none"}`}>
          {blocks.map((b, i) => (fill && b.t !== "img" ? null : (
            <div key={i} data-row className={`flex items-start gap-2.5 ${fill ? "flex-1 min-h-0" : ""} ${editing ? "" : "cursor-default"}`}>
              {b.t === "bullet" && <span className="select-none leading-[1.4]" style={{ fontSize: fs }}>•</span>}
              {b.t === "check" && (
                <input type="checkbox" checked={!!b.done} onChange={(e) => setBlock(i, { done: e.target.checked })}
                  className="size-[18px] m-0 shrink-0 cursor-pointer" style={{ accentColor: fg, marginTop: fs * 0.3 }} />
              )}
              {b.t === "img" ? (
                <div data-frame className={`relative overflow-hidden ${fill ? "" : "rounded-xl"} ${editing && (b.z ?? 1) > 1 ? "cursor-grab" : ""}`}
                  style={fill ? { width: "100%", height: "100%" } : { width: `${b.w ?? 100}%`, height: b.h, touchAction: "none" }}
                  onPointerDown={editing ? (e) => startPan(e, i, b) : undefined}>
                  <img src={b.v} draggable={false} className="block w-full select-none"
                    style={b.h || fill ? {
                      position: "absolute", inset: 0, height: "100%", objectFit: "cover",
                      transform: `translate(${(b.ox ?? 0) * 100}%, ${(b.oy ?? 0) * 100}%) scale(${b.z ?? 1})`,
                    } : undefined} />
                  {editing && (
                    <>
                      <button aria-label="Quitar imagen" title="Quitar imagen" onClick={() => remove(i)}
                        className="absolute top-1.5 right-1.5 size-7 rounded-full border-0 cursor-pointer flex items-center justify-center"
                        style={{ background: ink(), color: "#fff" }}><Icon d={P.close} size={14} /></button>
                      <div className="absolute top-1.5 left-1.5 flex items-center rounded-full" style={{ background: ink(), color: "#fff" }}>
                        <button aria-label="Alejar imagen" title="Alejar imagen" onClick={(e) => zoom(e, i, b, -0.25)}
                          className="size-7 rounded-full border-0 cursor-pointer flex items-center justify-center bg-transparent text-inherit"><Icon d={P.minimize} size={14} /></button>
                        <button aria-label="Acercar imagen" title="Acercar imagen" onClick={(e) => zoom(e, i, b, 0.25)}
                          className="size-7 rounded-full border-0 cursor-pointer flex items-center justify-center bg-transparent text-inherit"><Icon d={P.plus} size={14} /></button>
                      </div>
                      <div data-handle aria-label="Arrastra para cambiar el tamaño del marco" title="Arrastra para cambiar el tamaño del marco" onPointerDown={(e) => startResize(e, i)}
                        className="absolute bottom-1.5 right-1.5 size-7 rounded-full flex items-center justify-center cursor-nwse-resize touch-none"
                        style={{ background: ink(), color: "#fff" }}><Icon d={P.grip} size={14} /></div>
                    </>
                  )}
                </div>
              ) : (
                <textarea ref={(el) => { refs.current[i] = el; if (el) { el.style.height = "0"; el.style.height = el.scrollHeight + "px"; } }}
                  value={b.v} rows={1} readOnly={!editing} placeholder={editing && i === 0 ? "Escribe aquí…" : ""}
                  className={`flex-1 bg-transparent w-full leading-[1.4] overflow-hidden ${editing ? "" : "cursor-default"}`}
                  style={{ fontSize: fs, textDecoration: b.t === "check" && b.done ? "line-through" : undefined, opacity: b.t === "check" && b.done ? 0.7 : 1 }}
                  onFocus={() => (focus.current = i)}
                  onChange={(e) => setBlock(i, { v: e.target.value })}
                  onKeyDown={(e) => {
                    const el = e.currentTarget, atStart = el.selectionStart === 0 && el.selectionEnd === 0;
                    if (e.key === "Enter" && !e.shiftKey && b.t !== "text") {
                      e.preventDefault();
                      if (!b.v) setBlock(i, { t: "text" }); // Enter en lista vacía = salir de la lista
                      else insertAfter(i, { t: b.t, v: "", done: false });
                    } else if (e.key === "Backspace" && atStart) {
                      if (b.t !== "text") { e.preventDefault(); setBlock(i, { t: "text" }); } // primero deja de ser lista
                      else if (!b.v && blocks.length > 1) { e.preventDefault(); remove(i); }
                    } else if (e.key === "ArrowUp" && el.selectionStart === 0 && hop(i, -1)) e.preventDefault();
                    else if (e.key === "ArrowDown" && el.selectionStart === el.value.length && hop(i, 1)) e.preventDefault();
                  }} />
              )}
            </div>
          )))}
        </div>

        {/* barra inferior: solo en modo edición */}
        {editing && (
          <div className="shrink-0">
            <div className="flex flex-wrap items-center gap-2 px-3.5 pt-1.5 pb-3">
              <Btn size={36} label="Color de la nota" on={panel === "color"} onClick={() => togglePanel("color")}><Icon d={P.palette} size={18} /></Btn>
              <Btn size={36} label="Tamaño de letra" on={panel === "size"} onClick={() => togglePanel("size")}><span className="text-[15px]">Aa</span></Btn>
              <Btn size={36} label="Fondo de la nota" on={panel === "bg" || !!note.bg_image} onClick={() => togglePanel("bg")}><Icon d={P.fill} size={18} /></Btn>
              <Btn size={36} label="Lista con viñetas" on={focus.current != null && blocks[focus.current]?.t === "bullet"} onClick={() => convert("bullet")}><Icon d={P.bullet} size={18} /></Btn>
              <Btn size={36} label="Lista de tareas con checkbox" on={focus.current != null && blocks[focus.current]?.t === "check"} onClick={() => convert("check")}><Icon d={P.check} size={18} /></Btn>
              <Btn size={36} label="Insertar imagen (o pega con Ctrl+V)" onClick={() => fileInput.current?.click()}><Icon d={P.image} size={18} /></Btn>
              <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => {
                const f = e.target.files?.[0]; e.target.value = "";
                if (f) addImage(f);
              }} />
            </div>
          </div>
        )}

        {confirmDel && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 p-4 text-center"
            style={{ background: "rgba(27,18,51,.82)", color: "#fff" }}>
            <div className="font-display font-semibold text-lg">¿Eliminar esta nota?</div>
            <div className="text-sm opacity-80">No se puede deshacer.</div>
            <div className="flex gap-2">
              <button className="h-9 px-4 rounded-full border-0 cursor-pointer font-bold" style={{ background: "rgba(255,255,255,.25)", color: "#fff" }}
                onClick={() => setConfirmDel(false)}>Cancelar</button>
              <button className="h-9 px-4 rounded-full border-0 cursor-pointer font-bold" style={{ background: "#fff", color: "#1B1233" }}
                onClick={async () => { await deleteNote(id); win.destroy(); }}>Eliminar</button>
            </div>
          </div>
        )}
      </div>

      {/* menú contextual con el estilo de la app (el nativo de Windows no se puede tematizar) */}
      {menu && (
        <>
          <div className="fixed inset-0 z-30" onMouseDown={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null); }} />
          <div role="menu" className="fixed z-40 p-1.5 rounded-[20px]"
            style={{ left: menu.x, top: menu.y, width: MENU_W, background: "var(--panel)", color: "var(--ink)",
              boxShadow: "0 3px 0 rgba(43,33,64,.08), 0 18px 30px -12px rgba(43,33,64,.45)" }}>
            {menuItems.map((m) => (
              <button key={m.label} role="menuitem" onClick={() => { setMenu(null); m.run(); }}
                className="w-full h-10 px-3 rounded-2xl border-0 cursor-pointer flex items-center gap-2.5 text-left text-[15px] font-bold bg-transparent hover:bg-[var(--chip)]"
                style={{ color: m.danger ? "#E0457B" : "var(--ink)" }}>
                <Icon d={m.icon} size={16} />{m.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
