"use client";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { ShopForm, type ShopKind, type ShopValues, type SubmitResult } from "./ShopForm";

type RegionOpt = { id: number; name: string; districts: Array<{ id: number; name: string }> };

/** Edit an approved mini-site (PUT /api/shop). */
export function ShopEditor({ kind, regions, initial }: { kind: ShopKind; regions: RegionOpt[]; initial: ShopValues }) {
  const { dict } = useI18n();
  const router = useRouter();
  async function save(payload: Record<string, unknown>): Promise<SubmitResult> {
    const r = await fetch("/api/shop", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: data.error ?? dict.common.error, fieldErrors: data.details };
    router.refresh();
    return { ok: true };
  }
  return <ShopForm kind={kind} regions={regions} initial={initial} onSubmit={save} submitLabel={dict.shop.save} />;
}
