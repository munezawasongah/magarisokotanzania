"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateListingAction } from "@/server/actions/listing";

export function InventoryActions({ id, status, expiresSoon }: { id: string; status: string; expiresSoon?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const act = (patch: Record<string, unknown>) => start(async () => {
    setError(null);
    const r = await updateListingAction(id, patch);
    if (!r.ok) setError(r.message);
    router.refresh();
  });
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {error && <p className="w-full text-right text-xs text-danger" role="alert">{error}</p>}
      {(status === "EXPIRED" || (status === "ACTIVE" && expiresSoon)) && <button disabled={pending} onClick={() => act({ renew: true })} className="btn-plate px-2.5 py-1.5 text-xs">Renew 60 days</button>}
      {["ACTIVE", "PENDING_REVIEW", "REJECTED", "EXPIRED", "SOLD"].includes(status) && <a href={`/dashboard/listings/${id}/edit`} className="btn-ghost px-2.5 py-1.5 text-xs">Edit</a>}
      {status === "ACTIVE" && <a href={`/dashboard/listings/${id}/promote`} className="btn-plate px-2.5 py-1.5 text-xs">Promote</a>}
      {status === "ACTIVE" && <button disabled={pending} onClick={() => act({ status: "SOLD" })} className="btn-ghost px-2.5 py-1.5 text-xs">Mark sold</button>}
      {(status === "SOLD" || status === "ARCHIVED") && <button disabled={pending} onClick={() => act({ status: "ACTIVE" })} className="btn-ghost px-2.5 py-1.5 text-xs">Relist</button>}
      {status !== "ARCHIVED" && <button disabled={pending} onClick={() => act({ status: "ARCHIVED" })} className="px-2 py-1.5 text-xs text-ink-500 hover:text-danger">Archive</button>}
    </div>
  );
}
