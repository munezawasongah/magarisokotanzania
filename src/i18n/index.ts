import { en, type Dictionary } from "./en";
import { sw } from "./sw";

export type Locale = "en" | "sw";
export const LOCALES: Locale[] = ["en", "sw"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "gs_locale";

export const dictionaries: Record<Locale, Dictionary> = { en, sw };
export type { Dictionary };

export function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "sw";
}

/** "{count} cars found" + {count: 12} → "12 cars found" */
export function fmt(template: string, vars: Record<string, string | number> = {}) {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

type EnumKey = keyof Dictionary["enums"];
export function enumLabel(dict: Dictionary, group: EnumKey, value: string | null | undefined): string {
  if (!value) return "—";
  const g = dict.enums[group] as Record<string, string>;
  return g[value] ?? value;
}
