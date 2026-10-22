import { requireRole } from "@/lib/session";
import { DashNav } from "@/components/dashboard/DashNav";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["ADMIN", "MODERATOR"], "/admin");
  const [pending, pendingBiz, flagged, regs] = await Promise.all([
    prisma.listing.count({ where: { status: "PENDING_REVIEW", seller: { isShadowBanned: false, status: "ACTIVE" } } }),
    prisma.business.count({ where: { verification: "PENDING" } }),
    prisma.listing.count({ where: { riskLevel: { in: ["MEDIUM", "HIGH"] }, status: { notIn: ["ARCHIVED", "REJECTED"] }, OR: [{ status: "PENDING_REVIEW" }, { fraudReviewedAt: null }] } }),
    prisma.sellerRegistration.count({ where: { status: "PAYMENT_SUBMITTED" } }),
  ]);
  return (
    <div className="container grid gap-6 py-8 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <p className="mb-3 hidden text-sm font-semibold text-ink-500 lg:block">Admin</p>
        <DashNav items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/registrations", label: "Registrations", badge: regs },
          { href: "/admin/revenue", label: "Revenue" },
          { href: "/admin/listings", label: "Moderation", badge: pending },
          { href: "/admin/fraud", label: "Fraud", badge: flagged },
          { href: "/admin/blocklist", label: "Blocklist" },
          { href: "/admin/businesses", label: "Verification", badge: pendingBiz },
          { href: "/admin/reviews", label: "Reviews" },
          { href: "/admin/body-photos", label: "Body type photos" },
          { href: "/admin/settings", label: "Import tax & FX" },
        ]} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
