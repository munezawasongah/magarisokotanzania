import Link from "next/link";
import Image from "next/image";
import { getDictionary } from "@/i18n/server";
import { RegisterForm } from "@/components/forms/RegisterForm";

export const metadata = { title: "Create account", robots: { index: false } };

export default async function RegisterPage() {
  const { dict } = await getDictionary();
  return (
    <div className="container max-w-md py-12">
      <Image src="/brand/logo-full.png" alt="MagariSOKO Tanzania" width={398} height={390} className="mx-auto mb-6 h-40 w-auto" priority />
      <h1 className="display mb-6 text-3xl">{dict.auth.registerTitle}</h1>
      <RegisterForm />
      <p className="mt-4 text-center text-sm text-ink-500">{dict.auth.haveAccount} <Link href="/login" className="font-semibold text-ink-900 underline">{dict.nav.login}</Link></p>
    </div>
  );
}
