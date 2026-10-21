"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { Navigation } from "lucide-react";
import { directionsUrl, loadLeaflet, pinIcon, TILE_ATTRIBUTION, TILE_URL } from "./leaflet-loader";

/** Read-only map with the location pin and a "Get directions" link. */
export function LocationMap({ lat, lng, label, directionsLabel, className = "h-64" }: { lat: number; lng: number; label?: string; directionsLabel: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: true }).setView([lat, lng], 15);
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
      const m = L.marker([lat, lng], { icon: pinIcon(L) }).addTo(map);
      if (label) m.bindPopup(label);
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng, label]);
  return (
    <div>
      <div ref={ref} className={`relative z-0 w-full overflow-hidden rounded-lg border border-line bg-ink-100 ${className}`} role="img" aria-label={label ?? "Map"} />
      <a href={directionsUrl(lat, lng)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold underline">
        <Navigation className="h-4 w-4" /> {directionsLabel}
      </a>
    </div>
  );
}
