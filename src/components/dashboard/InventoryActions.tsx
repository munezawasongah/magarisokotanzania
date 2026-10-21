"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateListingAction } from "@/server/actions/listing";

export function InventoryActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const act = (patch: Record<string, unknown>) => start(async () => { await updateListingAction(id, patch); router.refresh(); });
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {status === "ACTIVE" && <a href={`/dashboard/listings/${id}/promote`} className="btn-plate px-2.5 py-1.5 text-xs">Promote</a>}
      {status === "ACTIVE" && <button disabled={pending} onClick={() => act({ status: "SOLD" })} className="btn-ghost px-2.5 py-1.5 text-xs">Mark sold</button>}
      {(status === "SOLD" || status === "EXPIRED" || status === "ARCHIVED") && <button disabled={pending} onClick={() => act({ status: "ACTIVE" })} className="btn-ghost px-2.5 py-1.5 text-xs">Relist</button>}
      {status !== "ARCHIVED" && <button disabled={pending} onClick={() => act({ status: "ARCHIVED" })} className="px-2 py-1.5 text-xs text-ink-500 hover:text-danger">Archive</button>}
    </div>
  );
}
