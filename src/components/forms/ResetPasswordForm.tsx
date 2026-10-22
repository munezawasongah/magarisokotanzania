"use client";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";

/** Two steps: request a code (SMS or email), then enter it with the new password. */
export function ResetPasswordForm() {
  const { dict } = useI18n();
  const t = dict.reset;
  const [step, setStep] = useState<"request" | "confirm" | "done">("request");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function post(body: object) {
    setBusy(true); setError(null);
    const r = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError(d.error ?? dict.common.error); return null; }
    return d;
  }

  async function request(e: React.FormEvent) {
    e.preventDefault();
    const d = await post({ identifier });
    if (!d) return;
    setInfo(fmt(t.sent, { id: identifier }) + (d.devCode ? ` (dev code: ${d.devCode})` : ""));
    setStep("confirm");
  }
  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) return setError(t.mismatch);
    const d = await post({ identifier, code, password: pw });
    if (d) setStep("done");
  }

  if (step === "done") {
    return (
      <div className="panel space-y-4 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-go-600" />
        <p className="font-semibold">{t.done}</p>
        <a href="/login" className="btn-primary">{dict.nav.login}</a>
      </div>
    );
  }

  return (
    <div className="panel space-y-4 p-6">
      <p className="text-sm text-ink-700">{t.intro}</p>
      {step === "request" ? (
        <form onSubmit={request} className="space-y-4">
          <div>
            <label className="label" htmlFor="rid">{t.identifier}</label>
            <input id="rid" className="field" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="0712 345 678 / name@example.com" autoComplete="username" required />
          </div>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? dict.common.loading : t.send}</button>
        </form>
      ) : (
        <form onSubmit={confirm} className="space-y-4">
          {info && <p className="rounded-md bg-paper p-3 text-sm text-ink-700" role="status">{info}</p>}
          <div>
            <label className="label" htmlFor="rcode">{t.code}</label>
            <input id="rcode" className="field tracking-[0.4em] tabular-nums" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required />
          </div>
          <div>
            <label className="label" htmlFor="rpw">{t.newPassword}</label>
            <input id="rpw" type="password" className="field" minLength={8} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="rpw2">{t.confirm}</label>
            <input id="rpw2" type="password" className="field" minLength={8} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? dict.common.loading : t.save}</button>
          <button type="button" className="w-full text-center text-sm text-ink-500 underline" onClick={() => { setStep("request"); setCode(""); setError(null); }}>{t.send}</button>
        </form>
      )}
    </div>
  );
}
