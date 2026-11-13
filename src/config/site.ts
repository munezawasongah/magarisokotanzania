export const SITE = {
  /** Brand name, shown everywhere (header, footer, titles, SMS, WhatsApp, legal pages) */
  name: "MagariSOKO Tanzania",
  /** Full brand for titles, legal pages and the footer */
  fullName: "MagariSOKO Tanzania",
  /** Legal owner and operator of the platform */
  company: "Jatelo Technologies",
  copyrightYear: 2026,
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  taglineEn: "Tanzania's marketplace for cars, spare parts and auto services",
  taglineSw: "Soko la magari, vipuri na huduma za magari Tanzania",
  supportPhone: "+255668212595",
  supportEmail: "support@magarisoko.co.tz",
  /** Data-protection / privacy contact named in the Privacy Policy */
  privacyEmail: "privacy@magarisoko.co.tz",
  /** Scam and safety reports */
  safetyEmail: "safety@magarisoko.co.tz",
  /** Date shown as "Last updated" on the legal pages (ISO) */
  legalUpdated: "2026-11-11",
  /** Short name for the phone home screen, and the slug for upload folders and export files */
  shortName: "MagariSOKO",
  slug: "magarisoko",
  country: "TZ",
  countryName: "Tanzania",
  currency: "TZS",
  /** Shown before every amount: "TSh 45,000,000" */
  currencySymbol: "TSh",
  /** Business day boundaries, receipts and reports */
  timeZone: "Africa/Dar_es_Salaam",
  /** Country calling code without "+" */
  dialCode: "255",
  flag: "🇹🇿",
  countryAdjective: "Tanzanian",
  /** Used in page descriptions */
  majorCities: "Dar es Salaam, Arusha, Mwanza, Dodoma",
  partsHub: "Kariakoo",
  addressExample: "e.g. Mikocheni B, near Shoppers Plaza",
  carLocationExample: "e.g. Sinza Mori, near Shekilango Rd",
  phoneExample: "0712 345 678",
  /** Country-sized money thresholds (whole shillings) used by validation, alerts and fraud scoring */
  amounts: {
    vehicleMin: 100_000,
    partMin: 500,
    serviceMin: 1_000,
    /** price-drop alert fires on a cut of 2 % or this amount, whichever is smaller */
    priceDropMin: 200_000,
    /** new accounts listing above these are scored as riskier */
    fraudVeryHighValue: 100_000_000,
    fraudHighValue: 50_000_000,
    /** private sellers above this without a verified mobile-money wallet are scored as riskier */
    fraudWalletCheckValue: 30_000_000,
    /** USD rate fallback and sanity floor for the exchange-rate feed */
    fxFallbackPerUsd: 2600,
    fxSanityMin: 500,
    /** smallest "max price" option in the car search; the list grows from it (×1 … ×60) */
    priceStepBase: 5_000_000,
  },
  /** Labels for the business registration numbers stored on a mini-site (columns tin / brelaRegNo) */
  taxIdLabel: "TIN (TRA)",
  companyRegLabel: "BRELA registration no.",
  /** Where the admin checks those numbers */
  taxIdCheck: "the TIN on the TRA portal and the registration on BRELA ORS",
  /** Tax authority named in the import-cost and settings screens */
  taxAuthority: "TRA",
  /** Number-plate series field on the sell form: the series hints at when a car was first registered */
  plateSeries: { label: "Plate series (e.g. D, E)", maxLength: 2 },
  /** Live listings a private seller may have at once (anti-dealer-in-disguise cap) */
  baseActiveListings: 20,
  /**
   * Manual mobile-money payment option shown during registration (admin checks the
   * transaction code against the statement). Leave lipaNamba empty to hide it.
   */
  manualPayment: {
    /** What the manual option is called locally */
    label: "Lipa Namba",
    lipaNamba: process.env.NEXT_PUBLIC_LIPA_NAMBA || "",
    accountName: process.env.NEXT_PUBLIC_LIPA_NAME || "Jatelo Technologies",
    network: process.env.NEXT_PUBLIC_LIPA_NETWORK || "M-Pesa / Mixx by Yas / Airtel Money",
  },
  /** Listing lifetime before it expires and must be renewed */
  listingLifetimeDays: 60,
  pageSize: 24,
} as const;

/**
 * How the marketplace charges. These are the defaults; the admin changes them at
 * Admin → Pricing & fees without a redeploy (stored in SiteSetting "monetisation").
 *
 *   LAUNCH — every listing is free for everyone (liquidity first).
 *   PAID   — private sellers get their first `freePrivateListings` free, then pay
 *            `privateListingFee` per listing for each `listingLifetimeDays` period;
 *            businesses get `businessFreeListings` live listings without a plan and
 *            subscribe to a monthly plan for more.
 * Featured / Bump boosts and business plans can be bought in either phase.
 * There is never a commission on a sale.
 */
export const MONETISATION_DEFAULTS = {
  phase: "LAUNCH" as "LAUNCH" | "PAID",
  /** One-off sign-up fee for businesses (dealers, yards, importers, parts shops, garages). 0 = free. Private sellers never pay one. */
  registrationFee: 0,
  freePrivateListings: 2,
  privateListingFee: 10_000,
  businessFreeListings: 3,
};

/** Price-band chips under the hero search (whole shillings). */
export const PRICE_BANDS: ReadonlyArray<{ min?: number; max?: number }> = [
  { max: 10_000_000 },
  { min: 10_000_000, max: 20_000_000 },
  { min: 20_000_000, max: 50_000_000 },
  { min: 50_000_000 },
];

/** Monthly subscription plans per business type (seeded into `Plan`). */
export const PLAN_SEED = [
  { code: "DEALER_STARTER", name: "Dealer Starter", businessType: "DEALERSHIP", priceTzsMonthly: 150_000, priceTzsYearly: 1_500_000, maxActiveListings: 25, featuredCredits: 2, leadAnalytics: false, verifiedBadge: false, sortOrder: 1 },
  { code: "DEALER_PRO", name: "Dealer Pro", businessType: "DEALERSHIP", priceTzsMonthly: 350_000, priceTzsYearly: 3_500_000, maxActiveListings: 100, featuredCredits: 8, leadAnalytics: true, verifiedBadge: true, sortOrder: 2 },
  { code: "DEALER_ENTERPRISE", name: "Dealer Enterprise", businessType: "DEALERSHIP", priceTzsMonthly: 750_000, priceTzsYearly: 7_500_000, maxActiveListings: -1, featuredCredits: 20, leadAnalytics: true, verifiedBadge: true, sortOrder: 3 },
  { code: "IMPORTER_PRO", name: "Importer Pro", businessType: "IMPORTER", priceTzsMonthly: 400_000, priceTzsYearly: 4_000_000, maxActiveListings: 200, featuredCredits: 10, leadAnalytics: true, verifiedBadge: true, sortOrder: 4 },
  { code: "PARTS_BASIC", name: "Parts Store Basic", businessType: "PARTS_VENDOR", priceTzsMonthly: 50_000, priceTzsYearly: 500_000, maxActiveListings: 150, featuredCredits: 1, leadAnalytics: false, verifiedBadge: false, sortOrder: 5 },
  { code: "PARTS_PRO", name: "Parts Store Pro", businessType: "PARTS_VENDOR", priceTzsMonthly: 120_000, priceTzsYearly: 1_200_000, maxActiveListings: 2_000, featuredCredits: 5, leadAnalytics: true, verifiedBadge: true, sortOrder: 6 },
  { code: "SERVICE_LISTED", name: "Service Directory", businessType: "SERVICE_PROVIDER", priceTzsMonthly: 30_000, priceTzsYearly: 300_000, maxActiveListings: 10, featuredCredits: 0, leadAnalytics: false, verifiedBadge: false, sortOrder: 7 },
  { code: "SERVICE_PREMIUM", name: "Service Premium", businessType: "SERVICE_PROVIDER", priceTzsMonthly: 80_000, priceTzsYearly: 800_000, maxActiveListings: 30, featuredCredits: 2, leadAnalytics: true, verifiedBadge: true, sortOrder: 8 },
] as const;

/** One-off promotion products (seeded into `PromotionProduct`). */
export const PROMOTION_SEED = [
  { code: "BUMP", type: "BUMP", name: "Bump to top", nameSw: "Panda juu", days: 1, priceTzs: 5_000, sortOrder: 1 },
  { code: "FEATURED_7D", type: "FEATURED", name: "Featured — 7 days", nameSw: "Tangazo maalum — siku 7", days: 7, priceTzs: 15_000, sortOrder: 2 },
  { code: "FEATURED_30D", type: "FEATURED", name: "Featured — 30 days", nameSw: "Tangazo maalum — siku 30", days: 30, priceTzs: 45_000, sortOrder: 3 },
  { code: "SPONSORED_7D", type: "SPONSORED", name: "Sponsored carousel — 7 days", nameSw: "Tangazo la udhamini — siku 7", days: 7, priceTzs: 30_000, sortOrder: 4 },
  { code: "SPOTLIGHT_7D", type: "HOMEPAGE_SPOTLIGHT", name: "Homepage spotlight — 7 days", nameSw: "Ukurasa wa mbele — siku 7", days: 7, priceTzs: 60_000, sortOrder: 5 },
] as const;
