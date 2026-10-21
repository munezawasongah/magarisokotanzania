import { LegalPage } from "@/components/legal/LegalPage";
import { SITE } from "@/config/site";

export const metadata = { title: "Privacy Policy", description: `How ${SITE.company} collects, uses and protects personal data on ${SITE.fullName}, under the Personal Data Protection Act, 2022.`, alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return <LegalPage doc="privacy" />;
}
