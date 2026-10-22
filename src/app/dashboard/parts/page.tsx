import Link from "next/link";
import { Wrench } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getDictionary } from "@/i18n/server";
import { enumLabel } from "@/i18n";
import { getMyParts } from "@/server/parts";
import { Img } from "@/components/ui/Img";
import { Badge } from "@/components/ui/Badge";
import { PartActions } from "@/components/dashboard/PartActions";
import { formatTzs } from "@/lib/money";

export const metadata = { title: "My spare parts", robots: { index: false } };

export default async function MyPartsPage() {
  const user = await requireUser("/dashboard/parts");
  const { dict } = await getDictionary();
  const parts = await getMyParts(user.id);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-2xl">{dict.dash.parts}</h1>
        <Link href="/dashboard/parts/new" className="btn-plate">List a spare part</Link>
      </div>
      {parts.length === 0 ? (
        <div className="panel p-10 text-center"><p className="font-semibold">No spare parts listed yet.</p><Link href="/dashboard/parts/new" className="btn-primary mt-4">List a spare part</Link></div>
      ) : (
        <ul className="space-y-3">
          {parts.map((p) => (
            <li key={p.id} className="panel flex flex-col gap-4 p-3 sm:flex-row sm:items-center">
              <div className="relative flex aspect-[4/3] w-full shrink-0 items-center justify-center overflow-hidden rounded bg-ink-100 text-ink-300 sm:w-28">
                {p.images[0] ? <Img src={p.images[0]} alt="" fill sizes="112px" className="object-cover" transform="c_pad,b_white,w_224,h_168" /> : <Wrench className="h-8 w-8" />}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={p.status === "ACTIVE" ? "go" : "muted"}>{p.status === "ACTIVE" ? dict.parts.inStock : dict.parts.outOfStock}</Badge>
                  <Badge>{enumLabel(dict, "PartCategory", p.category)}</Badge>
                </div>
                <Link href={`/parts/${p.slug}`} className="block truncate font-semibold hover:underline">{p.title}</Link>
                <p className="text-xs text-ink-500">{formatTzs(p.priceTzs)}{p.partNumber ? ` · ${p.partNumber}` : ""} · {p.viewCount} views · {p._count.inquiries} inquiries</p>
              </div>
              <PartActions id={p.id} status={p.status} stockQty={p.stockQty} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
