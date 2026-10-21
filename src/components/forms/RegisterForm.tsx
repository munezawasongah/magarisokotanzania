"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { enumLabel, fmt } from "@/i18n";
import { formatTzs } from "@/lib/money";
import { SITE } from "@/config/site";
import { LegalText } from "@/components/legal/LegalText";

const TYPES = [["BUYER", "Buyer"], ["SELLER", "Private seller"], ["DEALER", "DEALERSHIP"], ["YARD", "CAR_YARD"], ["IMPORTER", "IMPORTER"], ["PARTS_VENDOR", "PARTS_VENDOR"], ["SERVICE_PROVIDER", "SERVICE_PROVIDER"]] as const;

export function RegisterForm() {
  const { dict, locale } = useI18n();
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", accountType: "BUYER" });
  const [accept, setAccept] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const label = (v: string, fallback: string) =>
    v === "BUYER" ? (locale === "sw" ? "Mnunuzi" : "Buyer") : v === "SELLER" ? enumLabel(dict, "SellerType", "INDIVIDUAL") : enumLabel(dict, "BusinessType", fallback);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accept) return setError(dict.legal.agreeRequired);
    setBusy(true); setError(null); setErrors({});
    const r = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, acceptTerms: true }) });
    const data = await r.json();
    if (!r.ok) { setBusy(false); setErrors(data.details ?? {}); return setError(data.error); }
    await signIn("email-password", { identifier: f.email || f.phone, password: f.password, redirect: false });
    router.push(f.accountType === "BUYER" ? "/dashboard" : `/dashboard/registration?type=${f.accountType}`);
    router.refresh();
  }
  const field = (k: keyof typeof f) => ({ value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value }) });

  return (
    <form onSubmit={submit} className="panel space-y-4 p-6">
      <div>
        <label className="label" htmlFor="r-type">{dict.auth.accountType}</label>
        <select id="r-type" className="field" {...field("accountType")}>
          {TYPES.map(([v, fb]) => <option key={v} value={v}>{label(v, fb)}</option>)}
        </select>
        {f.accountType !== "BUYER" && <p className="mt-1.5 text-xs text-ink-500">{fmt(dict.reg.subtitle, { fee: formatTzs(SITE.registrationFeeTzs) })}</p>}
      </div>
      <div>
        <label className="label" htmlFor="r-name">{dict.auth.name}</label>
        <input id="r-name" className="field" autoComplete="name" required {...field("name")} />
        {errors.name && <p className="mt-1 text-xs text-danger">{errors.name[0]}</p>}
      </div>
      <div>
        <label className="label" htmlFor="r-phone">{dict.auth.phone}</label>
        <input id="r-phone" className="field" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" {...field("phone")} />
        {errors.phone && <p className="mt-1 text-xs text-danger">{errors.phone[0]}</p>}
      </div>
      <div>
        <label className="label" htmlFor="r-email">{dict.auth.email}</label>
        <input id="r-email" type="email" className="field" autoComplete="email" {...field("email")} />
        {errors.email && <p className="mt-1 text-xs text-danger">{errors.email[0]}</p>}
      </div>
      <div>
        <label className="label" htmlFor="r-pw">{dict.auth.password}</label>
        <input id="r-pw" type="password" className="field" autoComplete="new-password" minLength={8} required {...field("password")} />
        {errors.password && <p className="mt-1 text-xs text-danger">{errors.password[0]}</p>}
      </div>
      <label className="flex items-start gap-2 text-sm text-ink-700">
        <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 rounded border-line" checked={accept} onChange={(e) => setAccept(e.target.checked)} required />
        <LegalText template={dict.legal.agreeRegister} labels={{ terms: dict.legal.terms, privacy: dict.legal.privacy }} />
      </label>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <button className="btn-primary w-full" disabled={busy || !accept}>{busy ? dict.common.loading : dict.nav.register}</button>
    </form>
  );
}
