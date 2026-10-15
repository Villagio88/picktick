function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

/** Light background (85% white mix, similar to Tailwind-100) */
export function lightBg(hex: string, whiteRatio = 0.85): string {
  const { r, g, b } = hexToRgb(hex);
  const lr = Math.round(r + (255 - r) * whiteRatio);
  const lg = Math.round(g + (255 - g) * whiteRatio);
  const lb = Math.round(b + (255 - b) * whiteRatio);
  return `rgb(${lr}, ${lg}, ${lb})`;
}

/** Dark text (40% darkened, similar to Tailwind-800) */
export function darkText(hex: string, blackRatio = 0.4): string {
  const { r, g, b } = hexToRgb(hex);
  const dr = Math.round(r * (1 - blackRatio));
  const dg = Math.round(g * (1 - blackRatio));
  const db = Math.round(b * (1 - blackRatio));
  return `rgb(${dr}, ${dg}, ${db})`;
}
