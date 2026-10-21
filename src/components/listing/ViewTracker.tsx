"use client";
import { useEffect } from "react";

/** Records one VIEW per page load (server de-duplicates per visitor for 6h). */
export function ViewTracker({ listingId }: { listingId: string }) {
  useEffect(() => {
    const t = setTimeout(() => {
      void fetch(`/api/listings/${listingId}/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "VIEW" }), keepalive: true });
    }, 1500); // ignore bounces
    return () => clearTimeout(t);
  }, [listingId]);
  return null;
}
