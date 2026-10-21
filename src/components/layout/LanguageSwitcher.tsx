"use client";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { LOCALE_COOKIE } from "@/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, dict } = useI18n();
  const router = useRouter();
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 text-sm font-medium ${className}`}
      onClick={() => {
        const next = locale === "en" ? "sw" : "en";
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        document.documentElement.lang = next;
        router.refresh();
      }}
    >
      <Globe className="h-4 w-4" /> {dict.common.language}
    </button>
  );
}
