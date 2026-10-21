"use client";
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/client";
import { formatTzs, parseTzsInput } from "@/lib/money";
import { monthlyLoanPayment } from "@/lib/import-cost";

/**
 * Reducing-balance loan estimate. Defaults reflect typical Tanzanian bank
 * vehicle loans (30% deposit, ~17% p.a., 36 months) — adjustable by the buyer.
 */
export function FinanceCalculator({ price }: { price: number }) {
  const { dict } = useI18n();
  const [depositPct, setDepositPct] = useState(30);
  const [rate, setRate] = useState(17);
  const [months, setMonths] = useState(36);
  const [customPrice, setCustomPrice] = useState(String(price));

  const p = parseTzsInput(customPrice) ?? price;
  const deposit = Math.round((p * depositPct) / 100);
  const principal = Math.max(0, p - deposit);
  const monthly = useMemo(() => monthlyLoanPayment(principal, rate, months), [principal, rate, months]);

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="fc-price">Price (TZS)</label>
        <input id="fc-price" className="field tabular-nums" inputMode="numeric" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} />
      </div>
      <div>
        <label className="label flex justify-between" htmlFor="fc-dep"><span>{dict.listing.deposit}</span><span className="tabular-nums">{depositPct}% · {formatTzs(deposit)}</span></label>
        <input id="fc-dep" type="range" min={10} max={70} step={5} value={depositPct} onChange={(e) => setDepositPct(+e.target.value)} className="w-full accent-ink-900" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="fc-term">{dict.listing.termMonths}</label>
          <select id="fc-term" className="field" value={months} onChange={(e) => setMonths(+e.target.value)}>
            {[12, 18, 24, 36, 48, 60].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="fc-rate">{dict.listing.interest}</label>
          <input id="fc-rate" type="number" min={0} max={40} step={0.5} className="field" value={rate} onChange={(e) => setRate(+e.target.value)} />
        </div>
      </div>
      <div className="rounded-md bg-ink-950 p-4 text-white">
        <p className="text-xs text-ink-300">{dict.listing.monthly}</p>
        <p className="condensed mt-1 text-3xl font-bold tabular-nums text-plate-400">{formatTzs(monthly)}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink-300">
          <p>{dict.listing.loanAmount}<br /><span className="text-sm text-white tabular-nums">{formatTzs(principal)}</span></p>
          <p>{dict.listing.totalPayable}<br /><span className="text-sm text-white tabular-nums">{formatTzs(monthly * months + deposit)}</span></p>
        </div>
      </div>
    </div>
  );
}
