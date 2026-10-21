"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/client";

export function SortSelect({ options }: { options: readonly string[] }) {
  const { dict } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const labels = dict.sort as Record<string, string>;
  return (
    <label className="flex items-center gap-2 text-sm text-ink-700">
      <span className="hidden sm:inline">{dict.search.sort}</span>
      <select
        className="field w-auto py-2"
        value={sp.get("sort") ?? options[0]}
        onChange={(e) => {
          const next = new URLSearchParams(sp.toString());
          next.set("sort", e.target.value);
          next.delete("page");
          router.push(`${pathname}?${next}`, { scroll: false });
        }}
      >
        {options.map((o) => <option key={o} value={o}>{labels[o] ?? o}</option>)}
      </select>
    </label>
  );
}
