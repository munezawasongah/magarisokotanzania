import Link from "next/link";
import { BadgeCheck, MapPin, Star, Truck } from "lucide-react";
import { getDictionary } from "@/i18n/server";
import { enumLabel } from "@/i18n";
import { ServiceCategory } from "@/generated/prisma/enums";
import { searchServiceProviders } from "@/server/businesses";
import { getRegionsWithDistricts } from "@/server/taxonomy";
import { formatTzs } from "@/lib/money";
import { formatTzPhone } from "@/lib/phone";
import { whatsappLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export const metadata = { title: "Mechanics, inspection, towing & car finance in Tanzania", description: "Find verified mechanics, pre-purchase inspection centres, towing, clearing agents, insurance and car financing across Tanzania." };

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ category?: string; region?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const category = sp.category && sp.category in ServiceCategory ? (sp.category as ServiceCategory) : undefined;
  const { dict } = await getDictionary();
  const [res, regions] = await Promise.all([searchServiceProviders({ category, region: sp.region, q: sp.q, page: Number(sp.page) || 1 }), getRegionsWithDistricts()]);
  const qs = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as Array<[string, string]>);
    next.delete("page");
    return `/services${next.size ? `?${next}` : ""}`;
  };

  return (
    <div className="container py-8">
      <h1 className="display text-3xl">{dict.services.title}</h1>
      <p className="mt-1 max-w-2xl text-ink-500">{dict.services.subtitle}</p>
      <div className="mt-6 flex flex-wrap gap-1.5">
        <Link href={qs({ category: undefined })} className={cn("chip", !category && "border-ink-900 bg-ink-900 text-white")}>{dict.common.all}</Link>
        {Object.values(ServiceCategory).map((c) => (
          <Link key={c} href={qs({ category: c })} className={cn("chip", category === c && "border-ink-900 bg-ink-900 text-white")}>{enumLabel(dict, "ServiceCategory", c)}</Link>
        ))}
      </div>
      <form className="mt-3 flex flex-wrap gap-2" action="/services">
        {category && <input type="hidden" name="category" value={category} />}
        <select name="region" defaultValue={sp.region ?? ""} className="field w-auto"><option value="">{dict.hero.anyRegion}</option>{regions.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}</select>
        <input name="q" defaultValue={sp.q ?? ""} className="field w-auto" placeholder="Toyota, Land Rover, diagnostics…" />
        <button className="btn-primary">{dict.hero.search}</button>
      </form>

      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {res.items.map((b) => {
          const wa = b.whatsapp ?? b.phone;
          return (
            <li key={b.id} className="panel flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/shop/${b.slug}`} className="flex items-center gap-1.5 text-lg font-bold hover:underline">{b.name}{b.verification === "VERIFIED" && <BadgeCheck className="h-5 w-5 text-go-600" aria-label={dict.listing.verified} />}</Link>
                  {b.tagline && <p className="text-sm text-ink-500">{b.tagline}</p>}
                </div>
                {b.ratingCount > 0 && <span className="flex shrink-0 items-center gap-1 text-sm font-semibold"><Star className="h-4 w-4 fill-plate-400 text-plate-500" />{b.ratingAvg.toFixed(1)} <span className="font-normal text-ink-500">({b.ratingCount})</span></span>}
              </div>
              <p className="flex items-center gap-1 text-sm text-ink-700"><MapPin className="h-4 w-4 text-ink-300" />{[b.address, b.district?.name, b.region.name].filter(Boolean).join(", ")}</p>
              <ul className="flex flex-wrap gap-1.5">
                {b.services.map((s) => (
                  <li key={s.id} className="chip">
                    {s.title}{s.priceFromTzs ? ` · ${dict.services.from} ${formatTzs(s.priceFromTzs)}` : ""}{s.mobileService && <Truck className="h-3 w-3" aria-label={dict.services.mobile} />}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex gap-2 pt-2">
                <a className="btn-wa flex-1 py-2" target="_blank" rel="noopener noreferrer" href={whatsappLink(wa, `Habari ${b.name}, nimewaona kwenye MagariSOKO Tanzania. Ningependa kuuliza kuhusu huduma zenu.`)}><WhatsAppIcon />WhatsApp</a>
                <a className="btn-ghost flex-1 py-2 tabular-nums" href={`tel:${b.phone}`}>{formatTzPhone(b.phone)}</a>
              </div>
            </li>
          );
        })}
      </ul>
      {res.items.length === 0 && <p className="panel mt-6 p-8 text-center text-sm text-ink-500">No providers listed here yet. <Link className="font-semibold underline" href="/dashboard/registration?type=SERVICE_PROVIDER">Add your business</Link>.</p>}
    </div>
  );
}
