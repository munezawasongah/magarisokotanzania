import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/i18n/server";
import { fmt } from "@/i18n";
import { formatTzs } from "@/lib/money";
import { SITE } from "@/config/site";
import { getRegionsWithDistricts } from "@/server/taxonomy";
import { getMyRegistration } from "@/server/registration";
import { REGISTRATION_TYPES } from "@/lib/validation";
import { RegistrationStatus, RegistrationWizard } from "@/components/forms/RegistrationWizard";
import { shopToValues, type ShopKind } from "@/lib/shop-values";

export const metadata = { title: "Seller registration", robots: { index: false } };

function addHrefFor(type: string) {
  if (type === "PARTS_VENDOR") return "/dashboard/parts/new";
  if (["SERVICE_PROVIDER", "INSPECTION_CENTER", "FINANCE_INSURANCE"].includes(type)) return "/dashboard/shop";
  return "/sell";
}

export default async function RegistrationPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const user = await requireUser("/dashboard/registration");
  const { type } = await searchParams;
  const { dict } = await getDictionary();
  const [reg, regions, dbUser] = await Promise.all([
    getMyRegistration(user.id),
    getRegionsWithDistricts(),
    prisma.user.findUnique({ where: { id: user.id }, select: { phone: true, name: true } }),
  ]);
  const phone = dbUser?.phone ?? "";
  const business = reg?.businessId ? await prisma.business.findUnique({ where: { id: reg.businessId }, select: { slug: true, type: true } }) : null;

  const header = (
    <header>
      <h1 className="display text-2xl md:text-3xl">{dict.reg.title}</h1>
      <p className="mt-2 max-w-2xl text-ink-500">{fmt(dict.reg.subtitle, { fee: formatTzs(SITE.registrationFeeTzs) })}</p>
    </header>
  );

  if (reg?.status === "APPROVED" || reg?.status === "PAYMENT_SUBMITTED") {
    return (
      <div className="max-w-3xl space-y-6">
        {header}
        <RegistrationStatus status={reg.status} shopSlug={business?.slug} addHref={business ? addHrefFor(business.type) : undefined} />
      </div>
    );
  }

  const requested = REGISTRATION_TYPES.includes(type as ShopKind) ? (type as ShopKind) : null;
  const initialType = (reg?.accountType as ShopKind | undefined) ?? requested;
  const details = (reg?.shopDetails ?? null) as Record<string, unknown> | null;

  return (
    <div className="max-w-4xl space-y-6">
      {header}
      <RegistrationWizard
        regions={regions}
        feeTzs={Number(reg?.feeTzs ?? SITE.registrationFeeTzs)}
        defaultPhone={phone}
        initialType={initialType}
        initialShop={shopToValues(details ?? (dbUser?.name ? { name: dbUser.name } : null), phone)}
        status={reg?.status ?? "NONE"}
        rejectionReason={reg?.rejectionReason}
        manual={SITE.manualPayment}
      />
    </div>
  );
}
