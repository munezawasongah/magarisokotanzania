import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock, Globe, Mail, MapPin, Phone } from "lucide-react";
import { getDictionary } from "@/i18n/server";
import { enumLabel, fmt } from "@/i18n";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import { Stars } from "@/components/ui/Stars";
import { getBusinessBySlug } from "@/server/businesses";
import { searchListings } from "@/server/listings";
import { searchParts } from "@/server/parts";
import { listingFilterSchema, partFilterSchema, parseSearchParams } from "@/lib/validation";
import { getCurrentUser } from "@/lib/session";
import { whatsappLink } from "@/lib/whatsapp";
import { formatTzPhone } from "@/lib/phone";
import { formatTzs } from "@/lib/money";
import { absoluteUrl } from "@/lib/utils";
import { VehicleCard } from "@/components/listing/VehicleCard";
import { PartCard } from "@/components/parts/PartCard";
import { InquiryForm } from "@/components/listing/InquiryForm";
import { Pagination } from "@/components/ui/Pagination";
import { Img } from "@/components/ui/Img";
import { WhatsAppIcon } from "@/components/ui/icons";
import { LocationMap } from "@/components/maps/LocationMap";

type Params = Promise<{ slug: string }>;
type SP = Promise<Record<string, string | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const b = await getBusinessBySlug((await params).slug);
  if (!b) return { title: "Not found" };
  return {
    title: `${b.name} — ${b.region.name}`,
    description: b.tagline ?? b.description?.slice(0, 160) ?? `${b.name} on MagariSOKO Tanzania`,
    openGraph: b.coverUrl || b.logoUrl ? { images: [b.coverUrl ?? b.logoUrl!] } : undefined,
  };
}

function hoursText(h: unknown): string | null {
  if (!h || typeof h !== "object") return null;
  const o = h as Record<string, string>;
  if (o.text) return o.text;
  const parts = Object.entries(o).map(([d, v]) => `${d}: ${v}`);
  return parts.length ? parts.join(" · ") : null;
}

/** Each approved seller's mini-site: contacts, physical location with map, and all their listings with prices. */
export default async function MiniSitePage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const b = await getBusinessBySlug((await params).slug);
  if (!b) notFound();
  const sp = await searchParams;
  const { dict, locale } = await getDictionary();
  const t = dict.shop;
  const viewer = await getCurrentUser();
  const [cars, parts] = await Promise.all([
    b._count.listings > 0 ? searchListings(parseSearchParams(listingFilterSchema, { ...sp, business: b.slug } as Record<string, string>), { facets: false }) : null,
    b._count.parts > 0 ? searchParts(parseSearchParams(partFilterSchema, { vendor: b.slug, page: sp.ppage } as Record<string, string>)) : null,
  ]);
  const wa = b.whatsapp ?? b.phone;
  const hours = hoursText(b.openingHours);
  const place = [b.address, b.district?.name, b.region.name].filter(Boolean).join(", ");
  const isPrivate = b.type === "PRIVATE_SELLER";
  const isService = ["SERVICE_PROVIDER", "INSPECTION_CENTER", "FINANCE_INSURANCE"].includes(b.type);
  const nothing = !cars?.total && !parts?.total && b.services.length === 0;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": isService ? "AutoRepair" : b.type === "PARTS_VENDOR" ? "AutoPartsStore" : "AutoDealer",
    name: b.name, telephone: b.phone, url: absoluteUrl(`/shop/${b.slug}`), image: b.coverUrl ?? b.logoUrl ?? undefined,
    address: { "@type": "PostalAddress", streetAddress: b.address ?? undefined, addressLocality: b.district?.name ?? b.region.name, addressRegion: b.region.name, addressCountry: "TZ" },
    geo: b.latitude != null && b.longitude != null ? { "@type": "GeoCoordinates", latitude: b.latitude, longitude: b.longitude } : undefined,
    makesOffer: b.services.map((s) => ({ "@type": "Offer", name: s.title, price: Number(s.priceFromTzs), priceCurrency: "TZS" })),
    aggregateRating: b.ratingCount ? { "@type": "AggregateRating", ratingValue: b.ratingAvg, reviewCount: b.ratingCount, bestRating: 5, worstRating: 1 } : undefined,
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="relative overflow-hidden bg-ink-950 text-white">
        {b.coverUrl && (
          <div className="absolute inset-0">
            <Img src={b.coverUrl} alt="" fill sizes="100vw" className="object-cover opacity-35" transform="f_auto,q_auto,c_fill,w_1600,h_600" priority />
          </div>
        )}
        <div className="container relative flex flex-col gap-6 py-10 md:flex-row md:items-end md:justify-between md:py-14">
          <div className="flex min-w-0 items-end gap-4">
            {b.logoUrl && (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 border-white bg-white md:h-24 md:w-24">
                <Img src={b.logoUrl} alt={`${b.name} logo`} fill sizes="96px" className="object-cover" transform="f_auto,q_auto,c_fill,w_200,h_200" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm text-ink-300">{enumLabel(dict, "BusinessType", b.type)}</p>
              <h1 className="display mt-1 flex items-center gap-2 break-words text-3xl text-white md:text-5xl">
                {b.name}{b.verification === "VERIFIED" && <BadgeCheck className="h-7 w-7 shrink-0 text-go-500" aria-label={dict.listing.verified} />}
              </h1>
              {b.tagline && <p className="mt-2 max-w-xl text-ink-100">{b.tagline}</p>}
              {b.ratingCount > 0 && (
                <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm text-ink-100 hover:text-white">
                  <Stars value={b.ratingAvg} /> <span className="tabular-nums">{b.ratingAvg.toFixed(1)}</span> · {b.ratingCount === 1 ? dict.reviews.countOne : fmt(dict.reviews.count, { n: b.ratingCount })}
                </a>
              )}
              <p className="mt-3 flex items-start gap-1.5 text-sm text-ink-100"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{place}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="btn-plate tabular-nums" href={`tel:${b.phone}`}><Phone className="h-4 w-4" />{formatTzPhone(b.phone)}</a>
            <a className="btn-wa" target="_blank" rel="noopener noreferrer" href={whatsappLink(wa, `Habari ${b.name}, nimeona ukurasa wenu kwenye MagariSOKO Tanzania.`)}><WhatsAppIcon />WhatsApp</a>
          </div>
        </div>
      </section>

      <div className="container grid gap-8 py-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-10">
          {b.services.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-bold">{t.servicesTitle}</h2>
              <ul className="divide-y divide-line rounded-lg border border-line bg-white">
                {b.services.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0">
                      <span className="font-semibold">{s.title}</span>
                      <span className="block text-xs text-ink-500">{enumLabel(dict, "ServiceCategory", s.category)}{s.mobileService ? ` · ${dict.services.mobile}` : ""}{s.makes.length ? ` · ${s.makes.join(", ")}` : ""}</span>
                    </span>
                    <span className="plate shrink-0 text-sm">{dict.services.from} {formatTzs(s.priceFromTzs)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {cars && cars.total > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-bold">{t.vehicles} <span className="text-ink-500">({cars.total})</span></h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cars.items.map((l) => <VehicleCard key={l.id} listing={l} dict={dict} locale={locale} />)}</div>
              <Pagination page={cars.page} pages={cars.pages} basePath={`/shop/${b.slug}`} params={sp as Record<string, string>} dict={dict} />
            </section>
          )}
          {parts && parts.total > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-bold">{t.partsTitle} <span className="text-ink-500">({parts.total})</span></h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{parts.items.map((p) => <PartCard key={p.id} part={p} dict={dict} locale={locale} />)}</div>
            </section>
          )}
          {nothing && <p className="panel p-6 text-sm text-ink-500">{t.noItems}</p>}
          <ReviewsSection businessId={b.id} slug={b.slug} ratingAvg={b.ratingAvg} ratingCount={b.ratingCount} viewerId={viewer?.id} dict={dict} />
        </div>

        <aside className="space-y-4">
          <div className="panel space-y-3 p-5 text-sm">
            <h2 className="font-bold">{t.contact}</h2>
            <a href={`tel:${b.phone}`} className="flex items-center gap-2 font-semibold tabular-nums hover:underline"><Phone className="h-4 w-4 text-ink-300" />{formatTzPhone(b.phone)}</a>
            {b.whatsapp && b.whatsapp !== b.phone && (
              <a href={whatsappLink(b.whatsapp, `Habari ${b.name}`)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 tabular-nums hover:underline"><WhatsAppIcon className="h-4 w-4 text-go-600" />{formatTzPhone(b.whatsapp)}</a>
            )}
            {b.email && <a href={`mailto:${b.email}`} className="flex items-center gap-2 break-all hover:underline"><Mail className="h-4 w-4 shrink-0 text-ink-300" />{b.email}</a>}
            {b.website && <a href={b.website} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-2 break-all hover:underline"><Globe className="h-4 w-4 shrink-0 text-ink-300" />{b.website.replace(/^https?:\/\//, "")}</a>}
            {hours && <p className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink-300" /><span><span className="block text-xs text-ink-500">{t.hoursLabel}</span>{hours}</span></p>}
            {b.importCountries.length > 0 && <p className="text-ink-700"><span className="block text-xs text-ink-500">{t.importsFrom}</span>{b.importCountries.map((c) => enumLabel(dict, "OriginCountry", c)).join(", ")}</p>}
          </div>

          <div className="panel space-y-3 p-5 text-sm">
            <h2 className="font-bold">{isPrivate ? t.carLocation : t.location}</h2>
            <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-300" />{place}</p>
            {b.latitude != null && b.longitude != null ? (
              <LocationMap lat={b.latitude} lng={b.longitude} label={b.name} directionsLabel={t.directions} />
            ) : (
              <a className="btn-ghost w-full py-2" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place}, Tanzania`)}`}>{t.directions}</a>
            )}
          </div>

          {b.description && (
            <div className="panel p-5 text-sm leading-6 text-ink-700">
              <h2 className="mb-2 font-bold text-ink-900">{t.about}</h2>
              <p className="whitespace-pre-line">{b.description}</p>
            </div>
          )}
          <div className="panel p-5"><h2 className="mb-3 font-bold">{dict.inquiry.title}</h2><InquiryForm serviceBusiness={isService} target={{ businessId: b.id }} defaultName={viewer?.name ?? undefined} defaultPhone={viewer?.phone ?? undefined} /></div>
        </aside>
      </div>
    </div>
  );
}
