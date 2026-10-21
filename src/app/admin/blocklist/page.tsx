import { prisma } from "@/lib/prisma";
import { addBlocklistAction, removeBlocklistAction } from "@/server/actions/admin";
import { BlockType } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/Badge";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "Blocklist" };

const HELP: Record<string, string> = {
  PHONE: "Any format, e.g. 0712 345 678 — blocks login, listings, payments and messages from this number",
  EMAIL: "Blocks sign-up and listings with this email",
  KEYWORD: "Any listing or message containing this phrase is held as high risk (e.g. a scammer's bank name or catchphrase)",
  CHASSIS: "Blocks any listing with this chassis / VIN",
  DEVICE: "Device fingerprint (added automatically when you ban an account)",
  IMAGE_HASH: "Photo fingerprint (added automatically when you ban an account)",
};

export default async function BlocklistPage({ searchParams }: { searchParams: Promise<{ type?: string; q?: string; error?: string }> }) {
  const { type, q, error } = await searchParams;
  const valid = type && type in BlockType ? (type as BlockType) : undefined;
  const [rows, counts] = await Promise.all([
    prisma.blocklist.findMany({
      where: { type: valid, ...(q ? { OR: [{ value: { contains: q, mode: "insensitive" } }, { reason: { contains: q, mode: "insensitive" } }] } : {}) },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.blocklist.groupBy({ by: ["type"], _count: { _all: true } }),
  ]);
  const count = (t: string) => counts.find((c) => c.type === t)?._count._all ?? 0;

  return (
    <div className="space-y-5">
      <h1 className="display text-2xl">Blocklist</h1>
      {error && <p className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
      <form action={addBlocklistAction} className="panel grid gap-3 p-4 sm:grid-cols-[160px_1fr_1fr_110px_auto]">
        <select name="type" className="field" defaultValue="PHONE" aria-label="Type">
          {(["PHONE", "EMAIL", "KEYWORD", "CHASSIS"] as const).map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input name="value" className="field" placeholder="Value" required />
        <input name="reason" className="field" placeholder="Reason (optional)" />
        <select name="days" className="field" defaultValue="0" aria-label="Duration">
          <option value="0">Permanent</option><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option>
        </select>
        <button className="btn-danger">Block</button>
        <ul className="space-y-0.5 text-xs text-ink-500 sm:col-span-5">
          {(["PHONE", "KEYWORD", "CHASSIS"] as const).map((t) => <li key={t}><strong>{t}:</strong> {HELP[t]}</li>)}
        </ul>
      </form>

      <div className="flex flex-wrap items-center gap-1.5">
        <a href="/admin/blocklist" className={`chip ${!valid ? "border-ink-900 bg-ink-900 text-white" : ""}`}>All</a>
        {Object.values(BlockType).map((t) => (
          <a key={t} href={`/admin/blocklist?type=${t}`} className={`chip ${valid === t ? "border-ink-900 bg-ink-900 text-white" : ""}`}>{t} <span className="opacity-60">{count(t)}</span></a>
        ))}
        <form action="/admin/blocklist" className="ml-auto flex gap-2">
          {valid && <input type="hidden" name="type" value={valid} />}
          <input name="q" defaultValue={q} className="field w-48 py-1.5" placeholder="Search" />
        </form>
      </div>

      <ul className="panel divide-y divide-line">
        {rows.length === 0 && <li className="p-8 text-center text-sm text-ink-500">Nothing blocked yet.</li>}
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="flex items-center gap-2"><Badge>{r.type}</Badge><code className="break-all text-ink-900">{r.value}</code></p>
              <p className="mt-0.5 text-xs text-ink-500">
                {r.reason ?? "—"} · {r.createdBy?.name ?? "system"} · {timeAgo(r.createdAt)}
                {r.expiresAt ? ` · expires ${r.expiresAt.toLocaleDateString("en-GB")}` : ""}
                {r.sourceUserId ? " · from banned account" : ""}
              </p>
            </div>
            <form action={removeBlocklistAction}><input type="hidden" name="id" value={r.id} /><button className="text-xs text-ink-500 underline hover:text-danger">Remove (admin)</button></form>
          </li>
        ))}
      </ul>
    </div>
  );
}
