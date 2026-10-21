import { LegalPage } from "@/components/legal/LegalPage";
import { SITE } from "@/config/site";

export const metadata = { title: "Safety Policy", description: `How to buy and sell vehicles and spare parts safely on ${SITE.fullName}, and how to report a scam.`, alternates: { canonical: "/safety" } };

export default function SafetyPage() {
  return <LegalPage doc="safety" />;
}
