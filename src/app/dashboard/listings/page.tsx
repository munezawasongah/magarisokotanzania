import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getDictionary } from "@/i18n/server";
import { enumLabel } from "@/i18n";
import { getSellerInventory } from "@/server/dashboard";
import { Img } from "@/components/ui/Img";
import { Badge } from "@/components/ui/Badge";
import { InventoryActions } from "@/components/dashboard/InventoryActions";
import { formatTzsCompact } from "@/lib/money";

const TONE: Record<string, "go" | "plate" | "muted" | "danger" | "ink"> = { ACTIVE: "go", PENDING_REVIEW: "plate", DRAFT: "plate", REJECTED: "danger", SOLD: "ink", EXPIRED: "muted" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ renew?: string }> }) {
  const { renew } = await searchParams;
  const user = await requireUser("/dashboard/listings");
  const { dict } = await getDictionary();
  const rows = await getSellerInventory(user.id);
  const now = new Date();
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between"><h1 className="display text-2xl">{dict.dash.inventory}</h1><Link href="/sell" className="btn-plate">{dict.nav.sell}</Link></div>
      {rows.length === 0 ? (
        <div className="panel p-10 text-center"><p className="font-semibold">No listings yet.</p><Link href="/sell" className="btn-primary mt-4">{dict.nav.sell}</Link></div>
      ) : (
        <ul className="space-y-3">
          {rows.map((l) => {
            const featured = l.isFeatured && l.featuredUntil && l.featuredUntil > now;
            const daysLeft = l.expiresAt ? Math.ceil((l.expiresAt.getTime() - now.getTime()) / 86400_000) : null;
            const expiresSoon = l.status === "ACTIVE" && daysLeft !== null && daysLeft <= 7;
            return (
              <li key={l.id} id={`l-${l.id}`} className={`panel flex flex-col gap-4 p-3 sm:flex-row sm:items-center ${renew === l.id ? "ring-2 ring-plate-500" : ""}`}>
                <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded bg-ink-100 sm:w-32">
                  <Img src={l.images[0]?.url ?? "/placeholders/sedan.svg"} alt="" fill sizes="128px" className="object-cover" transform="c_fill,w_256,h_192" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={TONE[l.status] ?? "muted"}>{enumLabel(dict, "ListingStatus", l.status)}</Badge>
                    {featured && <Badge tone="plate">{dict.listing.featured} → {l.featuredUntil!.toLocaleDateString("en-GB")}</Badge>}
                    {l.isSponsored && <Badge tone="ink">{dict.listing.sponsored}</Badge>}
                  </div>
                  <Link href={`/cars/${l.slug}`} className="block truncate font-semibold hover:underline">{l.title}</Link>
                  <p className="text-xs text-ink-500">{formatTzsCompact(l.priceTzs)} · {l.region.name} · {l.viewCount} views · {l.whatsappClicks} WhatsApp · {l.callClicks} calls · {l.leadCount} leads</p>
                  {l.rejectionReason && l.status === "REJECTED" && <p className="text-xs text-danger">{l.rejectionReason}</p>}
                  {l.status === "ACTIVE" && l.expiresAt && (
                    <p className={`text-xs ${expiresSoon ? "font-semibold text-danger" : "text-ink-500"}`}>
                      {expiresSoon ? `Expires in ${Math.max(0, daysLeft!)} day${daysLeft === 1 ? "" : "s"} — renew to keep it live` : `Live until ${l.expiresAt.toLocaleDateString("en-GB")}`}
                    </p>
                  )}
                  {l.status === "EXPIRED" && <p className="text-xs font-semibold text-danger">Expired — buyers can no longer see it. Renew for free.</p>}
                </div>
                <InventoryActions id={l.id} status={l.status} expiresSoon={expiresSoon} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
