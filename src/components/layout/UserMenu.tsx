"use client";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n/client";

export function UserMenu() {
  const { data, status } = useSession();
  const { dict } = useI18n();
  if (status === "loading") return <span className="h-8 w-20 animate-pulse rounded bg-chrome-field" />;
  if (!data?.user) {
    return <Link href="/login" className="whitespace-nowrap text-sm font-semibold text-chrome-fg hover:text-chrome-accent">{dict.nav.login}</Link>;
  }
  const isStaff = data.user.roles?.some((r) => r === "ADMIN" || r === "MODERATOR");
  return (
    <div className="flex items-center gap-3 text-sm">
      {isStaff && <Link href="/admin" className="hidden items-center gap-1 text-chrome-muted hover:text-chrome-fg lg:flex"><ShieldCheck className="h-4 w-4" />{dict.nav.admin}</Link>}
      <Link href="/dashboard" className="flex items-center gap-1 font-semibold text-chrome-fg hover:text-chrome-accent"><LayoutDashboard className="h-4 w-4" /><span className="hidden lg:inline">{dict.nav.dashboard}</span></Link>
      <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="text-chrome-subtle hover:text-chrome-fg" aria-label={dict.nav.logout}><LogOut className="h-4 w-4" /></button>
    </div>
  );
}
