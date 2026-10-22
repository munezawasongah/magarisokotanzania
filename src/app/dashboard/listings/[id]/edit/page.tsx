import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ListingEditForm } from "@/components/forms/ListingEditForm";

export const metadata = { title: "Edit listing", robots: { index: false } };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/listings/${id}/edit`);
  const l = await prisma.listing.findUnique({ where: { id } });
  if (!l || (l.sellerId !== user.id && !user.roles.includes("ADMIN"))) notFound();
  if (l.status === "ARCHIVED") notFound();
  return (
    <div className="max-w-3xl space-y-5">
      <header>
        <h1 className="display text-2xl">Edit listing</h1>
        <p className="mt-1 text-sm text-ink-500"><Link href={`/cars/${l.slug}`} className="font-semibold underline">{l.title}</Link> · year, make, model and photos cannot be changed — post a new listing for a different car.</p>
      </header>
      <ListingEditForm l={{
        id: l.id, slug: l.slug, title: l.title, status: l.status, priceTzs: Number(l.priceTzs), priceNegotiable: l.priceNegotiable, mileageKm: l.mileageKm,
        description: l.description, features: l.features, contactPhone: l.contactPhone, contactWhatsapp: l.contactWhatsapp ?? l.contactPhone,
      }} />
    </div>
  );
}
