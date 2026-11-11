import "server-only";
import { prisma } from "./prisma";
import { DEFAULT_IMPORT_TAX_RULES, type ImportTaxRules } from "@/config/import-tax";
import { MONETISATION_DEFAULTS } from "@/config/site";

export async function getImportTaxRules(): Promise<ImportTaxRules> {
  const row = await prisma.siteSetting.findUnique({ where: { key: "importTaxRules" } }).catch(() => null);
  return row ? { ...DEFAULT_IMPORT_TAX_RULES, ...(row.value as Partial<ImportTaxRules>) } : DEFAULT_IMPORT_TAX_RULES;
}

export async function setImportTaxRules(rules: ImportTaxRules) {
  await prisma.siteSetting.upsert({
    where: { key: "importTaxRules" },
    create: { key: "importTaxRules", value: rules },
    update: { value: rules },
  });
}

/* ─────────── body-type photos (home page tiles) ─────────── */

export type BodyTypePhotos = Partial<Record<string, string>>;

export async function getBodyTypePhotos(): Promise<BodyTypePhotos> {
  const row = await prisma.siteSetting.findUnique({ where: { key: "bodyTypePhotos" } }).catch(() => null);
  return (row?.value as BodyTypePhotos | undefined) ?? {};
}

export async function setBodyTypePhotos(photos: BodyTypePhotos) {
  const clean = Object.fromEntries(Object.entries(photos).filter(([, v]) => typeof v === "string" && v.length > 0));
  await prisma.siteSetting.upsert({
    where: { key: "bodyTypePhotos" },
    create: { key: "bodyTypePhotos", value: clean },
    update: { value: clean },
  });
}

export type PhotoCredit = { url: string; title: string; artist: string; license: string; licenseUrl: string | null; source: string };

/** Credits for downloaded Wikimedia photos still in use (a photo an admin replaced drops its credit). */
export async function getBodyTypePhotoCredits(): Promise<Array<PhotoCredit & { body: string }>> {
  const [photos, row] = await Promise.all([
    getBodyTypePhotos(),
    prisma.siteSetting.findUnique({ where: { key: "bodyTypePhotoCredits" } }).catch(() => null),
  ]);
  const credits = (row?.value as Record<string, PhotoCredit> | undefined) ?? {};
  return Object.entries(credits)
    .filter(([body, c]) => c && photos[body] === c.url)
    .map(([body, c]) => ({ body, ...c }));
}

/* ─────────── monetisation (listing fees, sign-up fee, phase) ─────────── */

export type Monetisation = typeof MONETISATION_DEFAULTS;

export async function getMonetisation(): Promise<Monetisation> {
  const row = await prisma.siteSetting.findUnique({ where: { key: "monetisation" } }).catch(() => null);
  return { ...MONETISATION_DEFAULTS, ...((row?.value as Partial<Monetisation> | undefined) ?? {}) };
}

export async function setMonetisation(m: Monetisation) {
  const value = {
    phase: m.phase === "PAID" ? "PAID" : "LAUNCH",
    registrationFee: Math.max(0, Math.round(m.registrationFee)),
    freePrivateListings: Math.max(0, Math.round(m.freePrivateListings)),
    privateListingFee: Math.max(0, Math.round(m.privateListingFee)),
    businessFreeListings: Math.max(0, Math.round(m.businessFreeListings)),
  };
  await prisma.siteSetting.upsert({ where: { key: "monetisation" }, create: { key: "monetisation", value }, update: { value } });
}

/** Private sellers pay per listing only in the PAID phase and only when the fee is above zero. */
export const listingFeesOn = (m: Monetisation) => m.phase === "PAID" && m.privateListingFee > 0;
