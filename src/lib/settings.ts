import "server-only";
import { prisma } from "./prisma";
import { DEFAULT_IMPORT_TAX_RULES, type ImportTaxRules } from "@/config/import-tax";

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
