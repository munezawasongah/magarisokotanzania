import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getMakesWithModels, getRegionsWithDistricts } from "@/server/taxonomy";
import { getOwnPart } from "@/server/parts";
import { PartForm } from "@/components/forms/PartForm";
import { ListingError } from "@/server/errors";

export const metadata = { title: "Edit spare part", robots: { index: false } };

export default async function EditPartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/parts/${id}/edit`);
  const p = await getOwnPart(user, id).catch((e) => { if (e instanceof ListingError) return null; throw e; });
  if (!p) notFound();
  const [makes, regions] = await Promise.all([getMakesWithModels(), getRegionsWithDistricts()]);
  const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  return (
    <div className="space-y-5">
      <h1 className="display text-2xl">Edit spare part</h1>
      <PartForm
        makes={makes}
        regions={regions.map((r) => ({ id: r.id, name: r.name }))}
        businessId={p.businessId ?? undefined}
        initial={{
          id: p.id, title: p.title, description: str(p.description), category: p.category, condition: p.condition, authenticity: p.authenticity,
          brand: str(p.brand), partNumber: str(p.partNumber), oemNumber: str(p.oemNumber), priceTzs: Number(p.priceTzs).toLocaleString("en-US"),
          stockQty: String(p.stockQty), warrantyDays: str(p.warrantyDays), regionId: String(p.regionId), images: p.images,
          fitments: p.fitments.map((f) => ({ makeId: String(f.makeId), modelId: str(f.modelId), yearFrom: str(f.yearFrom), yearTo: str(f.yearTo), engineCode: str(f.engineCode) })),
        }}
      />
    </div>
  );
}
