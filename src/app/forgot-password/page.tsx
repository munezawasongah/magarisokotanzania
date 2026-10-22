import Link from "next/link";
import Image from "next/image";
import { getDictionary } from "@/i18n/server";
import { ResetPasswordForm } from "@/components/forms/ResetPasswordForm";

export const metadata = { title: "Reset password", robots: { index: false } };

export default async function ForgotPasswordPage() {
  const { dict } = await getDictionary();
  return (
    <div className="container max-w-md py-12">
      <Image src="/brand/logo-full.png" alt="MagariSOKO Tanzania" width={398} height={390} className="mx-auto mb-6 h-32 w-auto" priority />
      <h1 className="display mb-6 text-3xl">{dict.reset.title}</h1>
      <ResetPasswordForm />
      <p className="mt-4 text-center text-sm text-ink-500"><Link href="/login" className="font-semibold text-ink-900 underline">{dict.nav.login}</Link></p>
    </div>
  );
}
