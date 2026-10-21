import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Calendar, Fuel, Gauge, MapPin, Ship, ShieldCheck } from "lucide-react";
import { getDictionary } from "@/i18n/server";
import { enumLabel, fmt } from "@/i18n";
import { getListingBySlug, getSimilarListings } from "@/server/listings";
import { getCurrentUser } from "@/lib/session";
import { getUsdTzsRate } from "@/lib/fx";
import { prisma } from "@/lib/prisma";
import { formatTzs, formatUsd, toNum } from "@/lib/money";
import { absoluteUrl, formatKm, timeAgo } from "@/lib/utils";
import { listingWhatsappMessage } from "@/lib/whatsapp";
import type { LandedCostResult } from "@/lib/import-cost";
import { Gallery } from "@/components/listing/Gallery";
import { PriceTag } from "@/components/ui/PriceTag";
import { Badge } from "@/components/ui/Badge";
import { CallButton, WhatsAppButton } from "@/components/listing/ContactButtons";
import { LocationMap } from "@/components/maps/LocationMap";
import { InquiryForm } from "@/components/listing/InquiryForm";
import { FinanceCalculator } from "@/components/listing/FinanceCalculator";
import { ViewTracker } from "@/components/listing/ViewTracker";
import { FavoriteButton } from "@/components/listing/FavoriteButton";
import { ReportButton } from "@/components/listing/ReportButton";
import { VehicleCard } from "@/components/listing/VehicleCard";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const l = await getListingBySlug((await params).slug);
  if (!l) return { title: "Listing not found" };
  const place = [l.district?.name, l.region.name].filter(Boolean).join(", ");
  const desc = `${l.title} for sale in ${place} — ${formatTzs(l.priceTzs)}. ${l.mileageKm ? formatKm(l.mileageKm) + ", " : ""}${l.transmission.toLowerCase()}, ${l.fuelType.toLowerCase()}.`;
  return {
    title: `${l.title} — ${formatTzs(l.priceTzs)} · ${l.region.name}`,
    description: desc,
    alternates: { canonical: `/cars/${l.slug}` },
    openGraph: { title: l.title, description: desc, images: l.images[0] ? [{ url: l.images[0].url }] : undefined },
  };
}

export default async function ListingPage({ params }: { params: Params }) {
  const { slug } = await params;
  const viewer = await getCurrentUser();
  const l = await getListingBySlug(slug, viewer);
  if (!l) notFound();
  const { dict, locale } = await getDictionary();

  const [similar, rate, fav] = await Promise.all([
    getSimilarListings(l),
    l.isImportOnOrder || l.showUsdPrice ? getUsdTzsRate() : Promise.resolve(0),
    viewer ? prisma.favorite.findUnique({ where: { userId_listingId: { userId: viewer.id, listingId: l.id } } }) : null,
  ]);

  const url = absoluteUrl(`/cars/${l.slug}`);
  const waPhone = l.contactWhatsapp ?? l.contactPhone;
  const waMsg = listingWhatsappMessage({ title: l.title, priceTzs: l.priceTzs, url, locale });
  const landed = l.landedCostBreakdown as unknown as LandedCostResult | null;
  const place = [l.district?.name, l.region.name].filter(Boolean).join(", ");

  // The key buying facts come first, in a fixed order.
  const specs: Array<[string, string | number | null | undefined]> = [
    [dict.spec.year, l.year], [dict.spec.make, l.make.name], [dict.spec.model, l.model.name],
    [dict.spec.mileage, formatKm(l.mileageKm)], [dict.spec.fuel, enumLabel(dict, "FuelType", l.fuelType)],
    [dict.spec.transmission, enumLabel(dict, "Transmission", l.transmission)], [dict.spec.condition, enumLabel(dict, "VehicleCondition", l.condition)],
    [dict.search.sellerType, enumLabel(dict, "SellerType", l.sellerType)],
    [dict.spec.trim, l.trim], [dict.spec.body, enumLabel(dict, "BodyType", l.bodyType)],
    [dict.spec.engine, l.engineCc ? `${l.engineCc.toLocaleString()} cc` : null],
    [dict.spec.drivetrain, l.drivetrain ? enumLabel(dict, "Drivetrain", l.drivetrain) : null], [dict.spec.steering, enumLabel(dict, "Steering", l.steering)],
    [dict.spec.clearance, l.groundClearanceMm ? `${l.groundClearanceMm} mm` : null], [dict.spec.color, l.colorExterior], [dict.spec.interiorColor, l.colorInterior],
    [dict.spec.doors, l.doors], [dict.spec.seats, l.seats],
    [dict.spec.origin, l.originCountry ? enumLabel(dict, "OriginCountry", l.originCountry) : null],
    [dict.spec.eta, l.etaDays ? fmt(dict.spec.days, { n: l.etaDays }) : null],
    [dict.spec.region, l.region.name], [dict.spec.district, l.district?.name],
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: l.title,
    brand: { "@type": "Brand", name: l.make.name },
    model: l.model.name,
    vehicleModelDate: String(l.year),
    bodyType: l.bodyType,
    fuelType: l.fuelType,
    vehicleTransmission: l.transmission,
    mileageFromOdometer: l.mileageKm != null ? { "@type": "QuantitativeValue", value: l.mileageKm, unitCode: "KMT" } : undefined,
    vehicleEngine: l.engineCc ? { "@type": "EngineSpecification", engineDisplacement: { "@type": "QuantitativeValue", value: l.engineCc, unitCode: "CMQ" } } : undefined,
    steeringPosition: l.steering === "RHD" ? "https://schema.org/RightHandDriving" : "https://schema.org/LeftHandDriving",
    itemCondition: l.condition === "NEW" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    image: l.images.map((i) => (i.url.startsWith("http") ? i.url : absoluteUrl(i.url))),
    description: l.description.slice(0, 500),
    offers: {
      "@type": "Offer",
      price: toNum(l.priceTzs),
      priceCurrency: "TZS",
      availability: l.status === "SOLD" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      url,
      areaServed: { "@type": "Place", name: `${l.region.name}, Tanzania` },
      seller: l.business ? { "@type": "AutoDealer", name: l.business.name } : { "@type": "Person", name: l.seller.name },
    },
  };

  return (
    <div className="container pb-24 pt-6 lg:pb-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {l.status === "ACTIVE" && !l.isOwner && <ViewTracker listingId={l.id} />}

      <nav className="mb-4 text-xs text-ink-500" aria-label="Breadcrumb">
        <Link href="/cars" className="hover:underline">{dict.nav.cars}</Link> /{" "}
        <Link href={`/cars?make=${l.make.slug}`} className="hover:underline">{l.make.name}</Link> /{" "}
        <Link href={`/cars?make=${l.make.slug}&model=${l.model.slug}`} className="hover:underline">{l.model.name}</Link>
      </nav>

      {l.status !== "ACTIVE" && (
        <div className="mb-4 rounded-md border border-plate-500 bg-plate-300/30 p-3 text-sm">
          {enumLabel(dict, "ListingStatus", l.status)}{l.rejectionReason ? ` — ${l.rejectionReason}` : ""}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-8">
          <Gallery photos={l.images} title={l.title} />

          <header className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {l.isFeatured && <Badge tone="plate">{dict.listing.featured}</Badge>}
              {l.isImportOnOrder && <Badge tone="ink"><Ship className="h-3 w-3" />{dict.listing.importOnOrder}</Badge>}
              <Badge tone={l.condition === "NEW" ? "go" : "muted"}>{enumLabel(dict, "VehicleCondition", l.condition)}</Badge>
              <Badge tone="ink">{enumLabel(dict, "SellerType", l.sellerType)}</Badge>
            </div>
            <h1 className="display text-2xl md:text-4xl">{l.title}</h1>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-700">
              <li className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-ink-300" />{l.year}</li>
              <li className="flex items-center gap-1.5"><Gauge className="h-4 w-4 text-ink-300" />{formatKm(l.mileageKm)}</li>
              <li className="flex items-center gap-1.5"><Fuel className="h-4 w-4 text-ink-300" />{enumLabel(dict, "FuelType", l.fuelType)}</li>
              <li className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-ink-300" />{place}</li>
            </ul>
            <div className="lg:hidden"><PriceTag value={l.priceTzs} size="lg" /></div>
          </header>

          <section>
            <h2 className="mb-3 text-lg font-bold">{dict.listing.specs}</h2>
            <dl className="grid grid-cols-1 divide-y divide-line overflow-hidden rounded-lg border border-line bg-white sm:grid-cols-2 sm:divide-y-0">
              {specs.filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-line px-4 py-2.5 text-sm sm:border-b sm:odd:border-r">
                  <dt className="text-ink-500">{k}</dt><dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {l.features.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold">{dict.listing.features}</h2>
              <ul className="flex flex-wrap gap-2">{l.features.map((f) => <li key={f} className="chip">{f}</li>)}</ul>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-lg font-bold">{dict.listing.description}</h2>
            <div className="max-w-prose whitespace-pre-line text-[15px] leading-7 text-ink-700">{l.description}</div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold">{l.sellerType === "INDIVIDUAL" ? dict.shop.carLocation : dict.shop.location}</h2>
            <p className="mb-3 flex items-start gap-2 text-sm text-ink-700"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-300" />{[l.locationAddress, place].filter(Boolean).join(", ")}</p>
            {l.latitude != null && l.longitude != null ? (
              <LocationMap lat={l.latitude} lng={l.longitude} label={l.title} directionsLabel={dict.shop.directions} className="h-72" />
            ) : (
              <a className="btn-ghost py-2" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${[l.locationAddress, place].filter(Boolean).join(", ")}, Tanzania`)}`}>{dict.shop.directions}</a>
            )}
          </section>

          {landed && (
            <section>
              <h2 className="mb-1 text-lg font-bold">{dict.listing.landedTitle}</h2>
              <p className="mb-3 text-xs text-ink-500">{dict.listing.landedNote} FOB ${l.fobUsd?.toLocaleString()} · USD/TZS {Math.round(landed.usdTzsRate).toLocaleString()}</p>
              <table className="w-full overflow-hidden rounded-lg border border-line bg-white text-sm">
                <tbody>
                  {landed.lines.map((line) => (
                    <tr key={line.key} className="border-b border-line last:border-0">
                      <td className="px-4 py-2 text-ink-700">{locale === "sw" ? line.labelSw : line.label}{line.note ? <span className="ml-1 text-xs text-ink-300">({line.note})</span> : null}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatTzs(line.tzs)}</td>
                    </tr>
                  ))}
                  <tr className="bg-ink-950 text-white">
                    <td className="px-4 py-3 font-semibold">Total</td>
                    <td className="px-4 py-3 text-right"><span className="plate">{formatTzs(landed.landedCostTzs)}</span></td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          <section className="panel p-5">
            <h2 className="mb-4 text-lg font-bold">{dict.listing.financeTitle}</h2>
            <FinanceCalculator price={toNum(l.priceTzs)} />
          </section>
        </div>

        {/* Contact column */}
        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <div className="panel space-y-4 p-5">
            <div>
              <PriceTag value={l.priceTzs} size="lg" />
              <p className="mt-2 text-xs text-ink-500">
                {l.priceNegotiable ? dict.listing.negotiable : ""}
                {rate > 0 && <> {l.priceNegotiable ? "· " : ""}≈ {formatUsd(toNum(l.priceTzs) / rate)}</>}
              </p>
            </div>
            {l.status === "ACTIVE" && (
              <div className="grid gap-2">
                <WhatsAppButton phone={waPhone} message={waMsg} listingId={l.id} label={dict.listing.chatWhatsapp} className="w-full py-3" />
                <CallButton phone={l.contactPhone} listingId={l.id} label={dict.listing.call} revealLabel={dict.listing.showNumber} className="w-full" />
                <FavoriteButton listingId={l.id} initial={!!fav} label={dict.listing.save} savedLabel={dict.listing.saved} />
              </div>
            )}
            <div className="border-t border-line pt-4 text-sm">
              <p className="text-xs text-ink-500">{dict.listing.seller}</p>
              {l.business ? (
                <Link href={`/shop/${l.business.slug}`} className="mt-1 flex items-center gap-1.5 font-semibold hover:underline">
                  {l.business.name}{l.business.verification === "VERIFIED" && <BadgeCheck className="h-4 w-4 text-go-600" aria-label={dict.listing.verified} />}
                </Link>
              ) : (
                <p className="mt-1 flex items-center gap-1.5 font-semibold">{l.seller.name}{l.seller.phoneVerified && <ShieldCheck className="h-4 w-4 text-go-600" aria-label="Phone verified" />}</p>
              )}
              <ul className="mt-2 space-y-1 text-xs text-ink-700">
                {l.seller.phoneVerified && <li className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-go-600" />{dict.listing.phoneVerified}</li>}
                {l.seller.walletVerifiedAt && <li className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-go-600" />{dict.listing.walletVerified}</li>}
                <li className="text-ink-500">{fmt(dict.listing.memberSince, { date: (l.business?.createdAt ?? l.seller.createdAt).toLocaleDateString(locale === "sw" ? "sw-TZ" : "en-GB", { month: "long", year: "numeric" }) })}</li>
              </ul>
              <p className="mt-1 text-xs text-ink-500">{fmt(dict.listing.postedAgo, { ago: timeAgo(l.publishedAt ?? l.createdAt, locale) })} · {fmt(dict.listing.views, { n: l.viewCount })}</p>
            </div>
          </div>

          {l.status === "ACTIVE" && !l.isOwner && (
            <div className="panel p-5">
              <h2 className="mb-3 text-base font-bold">{dict.inquiry.title}</h2>
              <InquiryForm target={{ listingId: l.id }} defaultName={viewer?.name ?? undefined} defaultPhone={viewer?.phone ?? undefined} />
            </div>
          )}

          <div className="rounded-lg border border-plate-500/60 bg-plate-300/20 p-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4" />{dict.listing.safetyTitle}</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-xs leading-5 text-ink-700">{dict.listing.safety.map((s) => <li key={s}>{s}</li>)}</ul>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
              <Link href="/services?category=PRE_PURCHASE_INSPECTION" className="underline">{dict.listing.requestInspection}</Link>
              <Link href="/safety" className="underline">{dict.legal.readSafety}</Link>
            </div>
          </div>
          <ReportButton listingId={l.id} label={dict.listing.report} />
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-xl font-bold">{dict.listing.similar}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{similar.slice(0, 8).map((s) => <VehicleCard key={s.id} listing={s} dict={dict} locale={locale} />)}</div>
        </section>
      )}

      {/* Mobile sticky contact bar */}
      {l.status === "ACTIVE" && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-line bg-white p-3 lg:hidden">
          <WhatsAppButton phone={waPhone} message={waMsg} listingId={l.id} label={dict.listing.whatsapp} className="flex-1" />
          <CallButton phone={l.contactPhone} listingId={l.id} label={dict.listing.call} revealLabel={dict.listing.call} className="flex-1" />
        </div>
      )}
    </div>
  );
}
