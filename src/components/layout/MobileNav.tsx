"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function MobileNav({ links, cta, searchLabel }: { links: Array<{ href: string; label: string }>; cta: { href: string; label: string }; searchLabel: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen(true)} aria-label="Menu" className="p-2 text-white"><Menu className="h-6 w-6" /></button>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink-950 p-4 text-white" role="dialog" aria-modal="true">
          <div className="flex justify-end"><button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-2"><X className="h-6 w-6" /></button></div>
          <form action="/search" role="search" className="relative mt-2" onSubmit={() => setOpen(false)}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" aria-hidden />
            <input name="q" className="h-11 w-full rounded-md border border-white/15 bg-white/10 pl-9 pr-3 text-white placeholder:text-ink-300 focus:border-plate-400 focus:outline-none" placeholder={searchLabel} aria-label={searchLabel} enterKeyHint="search" />
          </form>
          <nav className="mt-4 flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="display rounded px-2 py-3 text-2xl hover:bg-white/5">{l.label}</Link>
            ))}
          </nav>
          <div className="mt-auto space-y-4">
            <Link href={cta.href} onClick={() => setOpen(false)} className="btn-plate w-full">{cta.label}</Link>
            <LanguageSwitcher className="text-ink-100" />
          </div>
        </div>
      )}
    </div>
  );
}
