/**
 * Default rules for estimating the landed cost of an imported used vehicle in
 * Tanzania. These are ESTIMATES shown to buyers; the authoritative figure is
 * the TRA assessment at clearance. Admins can override every value at
 * /admin/settings (stored in SiteSetting key "importTaxRules").
 *
 * Rates reflect the EAC CET (25% import duty), VAT 18%, engine-capacity excise,
 * and the age-based excise in the Finance Act 2026 (effective 1 July 2026):
 * 18% for 8–10 years, 35% for >10–20 years, 40% for >20 years.
 */
export type ImportTaxRules = {
  importDutyPct: number;
  vatPct: number;
  railwayLevyPct: number;
  customsProcessingFeePct: number;
  /** Excise by engine capacity, applied to (CIF + import duty). Ordered by maxCc. */
  engineExcise: Array<{ maxCc: number | null; pct: number }>;
  /** Additional excise for older vehicles, applied to (CIF + import duty). */
  /** Half-open bands: minAgeYears <= age < maxAgeYears (null = no upper bound). */
  ageExcise: Array<{ minAgeYears: number; maxAgeYears: number | null; pct: number }>;
  /** Electric vehicles: engine-capacity excise does not apply. */
  evExemptFromEngineExcise: boolean;
  /** Oldest vehicle (years) that may be imported; null = no limit. Older cars get a warning line. */
  maxImportAgeYears: number | null;
  /** Flat local costs in TZS */
  registrationTzs: number;
  portAndShippingLineTzs: number;
  clearingAgentTzs: number;
  updatedNote: string;
};

export const DEFAULT_IMPORT_TAX_RULES: ImportTaxRules = {
  importDutyPct: 25,
  vatPct: 18,
  railwayLevyPct: 1.5,
  customsProcessingFeePct: 0.6,
  engineExcise: [
    { maxCc: 1000, pct: 0 },
    { maxCc: 2000, pct: 5 },
    { maxCc: null, pct: 10 },
  ],
  ageExcise: [
    { minAgeYears: 8, maxAgeYears: 10, pct: 18 },
    { minAgeYears: 10, maxAgeYears: 20, pct: 35 },
    { minAgeYears: 20, maxAgeYears: null, pct: 40 },
  ],
  evExemptFromEngineExcise: true,
  maxImportAgeYears: null,
  registrationTzs: 500_000,
  portAndShippingLineTzs: 900_000,
  clearingAgentTzs: 700_000,
  updatedNote: "Finance Act 2026 age-based excise (effective 1 July 2026). Verify with TRA before quoting.",
};

/** Names of the levies and local costs on the landed-cost breakdown (English / Kiswahili). */
export const LEVY_LABELS = {
  railwayLevy: ["Railway development levy", "Tozo ya reli"],
  processingFee: ["Customs processing fee", "Ada ya uchakataji forodha"],
  registration: ["TRA registration & plates", "Usajili wa TRA na namba"],
  ageExcise: ["Excise duty – age", "Ushuru wa umri"],
} as const;

/** Typical bank / asset-finance vehicle loan, used for "from … / month" estimates. */
export const LOAN_DEFAULTS = { depositPct: 30, ratePct: 17, months: 36, roundTo: 1_000 } as const;
