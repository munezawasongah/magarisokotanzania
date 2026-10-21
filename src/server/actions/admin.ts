"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { moderateListing, verifyBusiness } from "@/server/admin";
import { setImportTaxRules } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { DEFAULT_IMPORT_TAX_RULES } from "@/config/import-tax";
import { redirect } from "next/navigation";
import { ListingError } from "@/server/listings";
import { banUser, chassisKey, clearListingFlags, scoreListing, unbanUser } from "@/server/fraud/engine";
import { normalizeTzPhone } from "@/lib/phone";
import { BlockType } from "@/generated/prisma/enums";
import { approveRegistration, rejectRegistration } from "@/server/registration";

async function staff() {
  const u = await getCurrentUser();
  if (!u || !u.roles.some((r) => r === "ADMIN" || r === "MODERATOR")) throw new Error("Forbidden");
  return u;
}

export async function moderateListingAction(formData: FormData) {
  const u = await staff();
  const id = String(formData.get("id"));
  const decision = formData.get("decision") === "APPROVE" ? "APPROVE" : "REJECT";
  const back = String(formData.get("back") ?? "/admin/listings");
  try {
    await moderateListing(u, id, decision, String(formData.get("reason") ?? "") || undefined);
  } catch (e) {
    if (e instanceof ListingError) redirect(`${back}?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  revalidatePath("/admin/fraud");
  revalidatePath("/admin/listings");
  revalidatePath("/cars");
}

export async function verifyBusinessAction(formData: FormData) {
  const u = await staff();
  await verifyBusiness(u, String(formData.get("id")), formData.get("decision") === "VERIFIED" ? "VERIFIED" : "REJECTED", String(formData.get("note") ?? "") || undefined);
  revalidatePath("/admin/businesses");
}

export async function resolveReportAction(formData: FormData) {
  await staff();
  await prisma.listingReport.update({ where: { id: String(formData.get("id")) }, data: { resolved: true } });
  revalidatePath("/admin");
}

const rulesSchema = z.object({
  importDutyPct: z.coerce.number().min(0).max(100), vatPct: z.coerce.number().min(0).max(100),
  railwayLevyPct: z.coerce.number().min(0).max(20), customsProcessingFeePct: z.coerce.number().min(0).max(20),
  engine1: z.coerce.number().min(0).max(100), engine2: z.coerce.number().min(0).max(100), engine3: z.coerce.number().min(0).max(100),
  age1: z.coerce.number().min(0).max(100), age2: z.coerce.number().min(0).max(100), age3: z.coerce.number().min(0).max(100),
  registrationTzs: z.coerce.number().int().min(0), portAndShippingLineTzs: z.coerce.number().int().min(0), clearingAgentTzs: z.coerce.number().int().min(0),
  updatedNote: z.string().max(300),
  fxRate: z.coerce.number().min(0).optional(),
});

export async function saveSettingsAction(formData: FormData) {
  const u = await staff();
  if (!u.roles.includes("ADMIN")) throw new Error("Admins only");
  const v = rulesSchema.parse(Object.fromEntries(formData));
  const d = DEFAULT_IMPORT_TAX_RULES;
  await setImportTaxRules({
    ...d,
    importDutyPct: v.importDutyPct, vatPct: v.vatPct, railwayLevyPct: v.railwayLevyPct, customsProcessingFeePct: v.customsProcessingFeePct,
    engineExcise: [{ maxCc: d.engineExcise[0].maxCc, pct: v.engine1 }, { maxCc: d.engineExcise[1].maxCc, pct: v.engine2 }, { maxCc: null, pct: v.engine3 }],
    ageExcise: [{ ...d.ageExcise[0], pct: v.age1 }, { ...d.ageExcise[1], pct: v.age2 }, { ...d.ageExcise[2], pct: v.age3 }],
    registrationTzs: v.registrationTzs, portAndShippingLineTzs: v.portAndShippingLineTzs, clearingAgentTzs: v.clearingAgentTzs, updatedNote: v.updatedNote,
  });
  if (v.fxRate && v.fxRate > 500) await prisma.exchangeRate.create({ data: { rate: v.fxRate, source: "manual" } });
  await prisma.auditLog.create({ data: { actorId: u.id, action: "settings.importTaxRules", entityType: "SiteSetting", entityId: "importTaxRules" } });
  revalidatePath("/admin/settings");
}

/* ═════════════════════════════ fraud actions ═══════════════════════════════ */

async function adminOnly() {
  const u = await staff();
  if (!u.roles.includes("ADMIN")) throw new Error("Admins only");
  return u;
}

export async function banUserAction(formData: FormData) {
  const u = await staff();
  const userId = String(formData.get("userId"));
  const mode = formData.get("mode") === "SHADOW" ? "SHADOW" : "BAN";
  const reason = String(formData.get("reason") || "Fraud / scam activity");
  if (userId === u.id) throw new Error("You cannot ban yourself");
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { roles: true } });
  if (target?.roles.includes("ADMIN")) throw new Error("Admins cannot be banned here");
  await banUser(u.id, userId, reason, mode);
  revalidatePath("/admin/fraud");
  revalidatePath("/admin/blocklist");
  revalidatePath("/cars");
}

export async function unbanUserAction(formData: FormData) {
  const u = await adminOnly();
  await unbanUser(u.id, String(formData.get("userId")));
  revalidatePath("/admin/fraud");
  revalidatePath("/admin/blocklist");
}

/** Moderator reviewed a flagged listing and found it genuine: clear flags and (if held) publish. */
export async function clearFlaggedListingAction(formData: FormData) {
  const u = await staff();
  const id = String(formData.get("id"));
  const l = await prisma.listing.findUnique({ where: { id }, select: { status: true } });
  if (l?.status === "PENDING_REVIEW") {
    try {
      await moderateListing(u, id, "APPROVE");
    } catch (e) {
      if (e instanceof ListingError) redirect(`/admin/fraud?error=${encodeURIComponent(e.message)}`);
      throw e;
    }
  } else {
    await clearListingFlags(u.id, id);
  }
  revalidatePath("/admin/fraud");
}

export async function rejectFlaggedListingAction(formData: FormData) {
  const u = await staff();
  await moderateListing(u, String(formData.get("id")), "REJECT", String(formData.get("reason") || "Suspected fraud"));
  revalidatePath("/admin/fraud");
}

export async function rescoreListingAction(formData: FormData) {
  await staff();
  await scoreListing(String(formData.get("id")));
  revalidatePath("/admin/fraud");
}

export async function releaseInquiryAction(formData: FormData) {
  await staff();
  await prisma.inquiry.update({ where: { id: String(formData.get("id")) }, data: { isHeld: false, status: "NEW" } });
  revalidatePath("/admin/fraud");
}

export async function addBlocklistAction(formData: FormData) {
  const u = await staff();
  const type = String(formData.get("type")) as BlockType;
  if (!(type in BlockType)) throw new Error("Invalid type");
  let value = String(formData.get("value") ?? "").trim();
  if (type === "PHONE") value = normalizeTzPhone(value) ?? value.replace(/\s+/g, "");
  if (type === "EMAIL" || type === "KEYWORD") value = value.toLowerCase();
  if (type === "CHASSIS") value = chassisKey(value) ?? "";
  if (!value) redirect("/admin/blocklist?error=" + encodeURIComponent("Enter a value"));
  const days = Number(formData.get("days") || 0);
  await prisma.blocklist.upsert({
    where: { type_value: { type, value } },
    create: { type, value, reason: String(formData.get("reason") || "") || null, createdById: u.id, expiresAt: days > 0 ? new Date(Date.now() + days * 86400_000) : null },
    update: { reason: String(formData.get("reason") || "") || undefined, expiresAt: days > 0 ? new Date(Date.now() + days * 86400_000) : null },
  });
  await prisma.auditLog.create({ data: { actorId: u.id, action: "blocklist.add", entityType: "Blocklist", entityId: `${type}:${value}` } });
  revalidatePath("/admin/blocklist");
}

export async function removeBlocklistAction(formData: FormData) {
  const u = await adminOnly();
  const id = String(formData.get("id"));
  await prisma.blocklist.delete({ where: { id } });
  await prisma.auditLog.create({ data: { actorId: u.id, action: "blocklist.remove", entityType: "Blocklist", entityId: id } });
  revalidatePath("/admin/blocklist");
}

/* ─────────── seller registrations (TSh 30,000 fee) ─────────── */

export async function approveRegistrationAction(formData: FormData) {
  const u = await staff();
  try {
    await approveRegistration(u, String(formData.get("id")));
  } catch (e) {
    if (e instanceof ListingError) redirect(`/admin/registrations?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  revalidatePath("/admin/registrations");
  revalidatePath("/search");
}

export async function rejectRegistrationAction(formData: FormData) {
  const u = await staff();
  const reason = String(formData.get("reason") ?? "").trim() || "Payment could not be found";
  try {
    await rejectRegistration(u, String(formData.get("id")), reason.slice(0, 300));
  } catch (e) {
    if (e instanceof ListingError) redirect(`/admin/registrations?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  revalidatePath("/admin/registrations");
}
