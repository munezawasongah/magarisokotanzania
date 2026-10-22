"use client";
import { useState } from "react";
import { Check, GitCompareArrows } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { useCompare } from "./compare-store";

export function CompareToggle({ id, className }: { id: string; className?: string }) {
  const { dict } = useI18n();
  const { ids, toggle } = useCompare();
  const [full, setFull] = useState(false);
  const on = ids.includes(id);
  return (
    <button
      type="button"
      aria-pressed={on}
      title={full ? dict.compare.max : undefined}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = toggle(id);
        setFull(!ok);
        if (!ok) setTimeout(() => setFull(false), 2500);
      }}
      className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-2xs font-semibold transition-colors", on ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-white/95 text-ink-700 hover:border-ink-300", className)}
    >
      {on ? <Check className="h-3.5 w-3.5" /> : <GitCompareArrows className="h-3.5 w-3.5" />}
      {full ? dict.compare.max : on ? dict.compare.added : dict.compare.add}
    </button>
  );
}
