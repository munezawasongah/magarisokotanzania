import { TrendingDown, Minus, TrendingUp } from "lucide-react";
import type { Verdict } from "@/server/market";
import { cn } from "@/lib/utils";

const STYLE: Record<Verdict, { cls: string; Icon: typeof Minus; en: string; sw: string }> = {
  good: { cls: "bg-go-500/10 text-go-700 ring-go-500/30", Icon: TrendingDown, en: "Good price", sw: "Bei nzuri" },
  fair: { cls: "bg-ink-100 text-ink-700 ring-line", Icon: Minus, en: "Fair price", sw: "Bei ya kawaida" },
  high: { cls: "bg-white text-ink-500 ring-line", Icon: TrendingUp, en: "Priced high", sw: "Bei iko juu" },
};

/** Compact price-check label for cards: compares the asking price with similar live cars. */
export function PriceVerdict({ verdict, locale, className }: { verdict: Verdict; locale: string; className?: string }) {
  const s = STYLE[verdict];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold ring-1 ring-inset", s.cls, className)} title={locale === "sw" ? "Ikilinganishwa na magari yanayofanana yanayouzwa sasa" : "Compared with similar cars for sale now"}>
      <s.Icon className="h-3 w-3" aria-hidden />{locale === "sw" ? s.sw : s.en}
    </span>
  );
}

export const verdictLabel = (v: Verdict, locale: string) => (locale === "sw" ? STYLE[v].sw : STYLE[v].en);
