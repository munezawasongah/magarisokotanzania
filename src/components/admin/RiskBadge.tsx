import { Badge } from "@/components/ui/Badge";

export function RiskBadge({ level, score }: { level: string; score: number }) {
  const tone = level === "HIGH" ? "danger" : level === "MEDIUM" ? "plate" : "go";
  return <Badge tone={tone}>{level} risk · {score}</Badge>;
}

type Reason = { code: string; points: number; label: string; detail?: { listings?: Array<{ slug: string; title: string }> } };

/** The individual signals behind a score, positive (risk) first, then trust credits. */
export function RiskReasons({ reasons }: { reasons: unknown }) {
  const list = (Array.isArray(reasons) ? (reasons as Reason[]) : []).slice().sort((a, b) => b.points - a.points);
  if (!list.length) return <p className="text-xs text-ink-500">No risk signals.</p>;
  return (
    <ul className="space-y-1 text-xs">
      {list.map((r, i) => (
        <li key={i} className="flex gap-2">
          <span className={`w-9 shrink-0 text-right font-semibold tabular-nums ${r.points > 0 ? "text-danger" : "text-go-700"}`}>{r.points > 0 ? `+${r.points}` : r.points}</span>
          <span className="text-ink-700">
            {r.label}
            {r.detail?.listings?.length ? (
              <> — {r.detail.listings.map((x, k) => <a key={k} href={`/cars/${x.slug}`} target="_blank" className="underline">{x.title}</a>).reduce<React.ReactNode[]>((acc, el, k) => (k ? [...acc, ", ", el] : [el]), [])}</>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
