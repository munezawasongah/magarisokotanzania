import Link from "next/link";
import { getModerationQueue } from "@/server/admin";
import { moderateListingAction } from "@/server/actions/admin";
import { Img } from "@/components/ui/Img";
import { Badge } from "@/components/ui/Badge";
import { formatTzs } from "@/lib/money";
import { formatTzPhone } from "@/lib/phone";
import { RiskBadge, RiskReasons } from "@/components/admin/RiskBadge";

export default async function ModerationPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const queue = await getModerationQueue();
  return (
    <div className="space-y-5">
      <h1 className="display text-2xl">Moderation queue <span className="text-ink-300">({queue.length})</span></h1>
      {error && <p className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger" role="alert">{error}</p>}
      {queue.length === 0 && <p className="panel p-8 text-center text-sm text-ink-500">All caught up.</p>}
      <ul className="space-y-4">
        {queue.map((l) => (
          <li key={l.id} className="panel grid gap-4 p-4 md:grid-cols-[200px_1fr_260px]">
            <div className="grid grid-cols-2 gap-1">
              {l.images.length ? l.images.map((i) => (
                <div key={i.id} className="relative aspect-[4/3] overflow-hidden rounded bg-ink-100"><Img src={i.url} alt="" fill sizes="100px" className="object-cover" transform="c_fill,w_200,h_150" /></div>
              )) : <p className="col-span-2 text-xs text-danger">No photos</p>}
            </div>
            <div className="min-w-0 space-y-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <RiskBadge level={l.riskLevel} score={l.riskScore} />
                {l.seller.walletVerifiedAt && <span className="text-xs text-go-700">wallet verified</span>}
              </div>
              <Link href={`/cars/${l.slug}`} className="text-base font-semibold hover:underline">{l.title}</Link>
              <p><span className="plate text-sm">{formatTzs(l.priceTzs)}</span> <span className="text-ink-500">· {l.make.name} {l.model.name} {l.year} · {l.region.name}</span></p>
              <p className="line-clamp-3 text-ink-700">{l.description}</p>
              <p className="text-xs text-ink-500">
                Seller: {l.business ? `${l.business.name} (${l.business.verification})` : l.seller.name} · {l.seller.phone ? formatTzPhone(l.seller.phone) : "no phone"} · member since {l.seller.createdAt.toLocaleDateString("en-GB")} · {l.seller._count.listings} listings
              </p>
              {l.chassisNumber && <p className="text-xs">Chassis: <code>{l.chassisNumber}</code></p>}
              {l._count.reports > 0 && <Badge tone="danger">{l._count.reports} reports</Badge>}
              <div className="rounded-md bg-paper p-2"><RiskReasons reasons={l.riskReasons} /></div>
            </div>
            <div className="space-y-2">
              <form action={moderateListingAction}>
                <input type="hidden" name="id" value={l.id} /><input type="hidden" name="decision" value="APPROVE" />
                <button className="btn w-full bg-go-600 text-white hover:bg-go-700">Approve</button>
              </form>
              <form action={moderateListingAction} className="space-y-2">
                <input type="hidden" name="id" value={l.id} /><input type="hidden" name="decision" value="REJECT" />
                <select name="reason" className="field py-2 text-xs" defaultValue="">
                  <option value="">Reason…</option>
                  <option>Photos are not of the actual vehicle</option>
                  <option>Price is unrealistic</option>
                  <option>Missing or misleading details</option>
                  <option>Duplicate listing</option>
                  <option>Suspected scam</option>
                </select>
                <button className="btn-danger w-full">Reject</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
