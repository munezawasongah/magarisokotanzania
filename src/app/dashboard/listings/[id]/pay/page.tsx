import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/i18n/server";
import { fmt } from "@/i18n";
import { getMonetisation } from "@/lib/settings";
import { formatTzs } from "@/lib/money";
import { SITE } from "@/config/site";
import { PaymentForm } from "@/components/dashboard/PaymentForm";

export const metadata = { title: "Pay for a listing", robots: { index: false } };

/** Listing fee for a private seller's paid listing: publishes a new one, or renews a live / expired one. */
export default async function PayListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/listings/${id}/pay`);
  const { dict } = await getDictionary();
  const t = dict.fees;
  const [listing, money, dbUser, usedFree] = await Promise.all([
    prisma.listing.findUnique({ where: { id }, select: { id: true, title: true, slug: true, sellerId: true, status: true, isFreeListing: true, expiresAt: true } }),
    getMonetisation(),
    prisma.user.findUnique({ where: { id: user.id }, select: { phone: true } }),
    prisma.listing.count({ where: { sellerId: user.id, isFreeListing: true, status: { not: "REJECTED" } } }),
  ]);
  if (!listing || listing.sellerId !== user.id) notFound();
  const fee = money.privateListingFee;
  const renew = listing.status !== "DRAFT";
  const payable = !listing.isFreeListing && fee > 0 && (listing.status === "DRAFT" || listing.status === "ACTIVE" || listing.status === "EXPIRED");

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="display text-2xl">{renew ? t.renewTitle : t.payTitle}</h1>
      <p className="text-sm text-ink-700"><Link href={renew ? `/cars/${listing.slug}` : "/dashboard/listings"} className="font-semibold underline">{listing.title}</Link></p>
      {!payable ? (
        <div className="panel space-y-3 p-5 text-sm">
          <p>{t.nothingToPay}</p>
          <Link href="/dashboard/listings" className="btn-primary">{dict.dash.inventory}</Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-ink-700">
            {renew
              ? fmt(t.renewExplain, { fee: formatTzs(fee), days: SITE.listingLifetimeDays })
              : fmt(t.payExplain, { free: money.freePrivateListings, used: Math.min(usedFree, money.freePrivateListings), fee: formatTzs(fee), days: SITE.listingLifetimeDays })}
          </p>
          <div className="panel p-5">
            <PaymentForm
              purpose="LISTING_FEE"
              listingId={listing.id}
              defaultPhone={dbUser?.phone}
              successHref="/dashboard/listings"
              items={[{ code: "LISTING_FEE", name: fmt(t.itemName, { days: SITE.listingLifetimeDays }), priceTzs: fee }]}
            />
          </div>
          <p className="text-xs text-ink-500">{t.noCommission}</p>
        </>
      )}
    </div>
  );
}
