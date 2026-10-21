import Link from "next/link";
import { redirect } from "next/navigation";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getMakesWithModels, getRegionsWithDistricts } from "@/server/taxonomy";
import { CAN_LIST_VEHICLES, getMyShop } from "@/server/registration";
import { SellForm } from "@/components/forms/SellForm";

export const metadata = { title: "Sell your vehicle", robots: { index: false } };

export default async function SellPage() {
  const user = await requireUser("/sell");
  const { dict } = await getDictionary();
  const isAdmin = user.roles.includes("ADMIN");
  const shop = await getMyShop(user.id);
  if (!shop && !isAdmin) redirect("/dashboard/registration");
  if (shop && !CAN_LIST_VEHICLES.includes(shop.type)) {
    return (
      <div className="container max-w-xl py-16">
        <div className="panel space-y-4 p-6">
          <h1 className="display text-2xl">{dict.sell.title}</h1>
          <p className="text-sm text-ink-700">Your account type does not post vehicles. Manage your listings from your mini-site dashboard.</p>
          <Link href={shop.type === "PARTS_VENDOR" ? "/dashboard/parts" : "/dashboard/shop"} className="btn-primary">{dict.shop.title}</Link>
        </div>
      </div>
    );
  }
  const [makes, regions, dbUser] = await Promise.all([
    getMakesWithModels(),
    getRegionsWithDistricts(),
    prisma.user.findUnique({ where: { id: user.id }, select: { phone: true } }),
  ]);
  return (
    <div className="container max-w-4xl py-10">
      <h1 className="display text-3xl">{dict.sell.title}</h1>
      <p className="mt-2 text-ink-500">{dict.sell.subtitle}</p>
      <div className="mt-8">
        <SellForm
          makes={makes}
          regions={regions}
          defaultPhone={dbUser?.phone}
          shop={shop ? { name: shop.name, type: shop.type, regionId: shop.regionId, districtId: shop.districtId, address: shop.address, latitude: shop.latitude, longitude: shop.longitude, phone: shop.phone, whatsapp: shop.whatsapp } : null}
        />
      </div>
    </div>
  );
}
