import { requireUser } from "@/lib/session";
import { getDictionary } from "@/i18n/server";
import { prisma } from "@/lib/prisma";
import { DashNav } from "@/components/dashboard/DashNav";

export const metadata = { robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/dashboard");
  const { dict } = await getDictionary();
  const [newLeads, reg] = await Promise.all([
    prisma.inquiry.count({ where: { recipientId: user.id, status: "NEW" } }),
    prisma.sellerRegistration.findUnique({ where: { userId: user.id }, select: { status: true, businessId: true } }),
  ]);
  const approved = reg?.status === "APPROVED";
  const shopType = approved && reg.businessId ? (await prisma.business.findUnique({ where: { id: reg.businessId }, select: { type: true } }))?.type : undefined;
  const sellsVehicles = !!shopType && ["PRIVATE_SELLER", "DEALERSHIP", "CAR_YARD", "IMPORTER"].includes(shopType);
  const sellsParts = !!shopType && ["PRIVATE_SELLER", "DEALERSHIP", "CAR_YARD", "IMPORTER", "PARTS_VENDOR"].includes(shopType);
  const items = [
    { href: "/dashboard", label: dict.dash.overview },
    ...(approved
      ? [
          { href: "/dashboard/shop", label: dict.shop.title },
          ...(sellsVehicles ? [{ href: "/dashboard/listings", label: dict.dash.inventory }] : []),
          ...(sellsParts ? [{ href: "/dashboard/parts", label: dict.dash.parts }] : []),
        ]
      : [{ href: "/dashboard/registration", label: dict.reg.title }]),
    { href: "/dashboard/leads", label: dict.dash.leads, badge: newLeads },
    { href: "/dashboard/favorites", label: dict.nav.favorites },
    { href: "/dashboard/alerts", label: dict.alerts.title },
    { href: "/dashboard/inspections", label: dict.inspect.my },
  ];
  return (
    <div className="container grid gap-6 py-8 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <p className="mb-3 hidden truncate text-sm font-semibold text-ink-500 lg:block">{user.name}</p>
        <DashNav items={items} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
