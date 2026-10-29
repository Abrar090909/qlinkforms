// WCAG contrast helpers for owner-chosen accent colours (DESIGN.md section 2).

function luminance(hex: string) {
  const channels = [1, 3, 5].map(
    (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
  );
  const [r = 0, g = 0, b = 0] = channels.map((v) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

/** Black or white text, whichever reads better on this background. */
export function readableTextOn(background: string) {
  return contrastRatio(background, "#1b1b1b") >=
    contrastRatio(background, "#ffffff")
    ? "#1b1b1b"
    : "#ffffff";
}

export const PRESET_CANVAS = { midnight: "#1b1b1b", paper: "#faf9fb" } as const;
export const PRESET_FG = { midnight: "#ffffff", paper: "#2a222b" } as const;

/** CSS variables for a public form theme. */
export function themeStyle(
  preset: keyof typeof PRESET_CANVAS,
  accent: string | null,
) {
  if (!accent) return {};
  const canvas = PRESET_CANVAS[preset];
  // Focus rings need 3:1 against the page; fall back to the text colour.
  const focus = contrastRatio(accent, canvas) >= 3 ? accent : PRESET_FG[preset];
  return {
    "--color-accent": accent,
    "--color-accent-fg": readableTextOn(accent),
    "--color-focus": focus,
  } as Record<string, string>;
}
