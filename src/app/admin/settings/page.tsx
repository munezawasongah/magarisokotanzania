import { getImportTaxRules } from "@/lib/settings";
import { getUsdTzsRate } from "@/lib/fx";
import { saveSettingsAction } from "@/server/actions/admin";

export default async function SettingsPage() {
  const [r, rate] = await Promise.all([getImportTaxRules(), getUsdTzsRate()]);
  const num = (name: string, label: string, value: number, step = "0.1") => (
    <div><label className="label" htmlFor={name}>{label}</label><input id={name} name={name} type="number" step={step} defaultValue={value} className="field tabular-nums" /></div>
  );
  return (
    <form action={saveSettingsAction} className="max-w-3xl space-y-6">
      <h1 className="display text-2xl">Import tax rules & FX</h1>
      <p className="text-sm text-ink-500">Used for the landed-cost estimate on every import-on-order listing. Update when the Finance Act or TRA rates change.</p>
      <fieldset className="panel grid gap-4 p-5 sm:grid-cols-4">
        <legend className="px-1 font-semibold">Duties & levies (%)</legend>
        {num("importDutyPct", "Import duty", r.importDutyPct)}{num("vatPct", "VAT", r.vatPct)}{num("railwayLevyPct", "Railway levy", r.railwayLevyPct)}{num("customsProcessingFeePct", "Customs processing", r.customsProcessingFeePct)}
      </fieldset>
      <fieldset className="panel grid gap-4 p-5 sm:grid-cols-3">
        <legend className="px-1 font-semibold">Excise by engine size (%)</legend>
        {num("engine1", `≤ ${r.engineExcise[0].maxCc} cc`, r.engineExcise[0].pct)}{num("engine2", `≤ ${r.engineExcise[1].maxCc} cc`, r.engineExcise[1].pct)}{num("engine3", `> ${r.engineExcise[1].maxCc} cc`, r.engineExcise[2].pct)}
      </fieldset>
      <fieldset className="panel grid gap-4 p-5 sm:grid-cols-3">
        <legend className="px-1 font-semibold">Additional excise by age (%)</legend>
        {r.ageExcise.map((b, i) => <div key={i}>{num(`age${i + 1}`, `${b.minAgeYears}${b.maxAgeYears ? `–${b.maxAgeYears}` : "+"} years`, b.pct)}</div>)}
      </fieldset>
      <fieldset className="panel grid gap-4 p-5 sm:grid-cols-3">
        <legend className="px-1 font-semibold">Local costs (TZS)</legend>
        {num("registrationTzs", "Registration & plates", r.registrationTzs, "1000")}{num("portAndShippingLineTzs", "Port & shipping line", r.portAndShippingLineTzs, "1000")}{num("clearingAgentTzs", "Clearing agent", r.clearingAgentTzs, "1000")}
      </fieldset>
      <fieldset className="panel grid gap-4 p-5 sm:grid-cols-2">
        <legend className="px-1 font-semibold">Notes & exchange rate</legend>
        <div><label className="label" htmlFor="updatedNote">Note shown to staff</label><input id="updatedNote" name="updatedNote" defaultValue={r.updatedNote} className="field" /></div>
        {num("fxRate", `USD → TZS (current ${rate.toFixed(0)}) — set to override`, Math.round(rate), "1")}
      </fieldset>
      <button className="btn-primary">Save settings</button>
    </form>
  );
}
