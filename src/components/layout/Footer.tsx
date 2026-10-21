import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { SITE } from "@/config/site";
import { Logo } from "./Header";
import { formatTzPhone } from "@/lib/phone";
import { fmt } from "@/i18n";

export async function Footer() {
  const { dict, locale } = await getDictionary();
  const cols = [
    { title: dict.nav.cars, links: [["SUVs", "/cars?body=SUV"], ["Pickups", "/cars?body=PICKUP"], ["4WD", "/cars?fourWd=1"], [dict.listing.importOnOrder, "/cars?importOnly=1"], ["Bodaboda & Bajaji", "/cars?body=MOTORCYCLE,THREE_WHEELER"]] },
    { title: dict.nav.parts, links: [["Toyota", "/parts?make=toyota"], ["Nissan", "/parts?make=nissan"], ["Subaru", "/parts?make=subaru"], [dict.enums.PartCategory.BRAKES, "/parts?category=BRAKES"], [dict.enums.PartCategory.TYRES_WHEELS, "/parts?category=TYRES_WHEELS"]] },
    { title: dict.nav.services, links: [[dict.enums.ServiceCategory.PRE_PURCHASE_INSPECTION, "/services?category=PRE_PURCHASE_INSPECTION"], [dict.enums.ServiceCategory.TOWING, "/services?category=TOWING"], [dict.enums.ServiceCategory.CLEARING_FORWARDING, "/services?category=CLEARING_FORWARDING"], [dict.enums.ServiceCategory.FINANCING, "/services?category=FINANCING"]] },
    { title: SITE.name, links: [[dict.nav.sell, "/sell"], [dict.nav.dealers, "/dealers"], [locale === "sw" ? "Bei za matangazo" : "Pricing for businesses", "/pricing"], [dict.nav.login, "/login"]] },
    { title: locale === "sw" ? "Sheria" : "Legal", links: [[dict.legal.terms, "/terms"], [dict.legal.privacy, "/privacy"], [dict.legal.safety, "/safety"]] },
  ];
  return (
    <footer className="mt-20 bg-ink-950 text-center text-ink-300">
      <div className="container py-14">
        <div className="flex flex-col items-center gap-3">
          <Logo className="h-32 w-32" />
          <p className="max-w-md text-sm">{locale === "sw" ? SITE.taglineSw : SITE.taglineEn}</p>
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm">
            <a href={`tel:${SITE.supportPhone}`} className="tabular-nums hover:text-white">{formatTzPhone(SITE.supportPhone)}</a>
            <span aria-hidden>·</span>
            <a href={`https://wa.me/${SITE.supportPhone.replace("+", "")}`} target="_blank" rel="noopener noreferrer" className="hover:text-white">WhatsApp</a>
            <span aria-hidden>·</span>
            <a href={`mailto:${SITE.supportEmail}`} className="hover:text-white">{SITE.supportEmail}</a>
          </p>
        </div>
        <div className="mx-auto mt-12 flex max-w-5xl flex-wrap justify-center gap-y-10">
          {cols.map((c) => (
            <div key={c.title} className="w-1/2 px-3 sm:w-1/3 lg:w-1/5">
              <h2 className="mb-3 text-sm font-semibold text-white">{c.title}</h2>
              <ul className="space-y-2 text-sm">
                {c.links.map(([label, href]) => <li key={href}><Link href={href} className="hover:text-white">{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container py-5 text-xs">
          © {SITE.copyrightYear} {SITE.company}. {dict.legal.rights}{" "}
          <span className="text-ink-300/80">{fmt(dict.legal.productOf, { brand: SITE.fullName, company: SITE.company })}</span>
        </p>
      </div>
    </footer>
  );
}
