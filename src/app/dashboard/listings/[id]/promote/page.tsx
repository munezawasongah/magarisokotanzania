import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/i18n/server";
import { PaymentForm } from "@/components/dashboard/PaymentForm";

export default async function PromotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/listings/${id}/promote`);
  const { dict, locale } = await getDictionary();
  const [listing, products, dbUser] = await Promise.all([
    prisma.listing.findUnique({ where: { id }, select: { id: true, title: true, slug: true, sellerId: true, status: true, featuredUntil: true } }),
    prisma.promotionProduct.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { phone: true } }),
  ]);
  if (!listing || listing.sellerId !== user.id) notFound();

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="display text-2xl">{dict.dash.promoteListing}</h1>
      <p className="text-sm text-ink-700"><Link href={`/cars/${listing.slug}`} className="font-semibold underline">{listing.title}</Link></p>
      {listing.status !== "ACTIVE" ? (
        <p className="panel p-5 text-sm">Promotions are available once the listing is approved and live.</p>
      ) : (
        <div className="panel p-5">
          <PaymentForm
            purpose="PROMOTION"
            listingId={listing.id}
            defaultPhone={dbUser?.phone}
            successHref="/dashboard/listings"
            items={products.map((p) => ({ code: p.code, name: (locale === "sw" && p.nameSw) || p.name, priceTzs: Number(p.priceTzs), note: p.type === "BUMP" ? "Moves your car back to the top of 'Newest'" : p.type === "FEATURED" ? "Pinned above normal results with a yellow badge" : "Shown in the sponsored carousel" }))}
          />
        </div>
      )}
    </div>
  );
}
