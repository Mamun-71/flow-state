/**
 * Category colors: a categorical palette validated for color-vision deficiency
 * (adjacent-pair ΔE ≥ 8). New categories take the next unused slot in this order.
 */
export const CATEGORY_COLORS = [
  { hex: "#2a78d6", name: "Blue" },
  { hex: "#eb6834", name: "Orange" },
  { hex: "#1baf7a", name: "Aqua" },
  { hex: "#eda100", name: "Yellow" },
  { hex: "#e87ba4", name: "Pink" },
  { hex: "#008300", name: "Green" },
  { hex: "#4a3aa7", name: "Violet" },
  { hex: "#e34948", name: "Red" },
] as const;

export function nextCategoryColor(used: (string | null)[]): string {
  const taken = new Set(used.map((c) => c?.toLowerCase()));
  return (CATEGORY_COLORS.find((c) => !taken.has(c.hex)) ?? CATEGORY_COLORS[used.length % CATEGORY_COLORS.length]).hex;
}
