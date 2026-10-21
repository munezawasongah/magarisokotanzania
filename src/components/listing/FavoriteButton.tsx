"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

export function FavoriteButton({ listingId, partId, initial, label, savedLabel }: { listingId?: string; partId?: string; initial: boolean; label: string; savedLabel: string }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const { status } = useSession();
  const router = useRouter();
  return (
    <button
      type="button"
      className={cn("btn-ghost", on && "border-danger/40 text-danger")}
      aria-pressed={on}
      disabled={busy}
      onClick={async () => {
        if (status !== "authenticated") return router.push(`/login?callbackUrl=${encodeURIComponent(location.pathname)}`);
        setBusy(true);
        setOn(!on);
        const r = await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, partId }) });
        if (!r.ok) setOn(on);
        setBusy(false);
      }}
    >
      <Heart className={cn("h-4 w-4", on && "fill-current")} /> {on ? savedLabel : label}
    </button>
  );
}
