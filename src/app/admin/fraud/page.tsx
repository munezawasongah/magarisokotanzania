import Link from "next/link";
import { getBannedUsers, getFraudQueue, getHeldInquiries } from "@/server/admin";
import { banUserAction, clearFlaggedListingAction, rejectFlaggedListingAction, releaseInquiryAction, rescoreListingAction, unbanUserAction } from "@/server/actions/admin";
import { RiskBadge, RiskReasons } from "@/components/admin/RiskBadge";
import { Img } from "@/components/ui/Img";
import { Badge } from "@/components/ui/Badge";
import { formatTzs } from "@/lib/money";
import { formatTzPhone } from "@/lib/phone";
import { timeAgo } from "@/lib/utils";
import { RISK_THRESHOLDS } from "@/config/fraud";

export const metadata = { title: "Fraud" };

export default async function FraudPage({ searchParams }: { searchParams: Promise<{ tab?: string; error?: string }> }) {
  const { tab = "listings", error } = await searchParams;
  const [{ listings, links }, inquiries, banned] = await Promise.all([getFraudQueue(), getHeldInquiries(), getBannedUsers()]);
  const tabs = [
    ["listings", `Flagged listings (${listings.length})`],
    ["inquiries", `Held messages (${inquiries.filter((i) => i.isHeld).length})`],
    ["banned", `Banned accounts (${banned.length})`],
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-2xl">Fraud prevention</h1>
        <p className="mt-1 text-sm text-ink-500">
          Scores add up from the signals below. {RISK_THRESHOLDS.MEDIUM}+ is held for review, {RISK_THRESHOLDS.HIGH}+ is high risk. Banning blocklists every phone, device, email, chassis number and photo the account used.
        </p>
      </div>
      {error && <p className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger" role="alert">{error}</p>}
      <nav className="flex flex-wrap gap-1.5">
        {tabs.map(([k, label]) => (
          <Link key={k} href={`/admin/fraud?tab=${k}`} className={`chip ${tab === k ? "border-ink-900 bg-ink-900 text-white" : ""}`}>{label}</Link>
        ))}
        <Link href="/admin/blocklist" className="chip">Blocklist →</Link>
      </nav>

      {tab === "listings" && (
        <ul className="space-y-4">
          {listings.length === 0 && <li className="panel p-8 text-center text-sm text-ink-500">No flagged listings. 🎉</li>}
          {listings.map((l) => {
            const s = l.seller;
            const linked = links[s.id] ?? [];
            return (
              <li key={l.id} className={`panel grid gap-4 p-4 lg:grid-cols-[160px_1fr_280px] ${l.riskLevel === "HIGH" ? "border-danger/50" : ""}`}>
                <div className="grid grid-cols-3 gap-1 lg:grid-cols-1">
                  {l.images.map((i, k) => (
                    <div key={k} className="relative aspect-[4/3] overflow-hidden rounded bg-ink-100"><Img src={i.url} alt="" fill sizes="160px" className="object-cover" transform="c_fill,w_320,h_240" /></div>
                  ))}
                </div>
                <div className="min-w-0 space-y-2 text-sm">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <RiskBadge level={l.riskLevel} score={l.riskScore} />
                    <Badge tone={l.status === "ACTIVE" ? "go" : "muted"}>{l.status === "PENDING_REVIEW" ? "Held" : l.status}</Badge>
                    {l._count.reports > 0 && <Badge tone="danger">{l._count.reports} report(s)</Badge>}
                  </div>
                  <Link href={`/cars/${l.slug}`} target="_blank" className="block text-base font-semibold hover:underline">{l.title}</Link>
                  <p><span className="plate text-sm">{formatTzs(l.priceTzs)}</span> <span className="text-xs text-ink-500">· contact {formatTzPhone(l.contactPhone)} · {timeAgo(l.createdAt)}</span></p>
                  <RiskReasons reasons={l.riskReasons} />
                  <div className="rounded-md bg-paper p-3 text-xs">
                    <p className="font-semibold text-ink-900">
                      Seller: {l.business ? `${l.business.name} (${l.business.verification})` : s.name}
                      {s.isShadowBanned && <Badge tone="danger" className="ml-2">on hold</Badge>}
                    </p>
                    <p className="text-ink-500">
                      {s.phone ? formatTzPhone(s.phone) : "no phone"}{s.email ? ` · ${s.email}` : ""} · joined {timeAgo(s.createdAt)} · {s._count.listings} listings · {s._count.devices} device(s) · wallet {s.walletVerifiedAt ? "verified" : "not verified"}
                    </p>
                    {linked.length > 0 && (
                      <div className="mt-2">
                        <p className="font-semibold text-danger">Linked accounts ({linked.length})</p>
                        <ul className="mt-1 space-y-0.5">
                          {linked.slice(0, 6).map((x) => (
                            <li key={x.id}>{x.name} · {x.phone ? formatTzPhone(x.phone) : "—"} · {x.reasons.join(", ")}{x.status !== "ACTIVE" || x.isShadowBanned ? <span className="font-semibold text-danger"> · BANNED</span> : ""}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <form action={clearFlaggedListingAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <button className="btn w-full bg-go-600 text-white hover:bg-go-700">{l.status === "PENDING_REVIEW" ? "Genuine — publish" : "Genuine — clear flags"}</button>
                  </form>
                  <form action={rejectFlaggedListingAction} className="flex gap-2">
                    <input type="hidden" name="id" value={l.id} />
                    <input name="reason" className="field py-2 text-xs" placeholder="Reason" defaultValue="Suspected fraud" />
                    <button className="btn-ghost px-3 text-xs">Reject</button>
                  </form>
                  <form action={banUserAction} className="space-y-2 rounded-md border border-danger/30 p-2">
                    <input type="hidden" name="userId" value={s.id} />
                    <input name="reason" className="field py-2 text-xs" placeholder="Ban reason" defaultValue="Scam listing" />
                    <div className="grid grid-cols-2 gap-2">
                      <button name="mode" value="BAN" className="btn-danger px-2 text-xs">Ban seller</button>
                      <button name="mode" value="SHADOW" className="btn-ghost px-2 text-xs">Shadow-ban</button>
                    </div>
                  </form>
                  <form action={rescoreListingAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <button className="w-full text-xs text-ink-500 underline">Re-run checks</button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {tab === "inquiries" && (
        <ul className="panel divide-y divide-line">
          {inquiries.length === 0 && <li className="p-8 text-center text-sm text-ink-500">No suspicious messages.</li>}
          {inquiries.map((q) => (
            <li key={q.id} className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={q.isHeld ? "danger" : "plate"}>{q.isHeld ? "Held" : "Delivered with warning"} · {q.riskScore}</Badge>
                  <span className="font-semibold">{q.name}</span> <span className="text-ink-500">{formatTzPhone(q.phone)} · {timeAgo(q.createdAt)}</span>
                </p>
                <p className="mt-1 text-xs text-ink-500">To: {q.listing?.title ?? q.part?.title ?? "business"}</p>
                <p className="mt-1 whitespace-pre-line text-ink-700">{q.message}</p>
                {q.sellerNote && <p className="mt-1 text-xs text-danger">{q.sellerNote}</p>}
              </div>
              {q.isHeld && (
                <form action={releaseInquiryAction}><input type="hidden" name="id" value={q.id} /><button className="btn-ghost py-1.5 text-xs">Release to seller</button></form>
              )}
            </li>
          ))}
        </ul>
      )}

      {tab === "banned" && (
        <ul className="panel divide-y divide-line">
          {banned.length === 0 && <li className="p-8 text-center text-sm text-ink-500">No banned accounts.</li>}
          {banned.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div>
                <p className="font-semibold">{u.name} <Badge tone="danger" className="ml-1">{u.status === "SUSPENDED" ? "Banned" : "Shadow-banned"}</Badge></p>
                <p className="text-xs text-ink-500">{u.phone ? formatTzPhone(u.phone) : "—"}{u.email ? ` · ${u.email}` : ""} · {u._count.listings} listings · {u.bannedAt ? timeAgo(u.bannedAt) : ""}{u.banReason ? ` · ${u.banReason}` : ""}</p>
              </div>
              <form action={unbanUserAction}><input type="hidden" name="userId" value={u.id} /><button className="btn-ghost py-1.5 text-xs">Lift ban (admin)</button></form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
