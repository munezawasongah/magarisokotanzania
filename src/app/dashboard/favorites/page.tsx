import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/i18n/server";
import { listingCardSelect } from "@/server/listings";
import { VehicleCard } from "@/components/listing/VehicleCard";

export default async function FavoritesPage() {
  const user = await requireUser("/dashboard/favorites");
  const { dict, locale } = await getDictionary();
  const favs = await prisma.favorite.findMany({ where: { userId: user.id, listingId: { not: null } }, include: { listing: { select: listingCardSelect } }, orderBy: { createdAt: "desc" } });
  const listings = favs.map((f) => f.listing!).filter((l) => l && l.status !== "ARCHIVED");
  return (
    <div className="space-y-5">
      <h1 className="display text-2xl">{dict.nav.favorites}</h1>
      {listings.length === 0 ? <p className="panel p-8 text-center text-sm text-ink-500">Tap “{dict.nav.favorites}” on any car to keep it here.</p> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{listings.map((l) => <VehicleCard key={l.id} listing={l} dict={dict} locale={locale} />)}</div>
      )}
    </div>
  );
}
