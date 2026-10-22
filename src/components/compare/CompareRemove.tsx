"use client";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { readCompare, writeCompare } from "./compare-store";

/** Removes one car from the comparison and reloads the table. */
export function CompareRemove({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={label}
      className="absolute right-2 top-2 rounded-full bg-white/95 p-1.5 text-ink-700 shadow hover:text-danger"
      onClick={() => {
        const next = readCompare().filter((x) => x !== id);
        const fromUrl = new URLSearchParams(window.location.search).get("ids")?.split(",").filter((x) => x && x !== id) ?? [];
        const ids = next.length ? next : fromUrl;
        writeCompare(ids);
        router.push(ids.length ? `/compare?ids=${ids.join(",")}` : "/compare");
      }}
    >
      <X className="h-4 w-4" />
    </button>
  );
}
