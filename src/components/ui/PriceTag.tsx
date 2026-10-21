import { formatTzs, formatTzsCompact, type MoneyInput } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Price set as a yellow Tanzanian rear number plate — the site's signature element. */
export function PriceTag({ value, compact, size = "md", className }: { value: MoneyInput; compact?: boolean; size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <span className={cn("plate tabular-nums", size === "sm" && "text-sm", size === "md" && "text-base", size === "lg" && "px-3 py-1 text-2xl md:text-3xl", className)}>
      {compact ? formatTzsCompact(value) : formatTzs(value)}
    </span>
  );
}
