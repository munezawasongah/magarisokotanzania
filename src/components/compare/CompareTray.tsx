"use client";
import { usePathname } from "next/navigation";
import { GitCompareArrows, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { COMPARE_MAX, useCompare } from "./compare-store";

/** Floating bar that appears once a car is picked for comparison. */
export function CompareTray() {
  const { dict } = useI18n();
  const { ids, clear } = useCompare();
  const path = usePathname();
  if (!ids.length || path.startsWith("/compare") || path.startsWith("/admin") || path.startsWith("/dashboard")) return null;
  return (
    <div className="fixed inset-x-3 bottom-24 z-30 mx-auto flex max-w-md items-center gap-2 rounded-full bg-ink-950 py-2 pl-4 pr-2 text-sm text-white shadow-lift lg:bottom-5" role="region" aria-label={dict.compare.title}>
      <GitCompareArrows className="h-4 w-4 shrink-0 text-plate-400" />
      <span className="min-w-0 flex-1 truncate">{fmt(dict.compare.tray, { n: ids.length })}</span>
      <a href={`/compare?ids=${ids.join(",")}`} className={`btn-plate px-3 py-1.5 text-xs ${ids.length < 2 ? "pointer-events-none opacity-60" : ""}`} aria-disabled={ids.length < 2}>{dict.compare.go}</a>
      <button type="button" onClick={clear} className="rounded-full p-1.5 text-ink-300 hover:text-white" aria-label={dict.compare.clear}><X className="h-4 w-4" /></button>
      <span className="sr-only">{ids.length}/{COMPARE_MAX}</span>
    </div>
  );
}
