import { BadgeCheck } from "lucide-react";
export function VerifiedMark({ label }: { label: string }) {
  return <BadgeCheck className="h-4 w-4 shrink-0 text-go-600" aria-label={label} />;
}
