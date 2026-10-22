"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { cn } from "@/lib/utils";
import { LegalText } from "@/components/legal/LegalText";

/** Phone + SMS OTP (default, East-Africa-first) or email/phone + password. */
export function LoginForm() {
  const { dict } = useI18n();
  const router = useRouter();
  const callbackUrl = useSearchParams().get("callbackUrl") || "/dashboard";
  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const r = await fetch("/api/auth/otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
    const data = await r.json();
    setBusy(false);
    if (!r.ok) return setError(data.error ?? dict.common.error);
    setSentTo(data.phone);
    setDevCode(data.devCode ?? null);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const r = await signIn("phone-otp", { phone: sentTo, code, name, redirect: false });
    setBusy(false);
    if (r?.error) return setError("That code is wrong or has expired. Request a new one.");
    router.push(callbackUrl);
    router.refresh();
  }

  async function passwordLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const r = await signIn("email-password", { identifier, password, redirect: false });
    setBusy(false);
    if (r?.error) return setError("Email/phone or password is incorrect.");
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="panel p-6">
      <div className="mb-5 grid grid-cols-2 rounded-md bg-ink-100 p-1 text-sm font-semibold" role="tablist">
        {(["otp", "password"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(null); }}
            className={cn("rounded px-3 py-2", mode === m ? "bg-white shadow-sm" : "text-ink-500")}>
            {m === "otp" ? dict.auth.phoneTab : dict.auth.emailTab}
          </button>
        ))}
      </div>

      {mode === "otp" && !sentTo && (
        <form onSubmit={requestCode} className="space-y-4">
          <div>
            <label className="label" htmlFor="phone">{dict.auth.phone}</label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-line bg-ink-100 px-3 text-sm text-ink-700">🇹🇿 +255</span>
              <input id="phone" className="field rounded-l-none" inputMode="tel" autoComplete="tel" placeholder="712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? dict.common.loading : dict.auth.sendCode}</button>
        </form>
      )}

      {mode === "otp" && sentTo && (
        <form onSubmit={verify} className="space-y-4">
          <p className="text-sm text-ink-700">{fmt(dict.auth.codeSent, { phone: sentTo })}</p>
          {devCode && <p className="rounded bg-plate-300/40 px-3 py-2 text-xs">Dev mode: your code is <strong>{devCode}</strong></p>}
          <div>
            <label className="label" htmlFor="code">{dict.auth.code}</label>
            <input id="code" className="field condensed text-center text-2xl tracking-[0.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="name">{dict.auth.name} <span className="font-normal text-ink-300">(new accounts)</span></label>
            <input id="name" className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button className="btn-primary w-full" disabled={busy || code.length !== 6}>{busy ? dict.common.loading : dict.auth.verify}</button>
          <button type="button" className="w-full text-sm text-ink-500 underline" onClick={() => { setSentTo(null); setCode(""); }}>{dict.common.cancel}</button>
        </form>
      )}

      {mode === "password" && (
        <form onSubmit={passwordLogin} className="space-y-4">
          <div>
            <label className="label" htmlFor="ident">{dict.auth.email} / {dict.auth.phone}</label>
            <input id="ident" className="field" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor="pw">{dict.auth.password}</label>
              <a href="/forgot-password" className="text-xs font-semibold text-ink-700 underline">{dict.reset.forgot}</a>
            </div>
            <input id="pw" type="password" className="field" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? dict.common.loading : dict.nav.login}</button>
        </form>
      )}
      {error && <p className="mt-4 text-sm text-danger" role="alert">{error}</p>}
      <p className="mt-5 text-xs leading-5 text-ink-500">
        <LegalText template={dict.legal.otpNotice} labels={{ terms: dict.legal.terms, privacy: dict.legal.privacy }} />
      </p>
    </div>
  );
}
