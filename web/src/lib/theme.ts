/** Admin-editable colours -> CSS variables. Only #rrggbb values are ever emitted (no CSS injection). */
const HEX = /^#[0-9a-fA-F]{6}$/;
const MAP: Record<string, string[]> = {
  "theme.primary": ["--color-navy-700", "--color-seva-700"],
  "theme.dark": ["--color-navy-900"],
  "theme.footer": ["--color-navy-950"],
  "theme.soft": ["--color-navy-50"],
  "theme.accent": ["--color-saffron-500"],
  "theme.button": ["--color-saffron-600"],
  "theme.button_dark": ["--color-saffron-700"],
};
export const THEME_KEYS = Object.keys(MAP);

export function themeCss(t: (key: string) => string) {
  const decl = Object.entries(MAP).flatMap(([key, vars]) => {
    const v = t(key).trim();
    return HEX.test(v) ? vars.map((n) => `${n}:${v}`) : [];
  });
  return decl.length ? `:root{${decl.join(";")}}` : "";
}
