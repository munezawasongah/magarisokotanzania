"use client";
import { useEffect, useState } from "react";
import { THEME } from "@/theme";

/**
 * Sticky header that shows the full logo large at the top of the page (so the
 * words in it are readable) and slims down once the visitor scrolls.
 * Hysteresis (shrink past 48px, grow back under 8px) stops it flickering.
 */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const onScroll = () => setCompact((c) => (c ? window.scrollY > 8 : window.scrollY > 48));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header data-compact={compact} className="group/hdr sticky top-0 z-40 border-b border-chrome-line bg-chrome/95 backdrop-blur supports-[backdrop-filter]:bg-chrome/90">
      {THEME.headerBand.length > 0 && (
        <div aria-hidden className="flex h-1">{THEME.headerBand.map((c, i) => <span key={i} className="flex-1" style={{ background: c }} />)}</div>
      )}
      {children}
    </header>
  );
}
