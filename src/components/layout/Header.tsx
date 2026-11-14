import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { getDictionary } from "@/i18n/server";
import { SITE } from "@/config/site";
import { THEME } from "@/theme";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserMenu } from "./UserMenu";
import { MobileNav } from "./MobileNav";
import { HeaderShell } from "./HeaderShell";

/**
 * The site logo (public/brand, chosen per country in src/theme).
 *  - "tile": round emblem on a white tile, shown at ≥112px so the name inside is legible.
 *  - "wide": landscape wordmark logo, sized by height so the name stays readable; on the
 *    dark footer it sits on a white card.
 */
export function Logo({ variant = "header", priority }: { variant?: "header" | "footer"; priority?: boolean }) {
  const L = THEME.logo.header;
  const wide = L.shape === "wide";
  const size = wide
    ? variant === "header"
      ? "h-16 w-auto transition-[height] duration-200 group-data-[compact=true]/hdr:h-12 sm:h-20 sm:group-data-[compact=true]/hdr:h-14 lg:h-24 lg:group-data-[compact=true]/hdr:h-16"
      : "h-28 w-auto rounded-xl bg-white p-2"
    : variant === "header"
      ? "h-28 w-28 rounded-[18%] shadow-lift transition-[width,height] duration-200 group-data-[compact=true]/hdr:h-20 group-data-[compact=true]/hdr:w-20 sm:h-32 sm:w-32"
      : "h-32 w-32 rounded-[18%] shadow-lift";
  return (
    <Image
      src={L.src}
      alt={SITE.fullName}
      width={L.width}
      height={L.height}
      sizes={wide ? "(min-width: 1024px) 260px, (min-width: 640px) 200px, 160px" : "(min-width: 640px) 128px, 112px"}
      className={`shrink-0 ${size}`}
      priority={priority}
    />
  );
}

export async function Header() {
  const { dict, locale } = await getDictionary();
  const links = [
    { href: "/cars", label: dict.nav.cars },
    { href: "/car-prices", label: locale === "sw" ? "Bei za magari" : "Car prices" },
    { href: "/parts", label: dict.nav.parts },
    { href: "/services", label: dict.nav.services },
    { href: "/dealers", label: dict.nav.dealers },
  ];
  return (
    <HeaderShell>
      <div className="container flex items-center justify-between gap-3 py-2.5 transition-[padding] duration-200 group-data-[compact=true]/hdr:py-1.5 lg:gap-6">
        <Link href="/" aria-label={`${SITE.fullName} home`} className="shrink-0">
          <Logo priority />
        </Link>
        <nav className="hidden flex-1 items-center gap-5 lg:flex xl:gap-6" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap text-sm font-medium text-chrome-muted transition-colors hover:text-chrome-fg">{l.label}</Link>
          ))}
        </nav>
        <form action="/search" role="search" className="relative hidden w-52 min-w-0 shrink xl:block 2xl:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-chrome-subtle" aria-hidden />
          <input name="q" className="h-9 w-full rounded-md border border-chrome-line bg-chrome-field pl-9 pr-3 text-sm text-chrome-fg placeholder:text-chrome-subtle focus:border-plate-400 focus:outline-none" placeholder={dict.searchAll.placeholder} aria-label={dict.searchAll.title} />
        </form>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3 lg:gap-4">
          <Link href="/search" className="hidden p-1.5 text-chrome-muted hover:text-chrome-fg min-[400px]:inline-flex xl:hidden" aria-label={dict.searchAll.title}><Search className="h-5 w-5" /></Link>
          <LanguageSwitcher className="hidden whitespace-nowrap text-chrome-muted hover:text-chrome-fg lg:inline-flex" />
          <UserMenu />
          <Link href="/sell" className="btn-plate hidden whitespace-nowrap py-2 lg:inline-flex">{dict.nav.sell}</Link>
          <MobileNav links={links} cta={{ href: "/sell", label: dict.nav.sell }} searchLabel={dict.searchAll.placeholder} />
        </div>
      </div>
    </HeaderShell>
  );
}
