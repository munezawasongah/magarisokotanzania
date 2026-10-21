import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/i18n/server";
import { enumLabel } from "@/i18n";
import { getRegionsWithDistricts } from "@/server/taxonomy";
import { getMyShop, planBusinessType } from "@/server/registration";
import { ShopEditor } from "@/components/forms/ShopEditor";
import { shopToValues, type ShopKind } from "@/lib/shop-values";
import { PaymentForm } from "@/components/dashboard/PaymentForm";
import { Badge } from "@/components/ui/Badge";
import { SITE } from "@/config/site";
import { serialize } from "@/lib/json";

export const metadata = { title: "My mini-site", robots: { index: false } };

const KIND: Record<string, ShopKind> = {
  PRIVATE_SELLER: "SELLER", DEALERSHIP: "DEALER", CAR_YARD: "YARD", IMPORTER: "IMPORTER", PARTS_VENDOR: "PARTS_VENDOR",
  SERVICE_PROVIDER: "SERVICE_PROVIDER", INSPECTION_CENTER: "SERVICE_PROVIDER", FINANCE_INSURANCE: "SERVICE_PROVIDER",
};

export default async function ShopPage() {
  const user = await requireUser("/dashboard/shop");
  const { dict } = await getDictionary();
  const shop = await getMyShop(user.id);
  if (!shop) redirect("/dashboard/registration");

  const planType = planBusinessType(shop.type);
  const [regions, plans, sub, dbUser, counts] = await Promise.all([
    getRegionsWithDistricts(),
    prisma.plan.findMany({ where: { isActive: true, businessType: planType }, orderBy: { sortOrder: "asc" } }),
    prisma.subscription.findFirst({ where: { businessId: shop.id, status: { in: ["ACTIVE", "TRIALING"] }, currentPeriodEnd: { gt: new Date() } }, include: { plan: true }, orderBy: { currentPeriodEnd: "desc" } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { phone: true } }),
    Promise.all([
      prisma.listing.count({ where: { businessId: shop.id, status: "ACTIVE" } }),
      prisma.sparePart.count({ where: { businessId: shop.id, status: "ACTIVE" } }),
    ]),
  ]);
  const plain = serialize({ ...shop, serviceKind: ["INSPECTION_CENTER", "FINANCE_INSURANCE"].includes(shop.type) ? shop.type : "SERVICE_PROVIDER" }) as unknown as Record<string, unknown>;

  return (
    <div className="max-w-4xl space-y-6">
      <header className="panel flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <h1 className="display truncate text-2xl">{shop.name}</h1>
          <p className="text-sm text-ink-500">{enumLabel(dict, "BusinessType", shop.type)} · {counts[0]} {dict.nav.cars.toLowerCase()} · {counts[1]} {dict.nav.parts.toLowerCase()} · {shop.services.length} {dict.nav.services.toLowerCase()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={shop.verification === "VERIFIED" ? "go" : "plate"}>{shop.verification}</Badge>
          <Link href={`/shop/${shop.slug}`} className="btn-primary py-2"><ExternalLink className="h-4 w-4" />{dict.shop.view}</Link>
        </div>
      </header>

      <ShopEditor kind={KIND[shop.type]} regions={regions} initial={shopToValues(plain)} />

      {plans.length > 0 && (
        <section id="plans" className="panel p-5">
          <h2 className="text-lg font-bold">Monthly plan (optional)</h2>
          <p className="mb-4 mt-1 text-sm text-ink-500">
            {sub
              ? <>Current plan: <strong className="text-ink-900">{sub.plan.name}</strong> — ends {sub.currentPeriodEnd.toLocaleDateString("en-GB")}. Paying again extends it.</>
              : `Your registration includes up to ${SITE.baseActiveListings} live listings. A plan raises the limit and adds featured credits.`}
          </p>
          <PaymentForm
            purpose="SUBSCRIPTION"
            businessId={shop.id}
            defaultPhone={dbUser?.phone}
            successHref="/dashboard/shop"
            items={plans.map((p) => ({
              code: p.code, name: `${p.name} — monthly`, priceTzs: Number(p.priceTzsMonthly),
              note: `${p.maxActiveListings === -1 ? "Unlimited" : p.maxActiveListings} listings · ${p.featuredCredits} featured credits${p.leadAnalytics ? " · lead analytics" : ""}${p.verifiedBadge ? " · verified badge" : ""}`,
            }))}
          />
        </section>
      )}
    </div>
  );
}
