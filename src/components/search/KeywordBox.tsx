"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export function KeywordBox({ placeholder }: { placeholder: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(sp.get("q") ?? "");
  return (
    <form
      role="search"
      className="relative w-full md:w-96"
      onSubmit={(e) => {
        e.preventDefault();
        const next = new URLSearchParams(sp.toString());
        if (q.trim()) next.set("q", q.trim());
        else next.delete("q");
        next.delete("page");
        router.push(`${pathname}?${next}`);
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
      <input className="field pl-9" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </form>
  );
}
