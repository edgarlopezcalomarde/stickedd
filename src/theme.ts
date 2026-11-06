// Paleta de la guía de estilo: [nombre, claro, oscuro]. En DB se guarda el hex claro.
export const PALETTE = [
  { name: "Sol", light: "#FFD84D", dark: "#F7C93B" },
  { name: "Fresa", light: "#FF8FB8", dark: "#F472A8" },
  { name: "Menta", light: "#6EE7B7", dark: "#3FD6A0" },
  { name: "Cielo", light: "#7CC4FF", dark: "#5AAEF5" },
  { name: "Uva", light: "#B79CFF", dark: "#9C7CF4" },
  { name: "Mandarina", light: "#FFA866", dark: "#F78F4A" },
];
export const COLORS = PALETTE.map((p) => p.light);
export const INK = { light: "#2B2140", dark: "#1B1233" };

const mq = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : undefined;
export const isDark = () => !!mq?.matches;
export const shade = (hex: string) => (isDark() ? PALETTE.find((p) => p.light === hex)?.dark : undefined) ?? hex;
export const ink = () => (isDark() ? INK.dark : INK.light);

// Tinta legible sobre cualquier color (también los personalizados): blanca si el fondo es oscuro.
export function inkOn(bg: string): string {
  const n = parseInt(bg.slice(1), 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum < 0.5 ? "#FFFFFF" : ink();
}
export const isCustom = (hex: string) => !COLORS.includes(hex);
export const CUSTOM_BG = "conic-gradient(#FFD84D, #FF8FB8, #B79CFF, #7CC4FF, #6EE7B7, #FFD84D)";

export type HSV = { h: number; s: number; v: number }; // h 0..360, s/v 0..1
export function hexToHsv(hex: string): HSV {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}
export function hsvToHex({ h, s, v }: HSV): string {
  const f = (k: number) => {
    const t = (k + h / 60) % 6;
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(t, 4 - t, 1))));
  };
  return "#" + [f(5), f(3), f(1)].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
}
