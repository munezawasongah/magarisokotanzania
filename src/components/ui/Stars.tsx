import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only star rating (supports halves visually by rounding to nearest 0.5). */
export function Stars({ value, size = "h-4 w-4", className, label }: { value: number; size?: string; className?: string; label?: string }) {
  const v = Math.round(value * 2) / 2;
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={label ?? `${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="relative inline-block">
          <Star className={cn(size, "text-ink-200")} aria-hidden />
          {v >= i - 0.5 && (
            <span className="absolute inset-0 overflow-hidden" style={{ width: v >= i ? "100%" : "50%" }}>
              <Star className={cn(size, "fill-plate-400 text-plate-500")} aria-hidden />
            </span>
          )}
        </span>
      ))}
    </span>
  );
}
