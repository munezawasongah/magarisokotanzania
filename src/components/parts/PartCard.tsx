import Link from "next/link";
import { MapPin, Wrench } from "lucide-react";
import type { PartCardRow } from "@/server/parts";
import { Img } from "@/components/ui/Img";
import { PriceTag } from "@/components/ui/PriceTag";
import { Badge } from "@/components/ui/Badge";
import { VerifiedMark } from "@/components/ui/VerifiedMark";
import { CallButton, WhatsAppButton } from "@/components/listing/ContactButtons";
import { enumLabel, fmt, type Dictionary, type Locale } from "@/i18n";
import { partWhatsappMessage } from "@/lib/whatsapp";
import { absoluteUrl } from "@/lib/utils";

function fitLine(f: PartCardRow["fitments"][number]) {
  const yrs = f.yearFrom || f.yearTo ? ` ${f.yearFrom ?? ""}–${f.yearTo ?? ""}` : "";
  return `${f.make.name}${f.model ? " " + f.model.name : ""}${yrs}${f.engineCode ? ` (${f.engineCode})` : ""}`;
}

export function PartCard({ part: p, dict, locale }: { part: PartCardRow; dict: Dictionary; locale: Locale }) {
  const url = `/parts/${p.slug}`;
  const phone = p.business?.whatsapp ?? p.business?.phone ?? p.seller.whatsapp ?? p.seller.phone;
  const callPhone = p.business?.phone ?? p.seller.phone ?? phone;
  return (
    <article className="relative flex flex-col overflow-hidden rounded-lg border border-line bg-white transition-shadow hover:shadow-lift">
      <div className="relative aspect-[4/3] bg-ink-100">
        {p.images[0] ? (
          <Img src={p.images[0]} alt={p.title} fill sizes="(max-width: 640px) 100vw, 25vw" className="object-cover" transform="f_auto,q_auto,c_pad,b_white,w_600,h_450" />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-300"><Wrench className="h-10 w-10" /></div>
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          <Badge tone={p.authenticity === "GENUINE_OEM" ? "go" : "muted"}>{enumLabel(dict, "PartAuthenticity", p.authenticity)}</Badge>
          {p.condition !== "NEW" && <Badge tone="ink">{enumLabel(dict, "PartCondition", p.condition)}</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <p className="text-2xs font-medium text-ink-500">{enumLabel(dict, "PartCategory", p.category)}{p.brand ? ` · ${p.brand}` : ""}</p>
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug">
          <Link href={url} className="after:absolute after:inset-0 after:content-['']">{p.title}</Link>
        </h3>
        {p.partNumber && <p className="condensed text-xs text-ink-700">{dict.parts.partNo}: <span className="font-semibold">{p.partNumber}</span></p>}
        {p.fitments.length > 0 && (
          <p className="line-clamp-2 text-xs text-ink-500">{dict.parts.fitment}: {p.fitments.map(fitLine).join(", ")}</p>
        )}
        <div className="flex items-center justify-between">
          <PriceTag value={p.priceTzs} size="sm" />
          <span className={`text-2xs font-medium ${p.stockQty > 0 ? "text-go-700" : "text-danger"}`}>{p.stockQty > 0 ? dict.parts.inStock : dict.parts.outOfStock}</span>
        </div>
        <div className="mt-auto space-y-2.5 border-t border-line pt-3 text-xs">
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate text-ink-700"><MapPin className="h-3.5 w-3.5 text-ink-300" />{p.region.name}</p>
            {p.business && <p className="flex items-center gap-1 truncate text-ink-500">{p.business.name}{p.business.verification === "VERIFIED" && <VerifiedMark label={dict.listing.verified} />}</p>}
            {p.warrantyDays ? <p className="text-ink-500">{fmt(dict.parts.warranty, { n: p.warrantyDays })}</p> : null}
          </div>
          <div className="relative z-10 flex gap-2">
            {callPhone && <CallButton compact className="min-w-0 flex-1 justify-center text-xs" phone={callPhone} label={dict.listing.call} />}
            {phone && (
              <WhatsAppButton compact iconOnly className="shrink-0" phone={phone} label={dict.listing.whatsapp}
                message={partWhatsappMessage({ title: p.title, partNumber: p.partNumber, url: absoluteUrl(url), locale })} />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
