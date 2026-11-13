import { DEFAULT_IMPORT_TAX_RULES, LEVY_LABELS, LOAN_DEFAULTS, type ImportTaxRules } from "@/config/import-tax";

export type LandedCostInput = {
  fobUsd: number;
  freightUsd?: number | null;
  insuranceUsd?: number | null;
  year: number;
  engineCc?: number | null;
  isElectric?: boolean;
  usdTzsRate: number;
  rules?: ImportTaxRules;
  now?: Date;
};

export type LandedCostLine = { key: string; label: string; labelSw: string; tzs: number; note?: string };
export type LandedCostResult = {
  cifUsd: number;
  cifTzs: number;
  ageYears: number;
  lines: LandedCostLine[];
  totalTaxesTzs: number;
  totalLocalFeesTzs: number;
  landedCostTzs: number;
  usdTzsRate: number;
};

const r = (n: number) => Math.round(n);

/**
 * Landed-cost estimate for an imported vehicle (rates in src/config/import-tax.ts, editable by the admin).
 *   CIF            = FOB + freight + insurance (insurance defaults to 1.5% of FOB+freight)
 *   Import duty    = CIF × importDuty%
 *   Excise (cc)    = (CIF + duty) × band%
 *   Excise (age)   = (CIF + duty) × age band%
 *   VAT            = (CIF + duty + excise) × VAT%
 *   RDL, CPF       = CIF × %
 *   + registration, port/shipping-line and clearing-agent charges
 */
export function estimateLandedCost(input: LandedCostInput): LandedCostResult {
  const rules = input.rules ?? DEFAULT_IMPORT_TAX_RULES;
  const now = input.now ?? new Date();
  const freight = input.freightUsd ?? 0;
  const insurance = input.insuranceUsd ?? (input.fobUsd + freight) * 0.015;
  const cifUsd = input.fobUsd + freight + insurance;
  const cifTzs = cifUsd * input.usdTzsRate;
  const ageYears = Math.max(0, now.getFullYear() - input.year);

  const duty = cifTzs * (rules.importDutyPct / 100);
  const dutiable = cifTzs + duty;

  let engineBandPct = 0;
  if (!(input.isElectric && rules.evExemptFromEngineExcise)) {
    const cc = input.engineCc ?? 0;
    const band = rules.engineExcise.find((b) => b.maxCc === null || cc <= b.maxCc);
    engineBandPct = band?.pct ?? 0;
  }
  const engineExcise = dutiable * (engineBandPct / 100);

  // Bands are half-open: minAgeYears <= age < maxAgeYears (null = no upper bound)
  const ageBand = rules.ageExcise.find((b) => ageYears >= b.minAgeYears && (b.maxAgeYears === null || ageYears < b.maxAgeYears));
  const agePct = ageBand?.pct ?? 0;
  const ageExcise = dutiable * (agePct / 100);

  const vat = (dutiable + engineExcise + ageExcise) * (rules.vatPct / 100);
  const rdl = cifTzs * (rules.railwayLevyPct / 100);
  const cpf = cifTzs * (rules.customsProcessingFeePct / 100);

  const lines: LandedCostLine[] = [
    { key: "cif", label: "Vehicle CIF value", labelSw: "Thamani ya gari (CIF)", tzs: r(cifTzs), note: `$${r(cifUsd).toLocaleString()} @ ${input.usdTzsRate.toFixed(0)}` },
    { key: "duty", label: `Import duty (${rules.importDutyPct}%)`, labelSw: `Ushuru wa forodha (${rules.importDutyPct}%)`, tzs: r(duty) },
    { key: "excise_cc", label: `Excise duty – engine (${engineBandPct}%)`, labelSw: `Ushuru wa bidhaa – injini (${engineBandPct}%)`, tzs: r(engineExcise) },
    ...(rules.ageExcise.length ? [{ key: "excise_age", label: `${LEVY_LABELS.ageExcise[0]} ${ageYears} yrs (${agePct}%)`, labelSw: `${LEVY_LABELS.ageExcise[1]} – miaka ${ageYears} (${agePct}%)`, tzs: r(ageExcise) }] : []),
    { key: "vat", label: `VAT (${rules.vatPct}%)`, labelSw: `VAT (${rules.vatPct}%)`, tzs: r(vat) },
    { key: "rdl", label: `${LEVY_LABELS.railwayLevy[0]} (${rules.railwayLevyPct}%)`, labelSw: `${LEVY_LABELS.railwayLevy[1]} (${rules.railwayLevyPct}%)`, tzs: r(rdl) },
    { key: "cpf", label: `${LEVY_LABELS.processingFee[0]} (${rules.customsProcessingFeePct}%)`, labelSw: `${LEVY_LABELS.processingFee[1]} (${rules.customsProcessingFeePct}%)`, tzs: r(cpf) },
    { key: "port", label: "Port & shipping-line charges", labelSw: "Gharama za bandari na meli", tzs: rules.portAndShippingLineTzs },
    { key: "clearing", label: "Clearing agent", labelSw: "Wakala wa forodha", tzs: rules.clearingAgentTzs },
    { key: "registration", label: LEVY_LABELS.registration[0], labelSw: LEVY_LABELS.registration[1], tzs: rules.registrationTzs },
  ];
  if (rules.maxImportAgeYears !== null && rules.maxImportAgeYears !== undefined && ageYears > rules.maxImportAgeYears) {
    lines.unshift({ key: "age_limit", label: `Over the ${rules.maxImportAgeYears}-year import age limit — this car may not be importable`, labelSw: `Zaidi ya kikomo cha umri wa miaka ${rules.maxImportAgeYears} — huenda gari hili lisiruhusiwe kuingizwa`, tzs: 0 });
  }
  const totalTaxesTzs = r(duty + engineExcise + ageExcise + vat + rdl + cpf);
  const totalLocalFeesTzs = rules.portAndShippingLineTzs + rules.clearingAgentTzs + rules.registrationTzs;
  return {
    cifUsd: r(cifUsd), cifTzs: r(cifTzs), ageYears, lines, totalTaxesTzs, totalLocalFeesTzs,
    landedCostTzs: r(cifTzs) + totalTaxesTzs + totalLocalFeesTzs, usdTzsRate: input.usdTzsRate,
  };
}

/** Standard amortised loan payment */
export function monthlyLoanPayment(principal: number, annualRatePct: number, months: number) {
  if (principal <= 0 || months <= 0) return 0;
  const i = annualRatePct / 100 / 12;
  if (i === 0) return principal / months;
  return (principal * i) / (1 - Math.pow(1 + i, -months));
}

export { LOAN_DEFAULTS };

/** Estimated monthly repayment for a car at the default loan terms (rounded to LOAN_DEFAULTS.roundTo). */
export function estimateMonthly(priceTzs: number, terms: { depositPct: number; ratePct: number; months: number } = LOAN_DEFAULTS) {
  const principal = priceTzs * (1 - terms.depositPct / 100);
  return Math.round(monthlyLoanPayment(principal, terms.ratePct, terms.months) / LOAN_DEFAULTS.roundTo) * LOAN_DEFAULTS.roundTo;
}
