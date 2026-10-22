"use client";
import { useState } from "react";

type Point = { key: string; tzs: number; count: number };

const tsh = (n: number) => `TSh ${Math.round(n).toLocaleString("en-US")}`;
const short = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
const label = (key: string, monthly: boolean) =>
  monthly
    ? new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" })
    : new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Revenue per day (or month): one series, so one colour and no legend — the title names it.
 * Hover / focus a bar for the exact amount; "Show table" gives the same data as a table.
 */
export function RevenueChart({ series, monthly, title }: { series: Point[]; monthly: boolean; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...series.map((p) => p.tzs));
  const nice = (() => {
    const mag = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.ceil(max / mag) * mag;
  })();
  const ticks = [0, nice / 2, nice];
  const every = Math.ceil(series.length / 8); // ≤ 8 x labels
  const h = series[hover ?? -1];

  return (
    <section className="panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-bold">{title}</h2>
        <button type="button" className="text-xs font-semibold text-ink-700 underline" onClick={() => setTable((v) => !v)}>{table ? "Show chart" : "Show table"}</button>
      </div>
      {table ? (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-ink-500"><th className="py-1">{monthly ? "Month" : "Day"}</th><th className="py-1 text-right">Payments</th><th className="py-1 text-right">Revenue</th></tr></thead>
            <tbody>{[...series].reverse().map((p) => <tr key={p.key} className="border-t border-line"><td className="py-1.5">{label(p.key, monthly)}</td><td className="py-1.5 text-right tabular-nums">{p.count}</td><td className="py-1.5 text-right tabular-nums">{tsh(p.tzs)}</td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <div className="pointer-events-none absolute right-0 top-0 h-5 text-right text-xs text-ink-700" aria-live="polite">
            {h ? <><span className="font-semibold tabular-nums">{tsh(h.tzs)}</span> · {h.count} payment{h.count === 1 ? "" : "s"} · {label(h.key, monthly)}</> : null}
          </div>
          <div className="mt-6 flex h-56 gap-2">
            {/* y axis */}
            <div className="relative w-10 shrink-0 text-right text-2xs text-ink-500">
              {ticks.map((t) => <span key={t} className="absolute right-0 -translate-y-1/2 tabular-nums" style={{ top: `${100 - (t / nice) * 100}%` }}>{short(t)}</span>)}
            </div>
            <div className="relative flex-1">
              {ticks.map((t) => <div key={t} className="absolute inset-x-0 border-t border-ink-100" style={{ top: `${100 - (t / nice) * 100}%` }} />)}
              <div className="absolute inset-0 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
                {series.map((p, i) => (
                  <button
                    key={p.key}
                    type="button"
                    className="group relative flex h-full flex-1 items-end focus:outline-none"
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    aria-label={`${label(p.key, monthly)}: ${tsh(p.tzs)}, ${p.count} payments`}
                  >
                    <span
                      className={`block w-full rounded-t-[4px] transition-colors ${hover === i ? "bg-ink-950" : "bg-ink-700"} ${p.tzs === 0 ? "opacity-0" : ""}`}
                      style={{ height: `${(p.tzs / nice) * 100}%`, minHeight: p.tzs ? 2 : 0 }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* x axis */}
          <div className="relative ml-12 mt-1 h-4 text-2xs text-ink-500" aria-hidden>
            {series.map((p, i) => (i % every === 0 ? (
              <span key={p.key} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${((i + 0.5) / series.length) * 100}%` }}>{label(p.key, monthly)}</span>
            ) : null))}
          </div>
        </div>
      )}
    </section>
  );
}
