import Link from "next/link";
import type { ListingCardRow } from "@/server/listings";
import { Img } from "@/components/ui/Img";
import { PriceTag } from "@/components/ui/PriceTag";
import { formatKm } from "@/lib/utils";

/** Small card for the "Just listed" strip near the top of the home page: photo, price, title, year · km · place. */
export function CompactCard({ listing: l, priority }: { listing: ListingCardRow; priority?: boolean }) {
  return (
    <Link href={`/cars/${l.slug}`} className="group block overflow-hidden rounded-md border border-line bg-white transition-shadow hover:shadow-lift">
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-100">
        <Img src={l.images[0]?.url ?? "/placeholders/sedan.svg"} alt={l.images[0]?.alt ?? l.title} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw" className="object-cover transition-transform duration-300 group-hover:scale-105" transform="f_auto,q_auto,c_fill,w_400,h_300" priority={priority} />
      </div>
      <div className="space-y-1 p-2">
        <PriceTag value={l.priceTzs} compact size="sm" />
        <p className="truncate text-sm font-semibold text-ink-900 group-hover:underline">{l.make.name} {l.model.name}</p>
        <p className="truncate text-2xs text-ink-500 tabular-nums">{l.year} · {formatKm(l.mileageKm)} · {l.region.name}</p>
      </div>
    </Link>
  );
}
