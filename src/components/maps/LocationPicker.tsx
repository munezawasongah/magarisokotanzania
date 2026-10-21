"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { Crosshair, X } from "lucide-react";
import { loadLeaflet, pinIcon, TILE_ATTRIBUTION, TILE_URL, TZ_CENTER } from "./leaflet-loader";

type LatLng = { lat: number; lng: number } | null;

/**
 * Tap the map (or use the phone's GPS) to pin the exact location of the shop,
 * garage, dealership or car. The pin can be dragged to fine-tune it.
 */
export function LocationPicker({ value, onChange, labels }: {
  value: LatLng;
  onChange: (v: LatLng) => void;
  labels: { hint: string; useMyLocation: string; locating: string; clear: string; denied: string };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // init once
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !ref.current || mapRef.current) return;
      LRef.current = L;
      const start = value ? [value.lat, value.lng] as [number, number] : TZ_CENTER;
      const map = L.map(ref.current).setView(start, value ? 16 : 6);
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
      map.on("click", (e) => onChangeRef.current({ lat: round(e.latlng.lat), lng: round(e.latlng.lng) }));
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 200);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the marker in sync with the value
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      markerRef.current = L.marker([value.lat, value.lng], { icon: pinIcon(L), draggable: true }).addTo(map);
      markerRef.current.on("dragend", () => {
        const p = markerRef.current!.getLatLng();
        onChangeRef.current({ lat: round(p.lat), lng: round(p.lng) });
      });
    } else {
      markerRef.current.setLatLng([value.lat, value.lng]);
    }
  }, [value]);

  function locate() {
    if (!navigator.geolocation) return setError(labels.denied);
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const v = { lat: round(pos.coords.latitude), lng: round(pos.coords.longitude) };
        onChange(v);
        mapRef.current?.setView([v.lat, v.lng], 17);
      },
      () => {
        setLocating(false);
        setError(labels.denied);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <div>
      <div ref={ref} className="relative z-0 h-72 w-full overflow-hidden rounded-lg border border-line bg-ink-100" />
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <button type="button" className="btn-ghost py-2" onClick={locate} disabled={locating}>
          <Crosshair className="h-4 w-4" /> {locating ? labels.locating : labels.useMyLocation}
        </button>
        {value && (
          <>
            <span className="tabular-nums text-ink-500">{value.lat.toFixed(5)}, {value.lng.toFixed(5)}</span>
            <button type="button" className="inline-flex items-center gap-1 text-xs text-ink-500 underline" onClick={() => onChange(null)}><X className="h-3 w-3" />{labels.clear}</button>
          </>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-500">{labels.hint}</p>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;
