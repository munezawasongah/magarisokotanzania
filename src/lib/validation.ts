import { z } from "zod";
import {
  BodyType, Drivetrain, FuelType, InquiryType, OriginCountry, PartAuthenticity, PartCategory, PartCondition,
  SellerType, Steering, Transmission, VehicleCondition, PaymentProvider, ServiceCategory,
} from "@/generated/prisma/enums";
import { normalizeTzPhone } from "./phone";
import { parseTzsInput } from "./money";

const CURRENT_YEAR = new Date().getFullYear();

/** Photo URL: https (Cloudinary/S3) or a local development upload under /uploads/. */
const imageUrl = z.string().max(500).refine((v) => /^https:\/\/[^\s]+$/.test(v) || /^\/uploads\/[\w.-]+$/.test(v), "Invalid image URL");

export const tzPhone = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizeTzPhone(v);
    if (!n) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid Tanzanian mobile number, e.g. 0712 345 678" });
      return z.NEVER;
    }
    return n;
  });

const tzs = z.union([z.string(), z.number()]).transform((v, ctx) => {
  const n = parseTzsInput(v);
  if (n === null || n < 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid amount in TZS" });
    return z.NEVER;
  }
  return n;
});

const optionalInt = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : Number(v)), z.number().int().min(min).max(max).optional());

/* ─────────── listing create / update ─────────── */

export const listingCreateSchema = z
  .object({
    title: z.string().trim().max(120).optional().or(z.literal("")),
    description: z.string().trim().min(20, "Describe the vehicle in at least 20 characters").max(5000),
    makeId: z.coerce.number().int().positive(),
    modelId: z.coerce.number().int().positive(),
    trim: z.string().trim().max(60).optional(),
    year: z.coerce.number().int().min(1960).max(CURRENT_YEAR + 1),
    condition: z.nativeEnum(VehicleCondition),
    bodyType: z.nativeEnum(BodyType),
    transmission: z.nativeEnum(Transmission),
    fuelType: z.nativeEnum(FuelType),
    steering: z.nativeEnum(Steering).default("RHD"),
    drivetrain: z.nativeEnum(Drivetrain).optional(),
    engineCc: optionalInt(50, 20000),
    mileageKm: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : typeof v === "string" ? v.replace(/[,\s]/g, "") : v),
      z.coerce
        .number({ required_error: "Enter the mileage in km (0 for a brand-new vehicle)", invalid_type_error: "Enter the mileage in km (0 for a brand-new vehicle)" })
        .int("Enter whole kilometres")
        .min(0, "Mileage cannot be negative")
        .max(2_000_000, "Check the mileage"),
    ),
    colorExterior: z.string().trim().max(40).optional(),
    colorInterior: z.string().trim().max(40).optional(),
    doors: optionalInt(0, 8),
    seats: optionalInt(1, 90),
    groundClearanceMm: optionalInt(80, 600),
    registrationSeries: z.string().trim().toUpperCase().max(2).optional(),
    chassisNumber: z.string().trim().max(30).optional(),
    features: z.array(z.string().max(60)).max(60).default([]),
    priceTzs: tzs.refine((n) => n >= 100_000, "Enter the price in TZS — vehicles cannot be listed without a price"),
    priceNegotiable: z.coerce.boolean().default(true),
    showUsdPrice: z.coerce.boolean().default(false),
    regionId: z.coerce.number().int().positive(),
    districtId: z.coerce.number().int().positive().optional(),
    locationAddress: z.string().trim().max(200).optional().or(z.literal("").transform(() => undefined)),
    latitude: z.coerce.number().min(-12.5).max(-0.5).optional(),
    longitude: z.coerce.number().min(29).max(41).optional(),
    contactPhone: tzPhone.optional(),
    contactWhatsapp: tzPhone.optional(),
    businessId: z.string().cuid().optional(),
    isImportOnOrder: z.coerce.boolean().default(false),
    originCountry: z.nativeEnum(OriginCountry).optional(),
    fobUsd: optionalInt(100, 2_000_000),
    freightUsd: optionalInt(0, 100_000),
    insuranceUsd: optionalInt(0, 100_000),
    etaDays: optionalInt(1, 180),
    confirmOwnership: z.literal(true, { errorMap: () => ({ message: "Confirm you own or are authorised to sell this vehicle." }) }),
    images: z
      .array(z.object({ url: imageUrl, publicId: z.string().optional(), width: z.number().optional(), height: z.number().optional() }))
      .max(20)
      .default([]),
  })
  .superRefine((v, ctx) => {
    if (v.isImportOnOrder && (!v.originCountry || !v.fobUsd)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fobUsd"], message: "Import-on-order listings need origin country and FOB price" });
    }
  });
export type ListingCreateInput = z.infer<typeof listingCreateSchema>;

export const listingUpdateSchema = z.object({
  description: z.string().trim().min(20).max(5000).optional(),
  priceTzs: tzs.optional(),
  priceNegotiable: z.boolean().optional(),
  mileageKm: optionalInt(0, 2_000_000),
  features: z.array(z.string().max(60)).max(60).optional(),
  contactPhone: tzPhone.optional(),
  contactWhatsapp: tzPhone.optional(),
  status: z.enum(["ACTIVE", "SOLD", "ARCHIVED"]).optional(),
  /** Renew for another listing period (free). Works on live and expired listings. */
  renew: z.literal(true).optional(),
});

/* ─────────── search filters (from URL search params) ─────────── */

export const SORTS = ["featured", "newest", "price_asc", "price_desc", "year_desc", "mileage_asc"] as const;
export type SortKey = (typeof SORTS)[number];

const csvEnum = <T extends Record<string, string>>(e: T) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.split(",").filter(Boolean) : Array.isArray(v) ? v : undefined),
    z.array(z.nativeEnum(e)).optional(),
  );
const csvInt = z.preprocess(
  (v) => (typeof v === "string" ? v.split(",").filter(Boolean).map(Number) : undefined),
  z.array(z.number().int().positive()).optional(),
);
const optNum = z.preprocess((v) => (v === "" || v === undefined || v === null ? undefined : parseTzsInput(String(v))), z.number().nonnegative().optional());
const flag = z.preprocess((v) => v === "1" || v === "true" || v === true, z.boolean().optional());

export const listingFilterSchema = z.object({
  q: z.string().trim().max(100).optional(),
  make: z.string().trim().optional(), // slug
  model: z.string().trim().optional(), // slug
  yearMin: optNum, yearMax: optNum,
  priceMin: optNum, priceMax: optNum,
  mileageMin: optNum, mileageMax: optNum,
  body: csvEnum(BodyType),
  transmission: csvEnum(Transmission),
  fuel: csvEnum(FuelType),
  condition: csvEnum(VehicleCondition),
  steering: csvEnum(Steering),
  drivetrain: csvEnum(Drivetrain),
  sellerType: csvEnum(SellerType),
  region: z.string().trim().optional(), // slug
  district: csvInt,
  fourWd: flag,
  importOnly: flag,
  minClearance: optNum,
  business: z.string().optional(), // business slug (showroom)
  sort: z.enum(SORTS).catch("featured").default("featured"),
  page: z.coerce.number().int().min(1).max(500).catch(1).default(1),
  perPage: z.coerce.number().int().min(1).max(60).catch(24).default(24),
});
export type ListingFilters = z.infer<typeof listingFilterSchema>;

export function parseSearchParams<T extends z.ZodTypeAny>(schema: T, sp: URLSearchParams | Record<string, string | string[] | undefined>): z.infer<T> {
  const obj: Record<string, string> = {};
  if (sp instanceof URLSearchParams) sp.forEach((v, k) => (obj[k] = v));
  else for (const [k, v] of Object.entries(sp)) if (v !== undefined) obj[k] = Array.isArray(v) ? v.join(",") : v;
  const r = schema.safeParse(obj);
  return r.success ? r.data : schema.parse({});
}

/* ─────────── spare parts ─────────── */

export const partFilterSchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: csvEnum(PartCategory),
  condition: csvEnum(PartCondition),
  authenticity: csvEnum(PartAuthenticity),
  make: z.string().trim().optional(),
  model: z.string().trim().optional(),
  year: optNum,
  region: z.string().trim().optional(),
  priceMax: optNum,
  vendor: z.string().optional(),
  sort: z.enum(["relevance", "newest", "price_asc", "price_desc"]).catch("relevance").default("relevance"),
  page: z.coerce.number().int().min(1).max(500).catch(1).default(1),
  perPage: z.coerce.number().int().min(1).max(60).catch(24).default(24),
});
export type PartFilters = z.infer<typeof partFilterSchema>;

export const partCreateSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(3000).optional(),
  category: z.nativeEnum(PartCategory),
  condition: z.nativeEnum(PartCondition).default("NEW"),
  authenticity: z.nativeEnum(PartAuthenticity).default("AFTERMARKET"),
  brand: z.string().trim().max(60).optional(),
  partNumber: z.string().trim().max(60).optional(),
  oemNumber: z.string().trim().max(60).optional(),
  priceTzs: tzs.refine((n) => n >= 500, "Enter the price in TZS — parts cannot be listed without a price"),
  stockQty: z.coerce.number().int().min(0).max(100000).default(1),
  warrantyDays: optionalInt(0, 3650),
  regionId: z.coerce.number().int().positive(),
  districtId: z.coerce.number().int().positive().optional(),
  businessId: z.string().cuid().optional(),
  images: z.array(imageUrl).max(10).default([]),
  fitments: z
    .array(
      z.object({
        makeId: z.coerce.number().int().positive(),
        modelId: z.coerce.number().int().positive().optional(),
        yearFrom: optionalInt(1960, CURRENT_YEAR + 1),
        yearTo: optionalInt(1960, CURRENT_YEAR + 1),
        engineCode: z.string().trim().max(30).optional(),
      }),
    )
    .max(100)
    .default([]),
});
export type PartCreateInput = z.infer<typeof partCreateSchema>;

/* ─────────── inquiries ─────────── */

export const inquirySchema = z
  .object({
    listingId: z.string().cuid().optional(),
    partId: z.string().cuid().optional(),
    businessId: z.string().cuid().optional(),
    type: z.nativeEnum(InquiryType).default("GENERAL"),
    name: z.string().trim().min(2, "Enter your name").max(80),
    phone: tzPhone,
    email: z.string().trim().email().max(120).optional().or(z.literal("").transform(() => undefined)),
    message: z.string().trim().min(5, "Message is too short").max(2000),
    offerTzs: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined || v === "" ? undefined : parseTzsInput(v) ?? undefined)),
    preferredDate: z.preprocess((v) => (v ? new Date(String(v)) : undefined), z.date().optional()),
    website: z.string().max(0).optional(), // honeypot — must stay empty
  })
  .refine((v) => v.listingId || v.partId || v.businessId, { message: "Missing target", path: ["listingId"] });
export type InquiryInput = z.infer<typeof inquirySchema>;

/* ─────────── auth ─────────── */

export const otpRequestSchema = z.object({ phone: tzPhone });
export const otpVerifySchema = z.object({ phone: tzPhone, code: z.string().regex(/^\d{6}$/), name: z.string().trim().max(80).optional() });

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().email().optional().or(z.literal("").transform(() => undefined)),
    phone: tzPhone.optional().or(z.literal("").transform(() => undefined)),
    password: z.string().min(8, "Use at least 8 characters").max(100),
    accountType: z.enum(["BUYER", "SELLER", "DEALER", "YARD", "IMPORTER", "PARTS_VENDOR", "SERVICE_PROVIDER"]).default("BUYER"),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: "Please accept the Terms of Use and Privacy Policy to continue." }) }),
  })
  .refine((v) => v.email || v.phone, { message: "Provide an email or phone number", path: ["email"] });

/* ─────────── payments ─────────── */

export const paymentInitSchema = z
  .object({
    purpose: z.enum(["PROMOTION", "SUBSCRIPTION", "LISTING_FEE", "REGISTRATION_FEE"]),
    productCode: z.string().optional(), // PromotionProduct.code
    planCode: z.string().optional(), // Plan.code
    billing: z.enum(["monthly", "yearly"]).default("monthly"),
    listingId: z.string().cuid().optional(),
    businessId: z.string().cuid().optional(),
    provider: z.nativeEnum(PaymentProvider),
    msisdn: tzPhone.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.purpose === "PROMOTION" && (!v.productCode || !v.listingId)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "productCode and listingId required" });
    if (v.purpose === "LISTING_FEE" && !v.listingId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "listingId required" });
    if (v.purpose === "SUBSCRIPTION" && (!v.planCode || !v.businessId)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "planCode and businessId required" });
    if (v.provider !== "CARD" && !v.msisdn) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["msisdn"], message: "Mobile money number required" });
  });
export type PaymentInitInput = z.infer<typeof paymentInitSchema>;


/* ─────────── seller registration / mini-site (shop) ─────────── */

export const REGISTRATION_TYPES = ["SELLER", "DEALER", "YARD", "IMPORTER", "PARTS_VENDOR", "SERVICE_PROVIDER"] as const;
export type RegistrationType = (typeof REGISTRATION_TYPES)[number];

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal("").transform(() => undefined));

export const shopSchema = z.object({
  name: z.string().trim().min(2, "Enter the shop or display name").max(100),
  tagline: optionalText(140),
  description: optionalText(3000),
  phone: tzPhone,
  whatsapp: tzPhone.optional().or(z.literal("").transform(() => undefined)),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("").transform(() => undefined)),
  website: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  regionId: z.coerce.number().int().positive({ message: "Choose a region" }),
  districtId: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
  address: z.string().trim().min(3, "Enter the street, area or landmark").max(200),
  latitude: z.coerce.number().min(-12.5).max(-0.5).optional().or(z.literal("").transform(() => undefined)),
  longitude: z.coerce.number().min(29).max(41).optional().or(z.literal("").transform(() => undefined)),
  openingHours: optionalText(200),
  tin: optionalText(20),
  brelaRegNo: optionalText(30),
  /** Service providers only: which kind of service business */
  serviceKind: z.enum(["SERVICE_PROVIDER", "INSPECTION_CENTER", "FINANCE_INSURANCE"]).optional(),
  importCountries: z.array(z.nativeEnum(OriginCountry)).default([]),
  logoUrl: imageUrl.optional().or(z.literal("").transform(() => undefined)),
  coverUrl: imageUrl.optional().or(z.literal("").transform(() => undefined)),
  services: z
    .array(
      z.object({
        category: z.nativeEnum(ServiceCategory),
        title: z.string().trim().min(2).max(100),
        priceFromTzs: tzs.refine((n) => n >= 1_000, "Every service needs a price (at least TSh 1,000)"),
        mobileService: z.coerce.boolean().default(false),
      }),
    )
    .max(40)
    .default([]),
});
export type ShopInput = z.infer<typeof shopSchema>;

export const registrationDetailsSchema = z
  .object({ accountType: z.enum(REGISTRATION_TYPES), shop: shopSchema })
  .superRefine((v, ctx) => {
    if (v.accountType === "SERVICE_PROVIDER" && v.shop.services.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["shop", "services"], message: "Add at least one service with its price" });
    }
  });

export const manualPaymentSchema = z.object({
  reference: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{8,14}$/, "Enter the transaction code from your payment SMS (8–14 letters and numbers)"),
  msisdn: tzPhone,
});
