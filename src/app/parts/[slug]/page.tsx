import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/server";
import { enumLabel, fmt } from "@/i18n";
import { getPartBySlug } from "@/server/parts";
import { getCurrentUser } from "@/lib/session";
import { formatTzs, toNum } from "@/lib/money";
import { absoluteUrl } from "@/lib/utils";
import { partWhatsappMessage } from "@/lib/whatsapp";
import { Gallery } from "@/components/listing/Gallery";
import { PriceTag } from "@/components/ui/PriceTag";
import { Badge } from "@/components/ui/Badge";
import { CallButton, WhatsAppButton } from "@/components/listing/ContactButtons";
import { InquiryForm } from "@/components/listing/InquiryForm";
import { VerifiedMark } from "@/components/ui/VerifiedMark";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await getPartBySlug((await params).slug);
  if (!p) return { title: "Part not found" };
  return { title: `${p.title}${p.partNumber ? ` (${p.partNumber})` : ""} — ${formatTzs(p.priceTzs)}`, description: `${p.title} for ${p.fitments.map((f) => `${f.make.name} ${f.model?.name ?? ""}`).slice(0, 4).join(", ")} in ${p.region.name}.` };
}

export default async function PartPage({ params }: { params: Params }) {
  const p = await getPartBySlug((await params).slug);
  if (!p) notFound();
  const { dict, locale } = await getDictionary();
  const viewer = await getCurrentUser();
  const phone = p.business?.whatsapp ?? p.business?.phone ?? p.seller.whatsapp ?? p.seller.phone;
  const url = absoluteUrl(`/parts/${p.slug}`);
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: p.title, sku: p.partNumber ?? undefined, mpn: p.oemNumber ?? p.partNumber ?? undefined,
    brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined, category: p.category,
    offers: { "@type": "Offer", price: toNum(p.priceTzs), priceCurrency: "TZS", availability: p.stockQty > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url },
  };
  return (
    <div className="container py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="mb-4 text-xs text-ink-500"><Link href="/parts" className="hover:underline">{dict.parts.title}</Link> / <Link href={`/parts?category=${p.category}`} className="hover:underline">{enumLabel(dict, "PartCategory", p.category)}</Link></nav>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Gallery photos={p.images.map((u) => ({ url: u }))} title={p.title} />
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={p.authenticity === "GENUINE_OEM" ? "go" : "muted"}>{enumLabel(dict, "PartAuthenticity", p.authenticity)}</Badge>
            <Badge>{enumLabel(dict, "PartCondition", p.condition)}</Badge>
          </div>
          <h1 className="display text-2xl md:text-3xl">{p.title}</h1>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line text-sm sm:grid-cols-4">
            {[[dict.parts.partNo, p.partNumber], [dict.parts.oem, p.oemNumber], ["Brand", p.brand], ["Warranty", p.warrantyDays ? fmt(dict.parts.warranty, { n: p.warrantyDays }) : "—"]].map(([k, v]) => (
              <div key={k} className="bg-white p-3"><dt className="text-xs text-ink-500">{k}</dt><dd className="condensed font-semibold">{v || "—"}</dd></div>
            ))}
          </dl>
          <section>
            <h2 className="mb-2 text-lg font-bold">{dict.parts.compatible}</h2>
            <table className="w-full overflow-hidden rounded-lg border border-line bg-white text-sm">
              <thead className="bg-ink-100/60 text-left text-xs text-ink-500"><tr><th className="px-4 py-2">{dict.spec.make}</th><th className="px-4 py-2">{dict.spec.model}</th><th className="px-4 py-2">{dict.spec.year}</th><th className="px-4 py-2">{dict.spec.engine}</th></tr></thead>
              <tbody>
                {p.fitments.map((f) => (
                  <tr key={f.id} className="border-t border-line">
                    <td className="px-4 py-2">{f.make.name}</td><td className="px-4 py-2">{f.model?.name ?? dict.search.any}</td>
                    <td className="px-4 py-2 tabular-nums">{f.yearFrom || f.yearTo ? `${f.yearFrom ?? "…"}–${f.yearTo ?? "…"}` : dict.search.any}</td>
                    <td className="px-4 py-2">{f.engineCode ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-ink-500">{locale === "sw" ? "Tuma namba ya chasisi kwa muuzaji kuthibitisha kabla ya kulipa." : "Send your chassis number to the vendor to confirm fitment before paying."}</p>
          </section>
          {p.description && <section><h2 className="mb-2 text-lg font-bold">{dict.listing.description}</h2><p className="max-w-prose whitespace-pre-line leading-7 text-ink-700">{p.description}</p></section>}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <div className="panel space-y-4 p-5">
            <PriceTag value={p.priceTzs} size="lg" />
            <p className={`text-sm font-medium ${p.stockQty > 0 ? "text-go-700" : "text-danger"}`}>{p.stockQty > 0 ? `${dict.parts.inStock} (${p.stockQty})` : dict.parts.outOfStock}</p>
            {phone && (
              <div className="grid gap-2">
                <WhatsAppButton phone={phone} label={dict.listing.chatWhatsapp} className="w-full py-3" message={partWhatsappMessage({ title: p.title, partNumber: p.partNumber, url, locale })} />
                <CallButton phone={phone} label={dict.listing.call} revealLabel={dict.listing.showNumber} className="w-full" />
              </div>
            )}
            <div className="border-t border-line pt-3 text-sm">
              <p className="text-xs text-ink-500">{dict.parts.vendor}</p>
              {p.business ? <Link href={`/shop/${p.business.slug}`} className="flex items-center gap-1 font-semibold hover:underline">{p.business.name}{p.business.verification === "VERIFIED" && <VerifiedMark label={dict.listing.verified} />}</Link> : <p className="font-semibold">{p.seller.name}</p>}
              <p className="text-xs text-ink-500">{[p.district?.name, p.region.name].filter(Boolean).join(", ")}</p>
            </div>
          </div>
          <div className="panel p-5"><h2 className="mb-3 font-bold">{dict.inquiry.title}</h2><InquiryForm target={{ partId: p.id }} defaultName={viewer?.name ?? undefined} defaultPhone={viewer?.phone ?? undefined} /></div>
        </aside>
      </div>
    </div>
  );
}
