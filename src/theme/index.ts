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
  /** Logo files in public/brand. "tile" = square emblem; "wide" = landscape wordmark logo. */
  logo: {
    header: { src: "/brand/logo-tile-512.png", width: 512, height: 512, shape: "tile" as "tile" | "wide" },
    full: { src: "/brand/logo-full.png", width: 405, height: 397 },
    email: { src: "/brand/logo-tile-256.png", width: 88, height: 88 },
  },
};
