import { cn } from "@/lib/utils";

const tones = {
  ink: "bg-ink-900 text-white",
  plate: "bg-plate-400 text-ink-950",
  go: "bg-go-500/10 text-go-700 ring-1 ring-inset ring-go-500/30",
  muted: "bg-ink-100 text-ink-700",
  danger: "bg-danger/10 text-danger ring-1 ring-inset ring-danger/30",
} as const;

export function Badge({ tone = "muted", children, className }: { tone?: keyof typeof tones; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-semibold", tones[tone], className)}>{children}</span>;
}
