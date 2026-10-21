/**
 * Downloads a real, freely-licensed photo for every body type from Wikimedia Commons,
 * crops it to the 4:3 tile shape, stores it in public/uploads/body-types/ and makes it
 * the home-page tile photo. Photographer credits are saved and shown on /photo-credits.
 *
 *   npx tsx scripts/fetch-body-photos.ts            # fills body types that have no photo yet
 *   npx tsx scripts/fetch-body-photos.ts --force    # replaces every body-type photo
 *   npx tsx scripts/fetch-body-photos.ts SUV PICKUP # only these body types
 *
 * Photos an admin uploads in Admin → Body type photos are never overwritten without --force.
 */
import "dotenv/config";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";

const dbUrl = (process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/garisoko").replace("@localhost:", "@127.0.0.1:");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: dbUrl }) });

const UA = "MagariSOKO-Tanzania/1.0 (https://magarisoko.co.tz; support@magarisoko.co.tz) body-type-photos";
const API = "https://commons.wikimedia.org/w/api.php";

/** Vehicles that are common on Tanzanian roads, most typical first. `must` words must all appear in the file name. */
const QUERIES: Record<string, Array<{ q: string; must: string[] }>> = {
  SUV: [{ q: "Toyota RAV4", must: ["rav4"] }, { q: "Toyota Land Cruiser Prado", must: ["prado"] }, { q: "Toyota Harrier", must: ["harrier"] }],
  SEDAN: [{ q: "Toyota Premio", must: ["premio"] }, { q: "Toyota Allion", must: ["allion"] }, { q: "Toyota Corolla sedan", must: ["corolla"] }],
  HATCHBACK: [{ q: "Toyota Vitz", must: ["vitz"] }, { q: "Toyota IST", must: ["toyota ist"] }, { q: "Toyota Yaris hatchback", must: ["yaris"] }],
  WAGON: [{ q: "Toyota Corolla Fielder", must: ["fielder"] }, { q: "Toyota Probox", must: ["probox"] }, { q: "Toyota Caldina", must: ["caldina"] }],
  PICKUP: [{ q: "Toyota Hilux", must: ["hilux"] }, { q: "Isuzu D-Max", must: ["d-max"] }, { q: "Nissan Navara", must: ["navara"] }],
  VAN: [{ q: "Toyota HiAce van", must: ["hiace"] }, { q: "Nissan NV350 Caravan", must: ["caravan"] }],
  MINIVAN: [{ q: "Toyota Noah", must: ["noah"] }, { q: "Toyota Voxy", must: ["voxy"] }, { q: "Toyota Alphard", must: ["alphard"] }],
  MINIBUS: [{ q: "Toyota HiAce commuter", must: ["hiace"] }, { q: "Toyota Coaster", must: ["coaster"] }],
  BUS: [{ q: "Toyota Coaster bus", must: ["coaster"] }, { q: "Yutong bus", must: ["yutong"] }, { q: "Scania coach bus", must: ["scania"] }],
  TRUCK: [{ q: "Isuzu Forward truck", must: ["isuzu"] }, { q: "Mitsubishi Fuso Fighter", must: ["fuso"] }, { q: "Scania truck", must: ["scania"] }],
  COUPE: [{ q: "Toyota 86 coupe", must: ["toyota 86"] }, { q: "Toyota Celica", must: ["celica"] }],
  CONVERTIBLE: [{ q: "Mazda MX-5 convertible", must: ["mx-5"] }, { q: "BMW convertible", must: ["bmw"] }],
  MOTORCYCLE: [{ q: "Bajaj Boxer motorcycle", must: ["boxer"] }, { q: "boda boda motorcycle", must: ["boda"] }, { q: "TVS motorcycle", must: ["tvs"] }, { q: "Honda CG125", must: ["honda", "cg"] }],
  THREE_WHEELER: [{ q: "Bajaj RE auto rickshaw", must: ["bajaj"] }, { q: "bajaji Tanzania", must: ["bajaj"] }, { q: "auto rickshaw", must: ["rickshaw"] }],
};

const BAD = /\b(interior|inside|cockpit|dashboard|dash|engine|motor ?room|badge|emblem|logo|wheel|rim|seat|steering|boot|trunk|tail ?light|headlight|lamp|detail|crash|wreck|accident|burn|model ?car|toy|diecast|scale|lego|police|ambulance|fire ?truck|military|army|rally|race|racing|drift|modified|tuned|kit|grille|mirror|key|manual|brochure|advert|poster|sketch|drawing|render|cutaway|chassis|frame|museum)\b/i;
const GOOD = /\b(front|side|three[- ]quarter|3\/4|exterior|left|right|profile)\b/i;
const OK_LICENSE = /^(cc0|public domain|pd|cc[- ]by(-sa)?[- ]\d(\.\d)?)/i;

type Cand = { title: string; thumb: string; original: string; width: number; height: number; license: string; licenseUrl?: string; artist: string; page: string; quality: boolean };

const strip = (html?: string) => (html ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

async function search(q: string): Promise<Cand[]> {
  const params = new URLSearchParams({
    action: "query", format: "json", formatversion: "2", generator: "search", gsrnamespace: "6", gsrlimit: "40",
    gsrsearch: `${q} filetype:bitmap`, prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "1280",
  });
  const r = await fetch(`${API}?${params}`, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!r.ok) throw new Error(`Commons search failed (${r.status})`);
  const d = (await r.json()) as { query?: { pages?: Array<{ title: string; imageinfo?: Array<Record<string, unknown>> }> } };
  return (d.query?.pages ?? []).flatMap((p) => {
    const ii = p.imageinfo?.[0];
    if (!ii || ii.mime !== "image/jpeg") return [];
    const meta = (ii.extmetadata ?? {}) as Record<string, { value?: string }>;
    return [{
      title: p.title,
      thumb: String(ii.thumburl ?? ii.url),
      original: String(ii.url),
      width: Number(ii.width), height: Number(ii.height),
      license: strip(meta.LicenseShortName?.value),
      licenseUrl: meta.LicenseUrl?.value,
      artist: strip(meta.Artist?.value) || "Unknown",
      page: String(ii.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`),
      quality: /quality|featured|valued/i.test(meta.Assessments?.value ?? ""),
    }];
  });
}

function score(c: Cand, must: string[]) {
  const t = c.title.toLowerCase().replace(/_/g, " ");
  if (!must.every((m) => t.includes(m))) return -1;
  if (BAD.test(t)) return -1;
  if (!OK_LICENSE.test(c.license)) return -1;
  const ratio = c.width / c.height;
  if (ratio < 1.2 || ratio > 2.1 || c.width < 1000) return -1;
  let s = 0;
  if (c.quality) s += 6;
  if (GOOD.test(t)) s += 3;
  const year = t.match(/\b(19|20)\d{2}\b/)?.[0];
  if (year && Number(year) >= 2008) s += 2;
  if (/tanzania|dar es salaam|kenya|uganda|africa/i.test(t)) s += 2;
  if (c.width >= 2000) s += 1;
  return s;
}

async function download(c: Cand): Promise<Buffer> {
  for (const url of [c.thumb, c.thumb.replace(/\/1280px-/, "/960px-"), c.original]) {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    await new Promise((res) => setTimeout(res, 1500));
  }
  throw new Error("download failed");
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const only = args.filter((a) => !a.startsWith("--")).map((a) => a.toUpperCase());
  const types = Object.keys(QUERIES).filter((t) => !only.length || only.includes(t));

  const [photosRow, creditsRow] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: "bodyTypePhotos" } }),
    prisma.siteSetting.findUnique({ where: { key: "bodyTypePhotoCredits" } }),
  ]);
  const photos = { ...((photosRow?.value as Record<string, string>) ?? {}) };
  const credits = { ...((creditsRow?.value as Record<string, unknown>) ?? {}) };
  const dir = path.join(process.cwd(), "public", "uploads", "body-types");
  await mkdir(dir, { recursive: true });

  let done = 0;
  for (const type of types) {
    if (photos[type] && !force) { console.log(`• ${type.padEnd(14)} already has a photo — skipped (use --force to replace)`); continue; }
    let picked: Cand | null = null;
    for (const { q, must } of QUERIES[type]) {
      try {
        const ranked = (await search(q)).map((c) => ({ c, s: score(c, must) })).filter((x) => x.s >= 0).sort((a, b) => b.s - a.s);
        if (ranked.length) { picked = ranked[0].c; break; }
      } catch (e) {
        console.log(`  ${type}: search "${q}" failed — ${(e as Error).message}`);
      }
      await new Promise((res) => setTimeout(res, 400));
    }
    if (!picked) { console.log(`✗ ${type.padEnd(14)} no suitable free photo found — upload one in Admin → Body type photos`); continue; }
    try {
      const raw = await download(picked);
      const out = await sharp(raw).rotate().resize(960, 720, { fit: "cover", position: sharp.strategy.attention }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      const file = `${type.toLowerCase()}-${Date.now().toString(36)}.jpg`; // new name each time so browsers never show a stale copy
      await writeFile(path.join(dir, file), out);
      photos[type] = `/uploads/body-types/${file}`;
      credits[type] = { url: photos[type], title: picked.title.replace(/^File:/, ""), artist: picked.artist, license: picked.license, licenseUrl: picked.licenseUrl ?? null, source: picked.page };
      done++;
      console.log(`✔ ${type.padEnd(14)} ${picked.title.replace(/^File:/, "")}  (${picked.license}, ${picked.artist})`);
    } catch (e) {
      console.log(`✗ ${type.padEnd(14)} download failed — ${(e as Error).message}`);
    }
    await new Promise((res) => setTimeout(res, 600));
  }

  await prisma.siteSetting.upsert({ where: { key: "bodyTypePhotos" }, create: { key: "bodyTypePhotos", value: photos }, update: { value: photos } });
  await prisma.siteSetting.upsert({
    where: { key: "bodyTypePhotoCredits" },
    create: { key: "bodyTypePhotoCredits", value: credits as Prisma.InputJsonValue },
    update: { value: credits as Prisma.InputJsonValue },
  });
  console.log(`\n${done} photo(s) saved. Credits are listed at /photo-credits. Replace any photo in Admin → Body type photos.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
