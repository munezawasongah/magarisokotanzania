export type MoneyInput = bigint | number | string | null | undefined;

export function toNum(v: MoneyInput): number {
  if (v === null || v === undefined || v === "") return 0;
  return typeof v === "bigint" ? Number(v) : Number(v);
}

const tzsFmt = new Intl.NumberFormat("en-TZ", { maximumFractionDigits: 0 });

/** 45000000 → "TSh 45,000,000" */
export function formatTzs(v: MoneyInput): string {
  return `TSh ${tzsFmt.format(Math.round(toNum(v)))}`;
}

/** 45000000 → "TSh 45M", 850000 → "TSh 850K" */
export function formatTzsCompact(v: MoneyInput): string {
  const n = toNum(v);
  if (n >= 1_000_000_000) return `TSh ${trim(n / 1_000_000_000)}B`;
  if (n >= 1_000_000) return `TSh ${trim(n / 1_000_000)}M`;
  if (n >= 1_000) return `TSh ${trim(n / 1_000)}K`;
  return formatTzs(n);
}

function trim(n: number) {
  return n >= 100 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, "");
}

export function formatUsd(v: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

export function tzsToUsd(tzs: MoneyInput, rate: number): number {
  return rate > 0 ? toNum(tzs) / rate : 0;
}

/** Parse user input like "45,000,000", "45m", "45M", "850k" into a TZS integer */
export function parseTzsInput(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? Math.round(raw) : null;
  const s = raw.trim().toLowerCase().replace(/tsh|tzs|,|\s/g, "");
  const m = s.match(/^(\d+(?:\.\d+)?)([kmb])?$/);
  if (!m) return null;
  const mult = m[2] === "b" ? 1e9 : m[2] === "m" ? 1e6 : m[2] === "k" ? 1e3 : 1;
  return Math.round(parseFloat(m[1]) * mult);
}
