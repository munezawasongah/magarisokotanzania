import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/i18n/server";
import { SavedSearchList } from "@/components/dashboard/SavedSearchList";

export const metadata = { title: "Search alerts", robots: { index: false } };

export default async function AlertsPage() {
  const user = await requireUser("/dashboard/alerts");
  const { dict } = await getDictionary();
  const [searches, savedCars] = await Promise.all([
    prisma.savedSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.favorite.count({ where: { userId: user.id, listingId: { not: null } } }),
  ]);
  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="display text-2xl">{dict.alerts.title}</h1>
        <p className="mt-1 text-sm text-ink-500">{dict.alerts.intro}</p>
      </header>
      <SavedSearchList initial={searches.map((s) => ({ id: s.id, name: s.name, query: s.query, alertSms: s.alertSms, lastAlertAt: s.lastAlertAt?.toISOString() ?? null }))} />
      <section className="panel p-5">
        <h2 className="font-bold">{dict.alerts.savedCars} <span className="text-ink-500">({savedCars})</span></h2>
        <p className="mt-1 text-sm text-ink-500">{dict.alerts.savedCarsHint}</p>
        <Link href="/dashboard/favorites" className="btn-ghost mt-3 py-2">{dict.nav.favorites}</Link>
      </section>
    </div>
  );
}
