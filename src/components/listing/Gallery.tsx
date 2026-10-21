"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Img } from "@/components/ui/Img";
import { cn } from "@/lib/utils";

type Photo = { url: string; alt?: string | null };

export function Gallery({ photos, title }: { photos: Photo[]; title: string }) {
  const list = photos.length ? photos : [{ url: "/placeholders/sedan.svg", alt: title }];
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const go = useCallback((d: number) => setI((x) => (x + d + list.length) % list.length), [list.length]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, go]);

  // basic swipe
  const [x0, setX0] = useState<number | null>(null);

  return (
    <div>
      <div
        className="relative aspect-[4/3] overflow-hidden rounded-lg bg-ink-100"
        onTouchStart={(e) => setX0(e.touches[0].clientX)}
        onTouchEnd={(e) => { if (x0 !== null) { const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); } setX0(null); }}
      >
        <button type="button" className="absolute inset-0" onClick={() => setZoom(true)} aria-label="Open full-screen photos">
          <Img src={list[i].url} alt={list[i].alt ?? `${title} photo ${i + 1}`} fill priority sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" transform="f_auto,q_auto,c_fill,w_1280,h_960" />
        </button>
        {list.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow" aria-label="Previous photo"><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => go(1)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow" aria-label="Next photo"><ChevronRight className="h-5 w-5" /></button>
            <span className="absolute bottom-2 right-2 rounded bg-ink-950/70 px-2 py-0.5 text-xs text-white tabular-nums">{i + 1} / {list.length}</span>
          </>
        )}
      </div>
      {list.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {list.map((p, k) => (
            <button key={p.url + k} type="button" onClick={() => setI(k)} className={cn("relative h-16 w-20 shrink-0 overflow-hidden rounded border-2", k === i ? "border-ink-900" : "border-transparent opacity-70")} aria-label={`Photo ${k + 1}`}>
              <Img src={p.url} alt="" fill sizes="80px" className="object-cover" transform="f_auto,q_auto,c_fill,w_160,h_120" />
            </button>
          ))}
        </div>
      )}
      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/95" role="dialog" aria-modal="true" onClick={() => setZoom(false)}>
          <button type="button" className="absolute right-4 top-4 p-2 text-white" aria-label="Close"><X className="h-7 w-7" /></button>
          <div className="relative h-[80vh] w-[92vw]" onClick={(e) => e.stopPropagation()}>
            <Img src={list[i].url} alt={list[i].alt ?? title} fill sizes="92vw" className="object-contain" transform="f_auto,q_auto,w_1920" />
          </div>
        </div>
      )}
    </div>
  );
}
