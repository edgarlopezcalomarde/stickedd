import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { deleteNote, listNotes, updateNote, type Note } from "./db";
import { bringNote, closeNote, openNote, openSettings } from "./windows";
import { shade, ink } from "./theme";
import { preview } from "./blocks";
import { Icon, P } from "./icons";
import { WindowControls } from "./WindowFrame";

export const Logo = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size * 0.95} viewBox="0 0 160 152" aria-label="stickedd">
    <polygon points="24,100 80,72 136,100 80,128" fill="#FFB880" /><polygon points="24,100 80,128 80,140 24,112" fill="#FFA866" /><polygon points="80,128 136,100 136,112 80,140" fill="#E8873F" />
    <polygon points="28,88 84,60 140,88 84,116" fill="#C4AEFF" /><polygon points="28,88 84,116 84,128 28,100" fill="#B79CFF" /><polygon points="84,116 140,88 140,100 84,128" fill="#9677E8" />
    <polygon points="21,76 77,48 133,76 77,104" fill="#98D2FF" /><polygon points="21,76 77,104 77,116 21,88" fill="#7CC4FF" /><polygon points="77,104 133,76 133,88 77,116" fill="#58A6EA" />
    <polygon points="27,64 83,36 139,64 83,92" fill="#8AEFC6" /><polygon points="27,64 83,92 83,104 27,76" fill="#6EE7B7" /><polygon points="83,92 139,64 139,76 83,104" fill="#45C994" />
    <polygon points="20,52 76,24 132,52 76,80" fill="#FFA6C7" /><polygon points="20,52 76,80 76,92 20,64" fill="#FF8FB8" /><polygon points="76,80 132,52 132,64 76,92" fill="#E86C9A" />
    <polygon points="24,40 80,12 136,40 80,68" fill="#FFE680" /><polygon points="24,40 80,68 80,80 24,52" fill="#FFD84D" /><polygon points="80,68 136,40 136,52 80,80" fill="#F2B90F" />
    <polygon points="58,57 102,57 80,68" fill="#FFF3B0" />
  </svg>
);

export function Manage() {
  const [tab, setTab] = useState<0 | 1>(0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [counts, setCounts] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    const load = async () => {
      const [a, b] = await Promise.all([listNotes(0), listNotes(1)]);
      setCounts([a.length, b.length]);
      setNotes(tab ? b : a);
    };
    load();
    const un = listen("db-changed", load);
    return () => void un.then((f) => f());
  }, [tab]);

  const archive = async (n: Note) => { await updateNote(n.id, { archived: 1 }); await closeNote(n.id); };
  const restore = async (n: Note) => { await updateNote(n.id, { archived: 0 }); await openNote({ ...n, archived: 0 }); };
  const remove = async (n: Note) => { await closeNote(n.id); await deleteNote(n.id); };

  const chip = "px-3 h-8 rounded-full border-0 cursor-pointer text-[13px] font-extrabold flex items-center gap-1.5";
  return (
    <div className="h-full flex relative" style={{ background: "var(--page)" }}>
      <WindowControls />
      <aside className="w-[220px] shrink-0 p-5 flex flex-col gap-5" style={{ background: "var(--side)" }}>
        <div className="flex items-center gap-2.5"><Logo /><span className="font-display font-bold text-2xl tracking-tight">stickedd</span></div>
        <nav className="flex flex-col gap-1">
          {(["Activas", "Archivadas"] as const).map((t, i) => (
            <button key={t} onClick={() => setTab(i as 0 | 1)}
              className="h-11 px-3.5 rounded-2xl border-0 cursor-pointer flex items-center justify-between text-base"
              style={{ background: tab === i ? "var(--panel)" : "transparent", color: "var(--ink)", fontWeight: tab === i ? 800 : 700 }}>
              {t}
              <span className="min-w-6 h-6 px-2 rounded-full text-[13px] font-extrabold flex items-center justify-center"
                style={tab === i ? { background: "var(--ink)", color: "var(--panel)" } : { background: "var(--chip)" }}>{counts[i]}</span>
            </button>
          ))}
        </nav>
        <button onClick={openSettings} className="mt-auto h-11 px-3.5 rounded-2xl border-0 cursor-pointer text-base flex items-center gap-2.5"
          style={{ background: "transparent", color: "var(--ink)" }}><Icon d={P.palette} size={18} />Personalizar</button>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="px-8 pt-8">
          <h1 className="m-0 font-display font-bold text-4xl leading-tight">{tab ? "Archivadas" : "Activas"}</h1>
          <p className="m-0 mt-1 text-[15px]" style={{ color: "var(--ink-soft)" }}>{counts[tab]} {counts[tab] === 1 ? "nota" : "notas"}</p>
        </header>
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {notes.length === 0 && <p className="text-center mt-16" style={{ color: "var(--ink-soft)" }}>No hay notas aquí.</p>}
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}>
            {notes.map((n) => (
              <div key={n.id} className="rounded-[22px] overflow-hidden flex flex-col"
                style={{ background: shade(n.color), color: ink(), boxShadow: "inset 0 1px 0 rgba(255,255,255,.6), 0 3px 0 rgba(43,33,64,.10), 0 14px 22px -10px rgba(43,33,64,.30)" }}>
                <div className="px-[18px] pt-4 pb-3 flex flex-col gap-2 flex-1">
                  <p className="m-0 text-base leading-snug line-clamp-6">{preview(n.content) || "(vacía)"}</p>
                </div>
                <div className="flex gap-1.5 px-3 pb-3 justify-end">
                  {tab === 0 ? (
                    <>
                      <button className={chip} style={{ background: "rgba(255,255,255,.55)", color: ink() }} onClick={() => bringNote(n)}><Icon d={P.eye} size={14} />Mostrar</button>
                      <button className={chip} style={{ background: ink(), color: "#fff" }} onClick={() => archive(n)}><Icon d={P.archive} size={14} />Archivar</button>
                    </>
                  ) : (
                    <>
                      <button className={chip} style={{ background: "rgba(255,255,255,.55)", color: ink() }} onClick={() => remove(n)}><Icon d={P.trash} size={14} />Eliminar</button>
                      <button className={chip} style={{ background: ink(), color: "#fff" }} onClick={() => restore(n)}><Icon d={P.restore} size={14} />Restaurar</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
