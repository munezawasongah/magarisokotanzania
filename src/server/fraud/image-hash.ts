import "server-only";
import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

/**
 * 64-bit difference hash (dHash): resize to 9×8 greyscale and compare each
 * pixel with its right neighbour. Survives resizing, recompression, small
 * crops and colour tweaks — good for catching the same car photo re-posted
 * by another account or lifted from auction sites.
 */
export async function dHash(input: Buffer): Promise<bigint> {
  const px = await sharp(input, { failOn: "none" }).rotate().greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let hash = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const left = px[y * 9 + x];
      const right = px[y * 9 + x + 1];
      hash = (hash << 1n) | (left > right ? 1n : 0n);
    }
  }
  return BigInt.asIntN(64, hash); // signed, to fit PostgreSQL BIGINT
}

export function hamming(a: bigint, b: bigint): number {
  let x = BigInt.asUintN(64, a ^ b);
  let n = 0;
  while (x) {
    n += Number(x & 1n);
    x >>= 1n;
  }
  return n;
}

/** Placeholder art shared by demo listings must never count as a duplicate. */
export function isHashable(url: string) {
  return !url.startsWith("/placeholders/") && !url.endsWith(".svg");
}

/** Loads an image from Cloudinary/S3 (https) or the local /public folder (dev uploads). */
async function load(url: string): Promise<Buffer> {
  if (url.startsWith("/")) {
    const base = path.join(process.cwd(), "public");
    const file = path.resolve(base, "." + path.posix.normalize(url));
    if (!file.startsWith(base + path.sep)) throw new Error("Invalid path");
    return readFile(file);
  }
  const u = url.includes("res.cloudinary.com") ? url.replace("/upload/", "/upload/w_256,h_256,c_limit,f_jpg/") : url;
  const res = await fetch(u, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function hashImageUrl(url: string): Promise<bigint | null> {
  if (!isHashable(url)) return null;
  try {
    return await dHash(await load(url));
  } catch {
    return null;
  }
}
