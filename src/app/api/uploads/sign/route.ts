import { apiUser } from "@/lib/session";
import { signCloudinaryUpload } from "@/lib/cloudinary";
import { json, jsonError } from "@/lib/json";

/**
 * Returns a signature for a direct browser → Cloudinary upload. Images never
 * pass through our server; Cloudinary resizes to max 2000px and strips EXIF.
 * When Cloudinary isn't configured (local dev) the client falls back to /api/uploads/local.
 */
export async function POST() {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = signCloudinaryUpload({ timestamp, folder: `magarisoko/${user.id}`, transformation: "c_limit,w_2000,h_2000,q_auto:good" });
  if (!signed) return json({ provider: "local" });
  return json({ provider: "cloudinary", ...signed, uploadUrl: `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload` });
}
