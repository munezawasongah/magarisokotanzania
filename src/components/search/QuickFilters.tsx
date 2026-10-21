import Link from "next/link";
import { enumLabel, type Dictionary } from "@/i18n";
import { cn } from "@/lib/utils";

const CONDITIONS = ["NEW", "FOREIGN_USED", "LOCALLY_USED"] as const;
const SELLERS = ["INDIVIDUAL", "DEALER", "YARD", "IMPORTER"] as const;

/** One-tap condition and seller-type chips above the results; the sidebar keeps the multi-select version. */
export function QuickFilters({ params, dict }: { params: Record<string, string>; dict: Dictionary }) {
  const href = (key: string, value: string) => {
    const p = new URLSearchParams(params);
    p.delete("page");
    if (p.get(key) === value) p.delete(key);
    else p.set(key, value);
    return `/cars${p.size ? `?${p}` : ""}`;
  };
  const row = (key: "condition" | "sellerType", label: string, values: readonly string[], group: "VehicleCondition" | "SellerType") => (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <span className="shrink-0 text-xs font-semibold text-ink-500">{label}</span>
      {values.map((v) => {
        const on = params[key] === v;
        return (
          <Link key={v} href={href(key, v)} scroll={false} aria-pressed={on} className={cn("chip shrink-0", on && "border-ink-900 bg-ink-900 text-white")}>
            {enumLabel(dict, group, v)}
          </Link>
        );
      })}
    </div>
  );
  return (
    <div className="space-y-2">
      {row("condition", dict.search.conditionLabel, CONDITIONS, "VehicleCondition")}
      {row("sellerType", dict.search.sellerType, SELLERS, "SellerType")}
    </div>
  );
}
