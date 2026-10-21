import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { getDictionary } from "@/i18n/server";
import { LoginForm } from "@/components/forms/LoginForm";

export const metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage() {
  const { dict } = await getDictionary();
  return (
    <div className="container max-w-md py-12">
      <Image src="/brand/logo-full.png" alt="MagariSOKO Tanzania" width={398} height={390} className="mx-auto mb-6 h-40 w-auto" priority />
      <h1 className="display mb-6 text-3xl">{dict.auth.loginTitle}</h1>
      <Suspense><LoginForm /></Suspense>
      <p className="mt-4 text-center text-sm text-ink-500">{dict.auth.noAccount} <Link href="/register" className="font-semibold text-ink-900 underline">{dict.nav.register}</Link></p>
    </div>
  );
}
