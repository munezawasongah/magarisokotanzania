import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { apiUser } from "@/lib/session";
import { json, jsonError } from "@/lib/json";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Development-only image upload to /public/uploads (use Cloudinary in production). */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return jsonError("Configure Cloudinary for uploads in production", 501);
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("No file", 400);
  const ext = TYPES[file.type];
  if (!ext) return jsonError("Only JPG, PNG or WebP images", 415);
  if (file.size > 8 * 1024 * 1024) return jsonError("Max 8 MB per photo", 413);
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return json({ url: `/uploads/${name}` }, { status: 201 });
}
