/** 30-day views (bars) and leads (plate-yellow dots) — dependency-free inline SVG. */
export function TrendChart({ series, labels }: { series: Array<{ day: string; views: number; leads: number }>; labels: { views: string; leads: string } }) {
  const w = 600, h = 160, pad = 24;
  const max = Math.max(1, ...series.map((s) => s.views));
  const maxL = Math.max(1, ...series.map((s) => s.leads));
  const bw = (w - pad * 2) / series.length;
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full" role="img" aria-label={`${labels.views} and ${labels.leads}, last 30 days`}>
        {[0.5, 1].map((t) => <line key={t} x1={pad} x2={w - pad} y1={h - pad - (h - pad * 2) * t} y2={h - pad - (h - pad * 2) * t} stroke="#DCE1EA" strokeDasharray="3 3" />)}
        {series.map((s, i) => {
          const bh = ((h - pad * 2) * s.views) / max;
          const ly = h - pad - ((h - pad * 2) * s.leads) / maxL;
          return (
            <g key={s.day}>
              <rect x={pad + i * bw + 1} y={h - pad - bh} width={bw - 2} height={bh} rx={1.5} fill="#2E4572"><title>{`${s.day}: ${s.views} ${labels.views}, ${s.leads} ${labels.leads}`}</title></rect>
              {s.leads > 0 && <circle cx={pad + i * bw + bw / 2} cy={ly} r={3.5} fill="#FFD43B" stroke="#0A1426" strokeWidth={1.5} />}
            </g>
          );
        })}
        <text x={pad} y={h - 6} fontSize="10" fill="#5B6B88">{series[0]?.day.slice(5)}</text>
        <text x={w - pad} y={h - 6} fontSize="10" fill="#5B6B88" textAnchor="end">{series.at(-1)?.day.slice(5)}</text>
      </svg>
      <figcaption className="mt-1 flex gap-4 text-xs text-ink-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ink-700" />{labels.views}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-ink-950 bg-plate-400" />{labels.leads}</span>
      </figcaption>
    </figure>
  );
}
