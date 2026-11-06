import { useEffect, useRef, useState } from "react";
import { hexToHsv, hsvToHex, type HSV } from "./theme";

const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));

// Arrastre con puntero sobre un área: devuelve posición normalizada 0..1.
function useDrag(onMove: (x: number, y: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    onMove(clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height));
  };
  return {
    ref,
    onPointerDown: (e: React.PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); move(e); },
    onPointerMove: (e: React.PointerEvent) => { if (e.buttons === 1) move(e); },
  };
}

const thumb = "absolute size-5 -ml-2.5 -mt-2.5 rounded-full pointer-events-none";
const ring = { boxShadow: "0 0 0 3px #fff, 0 0 0 5px #2B2140, 0 2px 6px rgba(0,0,0,.35)" };

export function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(value));
  const [text, setText] = useState(value.toUpperCase());

  useEffect(() => { // cambios externos (p. ej. elegir un color de la paleta) sin perder el tono si es gris
    if (hsvToHex(hsv).toLowerCase() !== value.toLowerCase()) setHsv(hexToHsv(value));
    setText(value.toUpperCase());
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (n: HSV) => { setHsv(n); onChange(hsvToHex(n)); };
  const sv = useDrag((x, y) => set({ ...hsv, s: x, v: 1 - y }));
  const hue = useDrag((x) => set({ ...hsv, h: x * 360 }));

  return (
    <div className="flex flex-col gap-3 select-none" style={{ color: "var(--ink)" }}>
      <div {...sv} className="relative h-28 rounded-2xl cursor-crosshair touch-none"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))` }}>
        <span className={thumb} style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hsvToHex(hsv), ...ring }} />
      </div>
      <div {...hue} className="relative h-4 rounded-full cursor-pointer touch-none"
        style={{ background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}>
        <span className={thumb} style={{ left: `${(hsv.h / 360) * 100}%`, top: "50%", background: `hsl(${hsv.h} 100% 50%)`, ...ring }} />
      </div>
      <div className="flex items-center gap-2">
        <span className="size-9 rounded-full shrink-0" style={{ background: hsvToHex(hsv), boxShadow: "inset 0 0 0 2px rgba(43,33,64,.15)" }} />
        <input type="text" value={text} maxLength={7} spellCheck={false} aria-label="Código de color"
          className="min-w-0 flex-1 h-9 px-3 rounded-full font-extrabold tracking-wide uppercase"
          style={{ background: "var(--chip)", color: "var(--ink)" }}
          onChange={(e) => {
            const v = e.target.value.startsWith("#") ? e.target.value : "#" + e.target.value;
            setText(v);
            if (/^#[0-9a-fA-F]{6}$/.test(v)) { setHsv(hexToHsv(v)); onChange(v.toUpperCase()); }
          }} />
      </div>
    </div>
  );
}
