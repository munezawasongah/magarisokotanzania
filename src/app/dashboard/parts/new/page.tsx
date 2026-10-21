import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getMakesWithModels, getRegionsWithDistricts } from "@/server/taxonomy";
import { CAN_LIST_PARTS, getMyShop } from "@/server/registration";
import { PartForm } from "@/components/forms/PartForm";

export const metadata = { title: "List a spare part", robots: { index: false } };

export default async function NewPartPage() {
  const user = await requireUser("/dashboard/parts/new");
  const shop = await getMyShop(user.id);
  if (!shop && !user.roles.includes("ADMIN")) redirect("/dashboard/registration?type=PARTS_VENDOR");
  if (shop && !CAN_LIST_PARTS.includes(shop.type)) {
    return (
      <div className="panel max-w-xl space-y-3 p-6 text-sm">
        <p>Your account type does not sell spare parts. Your services and prices are managed on your mini-site.</p>
        <Link href="/dashboard/shop" className="btn-primary">Mini-site</Link>
      </div>
    );
  }
  const [makes, regions] = await Promise.all([getMakesWithModels(), getRegionsWithDistricts()]);
  return (
    <div className="space-y-5">
      <h1 className="display text-2xl">List a spare part</h1>
      {shop && <p className="text-sm text-ink-500">Listing on <span className="font-semibold text-ink-900">{shop.name}</span>. Every part must have a price.</p>}
      <PartForm makes={makes} regions={regions.map((r) => ({ id: r.id, name: r.name }))} businessId={shop?.id} defaultRegionId={shop?.regionId} />
    </div>
  );
}
