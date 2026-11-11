import { PRICE_BANDS, SITE } from "@/config/site";
import { fmt, type Dictionary } from "@/i18n";

const short = (n: number) => (n >= 1e9 ? `${+(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}K` : `${n}`);

/** "Under TSh 10M", "TSh 10–20M", "Over TSh 50M" with links into /cars. */
export function priceBandLinks(dict: Dictionary) {
  return PRICE_BANDS.map((b) => {
    const sp = new URLSearchParams();
    if (b.min) sp.set("priceMin", String(b.min));
    if (b.max) sp.set("priceMax", String(b.max));
    let label: string;
    if (!b.min) label = fmt(dict.hero.priceUnder, { amount: `${SITE.currencySymbol} ${short(b.max!)}` });
    else if (!b.max) label = fmt(dict.hero.priceOver, { amount: `${SITE.currencySymbol} ${short(b.min)}` });
    else {
      const [lo, hi] = [short(b.min), short(b.max)];
      const unit = lo.slice(-1) === hi.slice(-1) && /[KMB]/.test(hi.slice(-1)) ? hi.slice(-1) : "";
      label = `${SITE.currencySymbol} ${unit ? lo.slice(0, -1) : lo}–${hi}`;
    }
    return { label, href: `/cars?${sp}`, min: b.min, max: b.max };
  });
}
