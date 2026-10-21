import { getDictionary } from "@/i18n/server";
import { enumLabel } from "@/i18n";
import { getBodyTypePhotos } from "@/lib/settings";
import { getBodyTypeTiles } from "@/server/body-types";
import { BodyPhotosForm } from "@/components/admin/BodyPhotosForm";
import { BodyType } from "@/generated/prisma/enums";

export const metadata = { title: "Body type photos" };

export default async function BodyPhotosPage() {
  const { dict } = await getDictionary();
  const bodies = Object.values(BodyType);
  const [chosen, tiles] = await Promise.all([getBodyTypePhotos(), getBodyTypeTiles(bodies)]);
  // what each tile would show without an admin photo
  const rows = tiles.map((t) => ({
    body: t.body,
    label: enumLabel(dict, "BodyType", t.body),
    chosen: chosen[t.body] ?? "",
    fallback: t.source === "admin" ? "" : t.url,
    fallbackSource: (t.source === "listing" ? "listing" : "placeholder") as "listing" | "placeholder",
  }));
  return (
    <div className="space-y-5">
      <header>
        <h1 className="display text-2xl">Body type photos</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-500">
          The photo for each body type on the home page. Upload a real photo of that type of vehicle. Without one, the tile automatically shows the newest live car of that type,
          and the drawing only appears when there are none.
        </p>
      </header>
      <BodyPhotosForm rows={rows} />
    </div>
  );
}
