import { useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { getVersion } from "@tauri-apps/api/app";
import { Icon, P } from "./icons";

type State =
  | { s: "idle" } | { s: "checking" } | { s: "latest" } | { s: "error"; msg: string }
  | { s: "found"; u: Update } | { s: "installing"; pct: number | null };

// Sección "Actualizaciones" de Personalizar: busca en GitHub Releases, descarga e instala (la app se reinicia sola).
export function Updates() {
  const [version, setVersion] = useState("");
  const [st, setSt] = useState<State>({ s: "idle" });

  const search = async () => {
    setSt({ s: "checking" });
    try {
      const u = await check();
      setSt(u ? { s: "found", u } : { s: "latest" });
    } catch (e) { setSt({ s: "error", msg: String(e) }); }
  };
  useEffect(() => { getVersion().then(setVersion); search(); }, []);

  const install = async (u: Update) => {
    let total = 0, got = 0;
    setSt({ s: "installing", pct: null });
    try {
      await u.downloadAndInstall((e) => {
        if (e.event === "Started") total = e.data.contentLength ?? 0;
        else if (e.event === "Progress") { got += e.data.chunkLength; setSt({ s: "installing", pct: total ? Math.round((got / total) * 100) : null }); }
      });
    } catch (e) { setSt({ s: "error", msg: String(e) }); }
  };

  const btn = "h-10 px-4 rounded-full border-0 cursor-pointer font-display font-semibold text-[15px] flex items-center gap-2 disabled:opacity-50 disabled:cursor-default";
  return (
    <div>
      <div className="mb-1 font-display font-semibold text-base">Actualizaciones</div>
      <div className="p-3 rounded-2xl flex flex-col gap-2.5" style={{ background: "var(--panel)" }}>
        <div className="flex items-center justify-between gap-2">
          <span style={{ color: "var(--ink-soft)" }}>Versión instalada: <b style={{ color: "var(--ink)" }}>{version}</b></span>
          {st.s !== "found" && st.s !== "installing" && (
            <button className={btn} style={{ background: "var(--chip)", color: "var(--ink)" }} disabled={st.s === "checking"} onClick={search}>
              <Icon d={P.restore} size={16} />{st.s === "checking" ? "Buscando…" : "Buscar"}
            </button>
          )}
        </div>
        {st.s === "latest" && <span className="flex items-center gap-1.5"><Icon d={P.tick} size={16} />Estás al día.</span>}
        {st.s === "error" && <span style={{ color: "#E0457B" }}>No se pudo comprobar: {st.msg.slice(0, 120)}</span>}
        {st.s === "found" && (
          <>
            <span>Nueva versión disponible: <b>{st.u.version}</b></span>
            {st.u.body && <p className="m-0 text-[13px] line-clamp-3" style={{ color: "var(--ink-soft)" }}>{st.u.body}</p>}
            <button className={btn + " justify-center"} style={{ background: "var(--ink)", color: "var(--panel)" }} onClick={() => install(st.u)}>
              <Icon d={P.down} size={16} />Actualizar e instalar
            </button>
          </>
        )}
        {st.s === "installing" && (
          <>
            <span>Descargando e instalando{st.pct != null ? ` (${st.pct}%)` : "…"} La app se reiniciará sola.</span>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--chip)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${st.pct ?? 100}%`, background: "var(--ink)", opacity: st.pct == null ? 0.4 : 1 }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
