/**
 * Finds a real, freely licensed photo for each body type on Wikimedia Commons.
 * Plain fetch only (no DB, no server-only imports) so the deploy script and the
 * admin button share it. Photos are served from Wikimedia's CDN (upload.wikimedia.org,
 * hotlinking allowed with credit) and resized/cropped by next/image, so nothing is
 * stored on the server and the photos survive every redeploy.
 */
export type CommonsPhoto = { url: string; title: string; artist: string; license: string; licenseUrl: string | null; source: string };

const UA = "CarMarket-MagariSOKO/1.0 (https://jatelo-techs.com; evans.onyango@jatelo-techs.com) body-type-photos";
const API = "https://commons.wikimedia.org/w/api.php";

/** Vehicles common on East African roads, most typical first. `must` words must all appear in the file name. */
export const BODY_PHOTO_QUERIES: Record<string, Array<{ q: string; must: string[] }>> = {
  SUV: [{ q: "Toyota RAV4", must: ["rav4"] }, { q: "Toyota Land Cruiser Prado", must: ["prado"] }, { q: "Toyota Harrier", must: ["harrier"] }],
  SEDAN: [{ q: "Toyota Premio", must: ["premio"] }, { q: "Toyota Allion", must: ["allion"] }, { q: "Toyota Corolla sedan", must: ["corolla"] }],
  HATCHBACK: [{ q: "Toyota Vitz", must: ["vitz"] }, { q: "Toyota Yaris hatchback", must: ["yaris"] }, { q: "Volkswagen Golf", must: ["golf"] }],
  WAGON: [{ q: "Toyota Corolla Fielder", must: ["fielder"] }, { q: "Toyota Probox", must: ["probox"] }, { q: "Toyota Caldina", must: ["caldina"] }],
  PICKUP: [{ q: "Toyota Hilux", must: ["hilux"] }, { q: "Isuzu D-Max", must: ["d-max"] }, { q: "Nissan Navara", must: ["navara"] }],
  VAN: [{ q: "Toyota HiAce van", must: ["hiace"] }, { q: "Nissan NV350 Caravan", must: ["caravan"] }],
  MINIVAN: [{ q: "Toyota Noah", must: ["noah"] }, { q: "Toyota Voxy", must: ["voxy"] }, { q: "Toyota Alphard", must: ["alphard"] }],
  MINIBUS: [{ q: "Toyota HiAce commuter", must: ["hiace"] }, { q: "Toyota Coaster", must: ["coaster"] }],
  BUS: [{ q: "Toyota Coaster bus", must: ["coaster"] }, { q: "Yutong bus", must: ["yutong"] }, { q: "Scania coach bus", must: ["scania"] }],
  TRUCK: [{ q: "Isuzu Forward truck", must: ["isuzu"] }, { q: "Mitsubishi Fuso Fighter", must: ["fuso"] }, { q: "Scania truck", must: ["scania"] }],
  COUPE: [{ q: "Toyota 86 coupe", must: ["86"] }, { q: "Toyota Celica", must: ["celica"] }],
  CONVERTIBLE: [{ q: "Mazda MX-5 convertible", must: ["mx-5"] }, { q: "BMW convertible", must: ["bmw"] }],
  MOTORCYCLE: [{ q: "Bajaj Boxer motorcycle", must: ["boxer"] }, { q: "TVS motorcycle", must: ["tvs"] }, { q: "Honda CG125", must: ["cg"] }, { q: "boda boda motorcycle", must: ["boda"] }],
  THREE_WHEELER: [{ q: "Bajaj RE auto rickshaw", must: ["bajaj"] }, { q: "tuk-tuk Kenya", must: ["tuk"] }, { q: "auto rickshaw", must: ["rickshaw"] }],
};

const BAD = /\b(interior|inside|cockpit|dashboard|dash|engine|motor ?room|badge|emblem|logo|wheel|rim|seat|steering|boot|trunk|tail ?light|headlight|lamp|detail|crash|wreck|accident|burn|model ?car|toy|diecast|scale|lego|police|polis|patrol|riot|ambulance|fire|firefighting|rescue|emergency|brigade|military|army|defen[cs]e|ministry|government|un|unhcr|unicef|ngo|red ?cross|airport|tow ?truck|recovery|crane|tanker|garbage|refuse|dump|mixer|camper|motorhome|limousine|hearse|taxi|uber|rally|race|racing|drift|modified|tuned|kit|grille|mirror|key|manual|brochure|advert|poster|sketch|drawing|render|cutaway|chassis|frame|museum|rear|back)\b/i;
const GOOD = /\b(front|side|three[- ]quarter|3\/4|exterior|left|right|profile)\b/i;
const OK_LICENSE = /^(cc0|public domain|pd|cc[- ]by(-sa)?[- ]\d(\.\d)?)/i;

type Cand = CommonsPhoto & { width: number; height: number; quality: boolean };
const strip = (html?: string) => (html ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function search(q: string): Promise<Cand[]> {
  const params = new URLSearchParams({
    action: "query", format: "json", formatversion: "2", generator: "search", gsrnamespace: "6", gsrlimit: "40",
    gsrsearch: `${q} filetype:bitmap`, prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "1280",
  });
  const r = await fetch(`${API}?${params}`, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`Commons search failed (${r.status})`);
  const d = (await r.json()) as { query?: { pages?: Array<{ title: string; imageinfo?: Array<Record<string, unknown>> }> } };
  return (d.query?.pages ?? []).flatMap((p) => {
    const ii = p.imageinfo?.[0];
    if (!ii || ii.mime !== "image/jpeg") return [];
    const meta = (ii.extmetadata ?? {}) as Record<string, { value?: string }>;
    return [{
      title: p.title.replace(/^File:/, ""),
      url: String(ii.thumburl ?? ii.url),
      width: Number(ii.width), height: Number(ii.height),
      license: strip(meta.LicenseShortName?.value),
      licenseUrl: meta.LicenseUrl?.value ?? null,
      artist: (strip(meta.Artist?.value) || "Unknown").slice(0, 120),
      source: String(ii.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`),
      quality: /quality|featured|valued/i.test(meta.Assessments?.value ?? ""),
    }];
  });
}

function score(c: Cand, must: string[]) {
  const t = c.title.toLowerCase().replace(/_/g, " ");
  if (!must.every((m) => t.includes(m))) return -1;
  if (BAD.test(t) || !OK_LICENSE.test(c.license)) return -1;
  const ratio = c.width / c.height;
  if (ratio < 1.2 || ratio > 2.1 || c.width < 1000) return -1;
  let s = 0;
  if (c.quality) s += 6;
  if (GOOD.test(t)) s += 3;
  const year = t.match(/\b(19|20)\d{2}\b/)?.[0];
  if (year && Number(year) >= 2008) s += 2;
  if (/tanzania|dar es salaam|kenya|nairobi|uganda|africa/i.test(t)) s += 2;
  if (c.width >= 2000) s += 1;
  return s;
}

/** Best free photo for one body type, or null when none passes the filters. */
export async function findBodyTypePhoto(type: string): Promise<CommonsPhoto | null> {
  for (const { q, must } of BODY_PHOTO_QUERIES[type] ?? []) {
    try {
      const ranked = (await search(q)).map((c) => ({ c, s: score(c, must) })).filter((x) => x.s >= 0).sort((a, b) => b.s - a.s);
      for (const { c } of ranked.slice(0, 3)) {
        // make sure the CDN copy actually loads before using it
        const ok = await fetch(c.url, { method: "HEAD", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15_000) }).then((r) => r.ok).catch(() => false);
        if (ok) return { url: c.url, title: c.title, artist: c.artist, license: c.license, licenseUrl: c.licenseUrl, source: c.source };
      }
    } catch { /* try the next query */ }
    await sleep(400);
  }
  return null;
}

/**
 * Fills body types that have no photo (or all of them with force). Returns the updated
 * photo map and credits; the caller saves them. Admin-chosen photos are kept unless force.
 */
export async function fillBodyTypePhotos(
  photos: Record<string, string>,
  credits: Record<string, CommonsPhoto>,
  opts: { force?: boolean; only?: string[]; log?: (line: string) => void; deadlineMs?: number } = {},
) {
  const log = opts.log ?? (() => {});
  const next = { ...photos };
  const nextCredits = { ...credits };
  let found = 0;
  const stopAt = Date.now() + (opts.deadlineMs ?? 100_000); // keeps deploys and the admin request short
  for (const type of Object.keys(BODY_PHOTO_QUERIES)) {
    if (Date.now() > stopAt) { log("… time limit reached — run again to fill the rest"); break; }
    if (opts.only?.length && !opts.only.includes(type)) continue;
    if (next[type] && !opts.force) { log(`• ${type.padEnd(14)} has a photo — kept`); continue; }
    const photo = await findBodyTypePhoto(type);
    if (!photo) { log(`✗ ${type.padEnd(14)} no suitable free photo found`); continue; }
    next[type] = photo.url;
    nextCredits[type] = photo;
    found++;
    log(`✔ ${type.padEnd(14)} ${photo.title} (${photo.license}, ${photo.artist})`);
    await sleep(300);
  }
  return { photos: next, credits: nextCredits, found };
}
