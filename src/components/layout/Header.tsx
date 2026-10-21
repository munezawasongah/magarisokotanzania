import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { getDictionary } from "@/i18n/server";
import { SITE } from "@/config/site";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserMenu } from "./UserMenu";
import { MobileNav } from "./MobileNav";
import { HeaderShell } from "./HeaderShell";

/**
 * The MagariSOKO Tanzania logo exactly as designed (round emblem with the name inside),
 * on a white tile so the navy lettering stays readable on the dark header and footer.
 * Shown at ≥112px so "MAGARISOKO" and "TANZANIA" are legible.
 */
export function Logo({ className = "h-28 w-28", priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/logo-tile-512.png"
      alt={SITE.fullName}
      width={512}
      height={512}
      sizes="(min-width: 640px) 128px, 112px"
      className={`shrink-0 rounded-[18%] shadow-lift ${className}`}
      priority={priority}
    />
  );
}

export async function Header() {
  const { dict } = await getDictionary();
  const links = [
    { href: "/cars", label: dict.nav.cars },
    { href: "/parts", label: dict.nav.parts },
    { href: "/services", label: dict.nav.services },
    { href: "/dealers", label: dict.nav.dealers },
  ];
  return (
    <HeaderShell>
      <div className="container flex items-center justify-between gap-3 py-2.5 transition-[padding] duration-200 group-data-[compact=true]/hdr:py-1.5 lg:gap-6">
        <Link href="/" aria-label={`${SITE.fullName} home`} className="shrink-0">
          <Logo priority className="h-28 w-28 transition-[width,height] duration-200 group-data-[compact=true]/hdr:h-20 group-data-[compact=true]/hdr:w-20 sm:h-32 sm:w-32" />
        </Link>
        <nav className="hidden flex-1 items-center gap-5 lg:flex xl:gap-6" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap text-sm font-medium text-ink-100 transition-colors hover:text-white">{l.label}</Link>
          ))}
        </nav>
        <form action="/search" role="search" className="relative hidden w-52 min-w-0 shrink xl:block 2xl:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" aria-hidden />
          <input name="q" className="h-9 w-full rounded-md border border-white/15 bg-white/10 pl-9 pr-3 text-sm text-white placeholder:text-ink-300 focus:border-plate-400 focus:outline-none" placeholder={dict.searchAll.placeholder} aria-label={dict.searchAll.title} />
        </form>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3 lg:gap-4">
          <Link href="/search" className="hidden p-1.5 text-ink-100 hover:text-white min-[400px]:inline-flex xl:hidden" aria-label={dict.searchAll.title}><Search className="h-5 w-5" /></Link>
          <LanguageSwitcher className="hidden whitespace-nowrap text-ink-100 hover:text-white lg:inline-flex" />
          <UserMenu />
          <Link href="/sell" className="btn-plate hidden whitespace-nowrap py-2 lg:inline-flex">{dict.nav.sell}</Link>
          <MobileNav links={links} cta={{ href: "/sell", label: dict.nav.sell }} searchLabel={dict.searchAll.placeholder} />
        </div>
      </div>
    </HeaderShell>
  );
}
