import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiUser } from "@/lib/session";
import { setBodyTypePhotos } from "@/lib/settings";
import { json, jsonError } from "@/lib/json";
import { BodyType } from "@/generated/prisma/enums";

const schema = z.record(z.nativeEnum(BodyType), z.string().trim().refine((u) => u === "" || u.startsWith("https://") || u.startsWith("/uploads/"), "Invalid image").optional());

/** PUT { SUV: url, SEDAN: url, … } — admin chooses the photo shown on each body-type tile. */
export async function PUT(req: Request) {
  const user = await apiUser();
  if (!user?.roles.includes("ADMIN")) return jsonError("Forbidden", 403);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid photos", 422);
  await setBodyTypePhotos(parsed.data as Record<string, string>);
  revalidatePath("/");
  return json({ ok: true });
}
