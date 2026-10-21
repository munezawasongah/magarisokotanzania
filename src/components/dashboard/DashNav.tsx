"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function DashNav({ items }: { items: Array<{ href: string; label: string; badge?: number }> }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Dashboard">
      {items.map((i) => {
        // top-level section pages (/dashboard, /admin) only match exactly
        const isRoot = i.href.split("/").filter(Boolean).length === 1;
        const active = isRoot ? path === i.href : path === i.href || path.startsWith(i.href + "/");
        return (
          <Link key={i.href} href={i.href} className={cn("flex shrink-0 items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium", active ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-ink-100")}>
            {i.label}
            {i.badge ? <span className="rounded-full bg-plate-400 px-1.5 text-2xs font-bold text-ink-950">{i.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
