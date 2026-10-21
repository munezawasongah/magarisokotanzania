"use client";
import { SessionProvider } from "next-auth/react";
import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n";

export function Providers({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <I18nProvider locale={locale}>{children}</I18nProvider>
    </SessionProvider>
  );
}
