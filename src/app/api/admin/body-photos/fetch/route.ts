import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { apiUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { json, jsonError } from "@/lib/json";
import { fillBodyTypePhotos, type CommonsPhoto } from "@/lib/commons-photos";

export const maxDuration = 120;

/** POST { force?: boolean } — fill body-type tiles with real free photos from Wikimedia Commons. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user?.roles.includes("ADMIN")) return jsonError("Forbidden", 403);
  const { force } = (await req.json().catch(() => ({}))) as { force?: boolean };
  const [photosRow, creditsRow] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: "bodyTypePhotos" } }),
    prisma.siteSetting.findUnique({ where: { key: "bodyTypePhotoCredits" } }),
  ]);
  const { photos, credits, found } = await fillBodyTypePhotos(
    (photosRow?.value as Record<string, string>) ?? {},
    (creditsRow?.value as Record<string, CommonsPhoto>) ?? {},
    { force: !!force },
  );
  if (found) {
    await prisma.siteSetting.upsert({ where: { key: "bodyTypePhotos" }, create: { key: "bodyTypePhotos", value: photos }, update: { value: photos } });
    await prisma.siteSetting.upsert({
      where: { key: "bodyTypePhotoCredits" },
      create: { key: "bodyTypePhotoCredits", value: credits as unknown as Prisma.InputJsonValue },
      update: { value: credits as unknown as Prisma.InputJsonValue },
    });
    revalidatePath("/");
  }
  return json({ ok: true, found, photos });
}
