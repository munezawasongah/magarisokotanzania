/**
 * Country visual identity. Colours live in tailwind.config.ts (also a country file);
 * this file holds the choices that change layout, not just colour.
 *  - hero "night": dark full-bleed hero, search on the dark band (MagariSOKO Tanzania)
 *  - hero "day":   light hero, search set in a deep-colour slab (CarMarket Kenya)
 */
export const THEME = {
  themeColor: "#0A1426",
  hero: "night" as "night" | "day",
  /** Thin national-colour band across the top of the header; empty = none. */
  headerBand: [] as string[],
};
