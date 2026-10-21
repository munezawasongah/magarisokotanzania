"use client";
import type * as L from "leaflet";

/** Loads Leaflet only in the browser (it touches `window`). */
let promise: Promise<typeof L> | null = null;
export function loadLeaflet(): Promise<typeof L> {
  if (!promise) {
    promise = import("leaflet").then((mod) => ((mod as unknown as { default?: typeof L }).default ?? mod) as typeof L);
  }
  return promise;
}

export const TZ_CENTER: [number, number] = [-6.37, 34.89];
export const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Plate-yellow pin drawn with CSS (no image assets needed). */
export function pinIcon(Lf: typeof L) {
  return Lf.divIcon({
    className: "",
    html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#FFD43B;border:3px solid #0A1426;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });
}

export function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
