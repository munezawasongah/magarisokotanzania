import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/standard.css";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Providers } from "@/components/layout/Providers";
import { getLocale } from "@/i18n/server";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.fullName} — Cars, spare parts & auto services`, template: `%s | ${SITE.fullName}` },
  description: "Buy and sell new and used cars, find genuine spare parts and trusted mechanics across Tanzania. Prices in TZS, WhatsApp the seller in one tap.",
  applicationName: SITE.fullName,
  authors: [{ name: SITE.company }],
  publisher: SITE.company,
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: SITE.fullName, locale: "en_TZ", alternateLocale: ["sw_TZ"], images: [{ url: "/brand/logo-full.png", width: 398, height: 390, alt: SITE.fullName }] },
  manifest: "/manifest.webmanifest",
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#0A1426", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col">
        <Providers locale={locale}>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
          <Header />
          <main id="main" className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
