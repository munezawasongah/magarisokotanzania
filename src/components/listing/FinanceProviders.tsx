import Link from "next/link";
import { BadgeCheck, Phone } from "lucide-react";
import { enumLabel, type Dictionary } from "@/i18n";
import { formatTzPhone } from "@/lib/phone";
import { whatsappLink } from "@/lib/whatsapp";
import { formatTzs } from "@/lib/money";
import { WhatsAppIcon } from "@/components/ui/icons";

type Provider = { id: string; name: string; slug: string; phone: string; whatsapp: string | null; verification: string; services: Array<{ category: string; title: string }> };

/** Registered finance & insurance providers, with a WhatsApp message about this exact car. */
export function FinanceProviders({ providers, car, dict }: { providers: Provider[]; car: { title: string; priceTzs: number; url: string }; dict: Dictionary }) {
  return (
    <div className="mt-5 border-t border-line pt-4">
      <h3 className="mb-2 text-sm font-bold">{dict.finance.providers}</h3>
      {providers.length === 0 ? (
        <p className="text-xs text-ink-500">{dict.finance.noneYet}</p>
      ) : (
        <ul className="space-y-2">
          {providers.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line p-2.5 text-sm">
              <div className="min-w-0">
                <Link href={`/shop/${p.slug}`} className="flex items-center gap-1 font-semibold hover:underline">{p.name}{p.verification === "VERIFIED" && <BadgeCheck className="h-4 w-4 text-go-600" aria-label={dict.listing.verified} />}</Link>
                <p className="truncate text-xs text-ink-500">{p.services.map((s) => enumLabel(dict, "ServiceCategory", s.category)).filter((v, i, a) => a.indexOf(v) === i).join(" · ")}</p>
              </div>
              <div className="flex gap-1.5">
                <a href={`tel:${p.phone}`} className="btn-ghost px-2.5 py-1.5 text-xs tabular-nums"><Phone className="h-3.5 w-3.5" />{formatTzPhone(p.phone)}</a>
                <a
                  href={whatsappLink(p.whatsapp ?? p.phone, `Habari ${p.name}, ningependa mkopo wa gari: ${car.title} (${formatTzs(car.priceTzs)}) ${car.url} — MagariSOKO Tanzania`)}
                  target="_blank" rel="noopener noreferrer" className="btn-wa px-2.5 py-1.5 text-xs" aria-label={dict.finance.contact}
                ><WhatsAppIcon className="h-3.5 w-3.5" /></a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
