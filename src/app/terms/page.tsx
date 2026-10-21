import { LegalPage } from "@/components/legal/LegalPage";
import { SITE } from "@/config/site";

export const metadata = { title: "Terms of Use", description: `The terms that govern use of ${SITE.fullName}, operated by ${SITE.company}.`, alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return <LegalPage doc="terms" />;
}
