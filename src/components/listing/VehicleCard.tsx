import Link from "next/link";
import { Calendar, Cog, Fuel, Gauge, MapPin, Ship } from "lucide-react";
import type { ListingCardRow } from "@/server/listings";
import { Img } from "@/components/ui/Img";
import { PriceTag } from "@/components/ui/PriceTag";
import { Badge } from "@/components/ui/Badge";
import { VerifiedMark } from "@/components/ui/VerifiedMark";
import { CallButton, WhatsAppButton } from "./ContactButtons";
import { CompareToggle } from "@/components/compare/CompareToggle";
import { enumLabel, type Dictionary, type Locale } from "@/i18n";
import { listingWhatsappMessage } from "@/lib/whatsapp";
import { absoluteUrl, formatKm } from "@/lib/utils";
import type { Serialized } from "@/lib/json";

type Card = ListingCardRow | Serialized<ListingCardRow>;

/**
 * Responsive vehicle card: photo, plate-style TZS price, key specs, location tag
 * and a one-tap WhatsApp inquiry pre-filled with the listing title and link.
 * Horizontal on wide list views (`layout="row"`), stacked in grids.
 */
export function VehicleCard({ listing: l, dict, locale, layout = "grid", priority }: { listing: Card; dict: Dictionary; locale: Locale; layout?: "grid" | "row"; priority?: boolean }) {
  const url = `/cars/${l.slug}`;
  const featured = l.isFeatured && (!l.featuredUntil || new Date(l.featuredUntil) > new Date());
  const cover = l.images[0]?.url ?? "/placeholders/sedan.svg";
  const place = [l.district?.name, l.region.name].filter(Boolean).join(", ");
  const waPhone = l.contactWhatsapp ?? l.contactPhone;

  return (
    <article className={`group relative flex overflow-hidden rounded-lg border bg-white transition-shadow hover:shadow-lift ${featured ? "border-plate-500" : "border-line"} ${layout === "row" ? "flex-col sm:flex-row" : "flex-col"}`}>
      <Link href={url} className={`relative block shrink-0 overflow-hidden bg-ink-100 ${layout === "row" ? "aspect-[4/3] sm:w-72" : "aspect-[4/3]"}`}>
        <Img src={cover} alt={l.images[0]?.alt ?? l.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover" transform="f_auto,q_auto,c_fill,w_640,h_480" priority={priority} />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {featured && <Badge tone="plate">{dict.listing.featured}</Badge>}
          {l.isSponsored && <Badge tone="ink">{dict.listing.sponsored}</Badge>}
          {l.isImportOnOrder && <Badge tone="ink"><Ship className="h-3 w-3" />{dict.listing.importOnOrder}</Badge>}
        </div>
        {l._count.images > 1 && <span className="absolute bottom-2 right-2 rounded bg-ink-950/70 px-1.5 py-0.5 text-2xs font-medium text-white">{l._count.images} 📷</span>}
      </Link>
      <CompareToggle id={l.id} className="absolute right-2 top-2 z-20" />

      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500">{l.make.name} · {l.model.name}</p>
          <h3 className="mt-0.5 line-clamp-1 text-[15px] font-semibold leading-snug">
            <Link href={url} className="after:absolute after:inset-0 after:content-['']">{l.title}</Link>
          </h3>
        </div>

        <div className="flex items-end justify-between gap-2">
          <PriceTag value={l.priceTzs} compact={layout === "grid"} />
          {l.priceNegotiable && <span className="text-2xs text-ink-500">{dict.listing.negotiable}</span>}
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-ink-700">
          <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 shrink-0 text-ink-300" aria-hidden /><dt className="sr-only">{dict.spec.year}</dt><dd className="tabular-nums">{l.year}</dd></div>
          <div className="flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5 shrink-0 text-ink-300" aria-hidden /><dt className="sr-only">{dict.spec.mileage}</dt><dd className="tabular-nums">{formatKm(l.mileageKm)}</dd></div>
          <div className="flex items-center gap-1.5"><Fuel className="h-3.5 w-3.5 shrink-0 text-ink-300" aria-hidden /><dt className="sr-only">{dict.spec.fuel}</dt><dd className="truncate">{enumLabel(dict, "FuelType", l.fuelType)}</dd></div>
          <div className="flex items-center gap-1.5"><Cog className="h-3.5 w-3.5 shrink-0 text-ink-300" aria-hidden /><dt className="sr-only">{dict.spec.transmission}</dt><dd className="truncate">{enumLabel(dict, "Transmission", l.transmission)}</dd></div>
        </dl>

        <div className="flex flex-wrap gap-1.5">
          <Badge tone={l.condition === "NEW" ? "go" : "muted"}>{enumLabel(dict, "VehicleCondition", l.condition)}</Badge>
          <Badge tone="ink">{enumLabel(dict, "SellerType", l.sellerType)}</Badge>
        </div>

        <div className="mt-auto space-y-2.5 border-t border-line pt-3">
          <div className="min-w-0 text-xs">
            <p className="flex items-center gap-1 truncate text-ink-700"><MapPin className="h-3.5 w-3.5 shrink-0 text-ink-300" />{place}</p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-ink-500">
              {l.business?.name ?? enumLabel(dict, "SellerType", l.sellerType)}
              {l.business?.verification === "VERIFIED" && <VerifiedMark label={dict.listing.verified} />}
            </p>
          </div>
          <div className="relative z-10 flex gap-2">
            <CallButton compact className="min-w-0 flex-1 justify-center text-xs" phone={l.contactPhone} listingId={l.id} label={dict.listing.call} />
            <WhatsAppButton
              compact
              iconOnly
              className="shrink-0"
              phone={waPhone}
              listingId={l.id}
              label={dict.listing.whatsapp}
              message={listingWhatsappMessage({ title: l.title, priceTzs: l.priceTzs, url: absoluteUrl(url), locale })}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
