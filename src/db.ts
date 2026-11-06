import Database from "@tauri-apps/plugin-sql";
import { emit } from "@tauri-apps/api/event";

export type Note = {
  id: number; title: string; bg_image: string; content: string; color: string; font_size: number; opacity: number;
  x: number; y: number; w: number; h: number; locked: number; archived: number; updated_at: number;
};
export type Defaults = { color: string; font_size: number; opacity: number };

import { COLORS } from "./theme";
export { COLORS };
const FALLBACK: Defaults = { color: COLORS[0], font_size: 16, opacity: 100 };

let dbp: Promise<Database> | null = null;
export const getDb = () =>
  (dbp ??= (async () => {
    const db = await Database.load("sqlite:stickedd.db");
    await db.execute(`CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL, font_size INTEGER NOT NULL, opacity INTEGER NOT NULL,
      x INTEGER NOT NULL, y INTEGER NOT NULL, w INTEGER NOT NULL DEFAULT 240, h INTEGER NOT NULL DEFAULT 220,
      locked INTEGER NOT NULL DEFAULT 0, archived INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)`);
    // Migración v2: título. `content` pasa a guardar los bloques como JSON (texto plano antiguo se sigue leyendo).
    await db.execute("ALTER TABLE notes ADD COLUMN title TEXT NOT NULL DEFAULT ''").catch(() => {});
    await db.execute("ALTER TABLE notes ADD COLUMN bg_image TEXT NOT NULL DEFAULT ''").catch(() => {}); // migración v3
    await db.execute("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    return db;
  })());

const changed = () => emit("db-changed");

export async function listNotes(archived: 0 | 1): Promise<Note[]> {
  const db = await getDb();
  return db.select<Note[]>("SELECT * FROM notes WHERE archived = $1 ORDER BY updated_at DESC", [archived]);
}
export async function getNote(id: number): Promise<Note | undefined> {
  const db = await getDb();
  return (await db.select<Note[]>("SELECT * FROM notes WHERE id = $1", [id]))[0];
}

export async function getDefaults(): Promise<Defaults> {
  const db = await getDb();
  const rows = await db.select<{ key: string; value: string }[]>("SELECT * FROM settings");
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    color: m.color ?? FALLBACK.color,
    font_size: Number(m.font_size ?? FALLBACK.font_size),
    opacity: Number(m.opacity ?? FALLBACK.opacity),
  };
}
export async function setDefault(key: keyof Defaults, value: string | number) {
  const db = await getDb();
  await db.execute("INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2", [key, String(value)]);
  await changed();
}

export async function createNote(): Promise<Note> {
  const db = await getDb();
  const d = await getDefaults();
  const off = Math.floor(Math.random() * 8) * 30; // cascada para que no se apilen
  const r = await db.execute(
    "INSERT INTO notes (color, font_size, opacity, x, y, w, h, updated_at) VALUES ($1,$2,$3,$4,$5,300,280,$6)",
    [d.color, d.font_size, d.opacity, 120 + off, 120 + off, Date.now()],
  );
  await changed();
  return (await getNote(r.lastInsertId!))!;
}

// Las claves vienen siempre de código propio (nunca de entrada del usuario).
export async function updateNote(id: number, patch: Partial<Omit<Note, "id">>) {
  const db = await getDb();
  const keys = Object.keys(patch);
  const set = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  await db.execute(`UPDATE notes SET ${set}, updated_at = $${keys.length + 2} WHERE id = $1`, [
    id, ...Object.values(patch), Date.now(),
  ]);
  await changed();
}
export async function deleteNote(id: number) {
  const db = await getDb();
  await db.execute("DELETE FROM notes WHERE id = $1", [id]);
  await changed();
}
export async function applyDefaultsToAll() {
  const db = await getDb();
  const d = await getDefaults();
  await db.execute("UPDATE notes SET color = $1, font_size = $2, opacity = $3", [d.color, d.font_size, d.opacity]);
  await changed();
}

// Botones de la barra superior de la nota, en orden. Lista vacía = nota sin barra.
export type ToolId = "edit" | "pin" | "archive";
export const TOOLS: { id: ToolId; label: string }[] = [
  { id: "edit", label: "Editar" }, { id: "pin", label: "Fijar" }, { id: "archive", label: "Archivar" },
];
export async function getToolbar(): Promise<ToolId[]> {
  const db = await getDb();
  const r = await db.select<{ value: string }[]>("SELECT value FROM settings WHERE key = 'toolbar'");
  try { if (r[0]) return JSON.parse(r[0].value); } catch { /* valor corrupto: usar el de fábrica */ }
  return ["edit", "pin", "archive"];
}
export async function setToolbar(t: ToolId[]) {
  const db = await getDb();
  await db.execute("INSERT INTO settings (key, value) VALUES ('toolbar', $1) ON CONFLICT(key) DO UPDATE SET value = $1", [JSON.stringify(t)]);
  await changed();
}
