import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Stars } from "@/components/ui/Stars";
import { Badge } from "@/components/ui/Badge";
import { ReviewModeration } from "@/components/admin/ReviewModeration";
import { cn } from "@/lib/utils";

export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter } = await searchParams;
  const where = filter === "hidden" ? { status: "HIDDEN" as const } : filter === "low" ? { rating: { lte: 2 } } : {};
  const reviews = await prisma.review.findMany({
    where,
    include: { business: { select: { name: true, slug: true } }, author: { select: { name: true, phone: true, isShadowBanned: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const tabs = [["", "All"], ["low", "1–2 stars"], ["hidden", "Hidden"]] as const;
  return (
    <div className="space-y-5">
      <header>
        <h1 className="display text-2xl">Reviews</h1>
        <p className="mt-1 text-sm text-ink-500">Only buyers who contacted a seller through the platform can review them. Hide reviews that are fake, abusive or contain contact details; the seller&apos;s rating is recalculated automatically.</p>
      </header>
      <nav className="flex gap-2">
        {tabs.map(([k, label]) => <Link key={k} href={k ? `/admin/reviews?filter=${k}` : "/admin/reviews"} className={cn("chip", (filter ?? "") === k && "border-ink-900 bg-ink-900 text-white")}>{label}</Link>)}
      </nav>
      <ul className="space-y-3">
        {reviews.map((r) => (
          <li key={r.id} className="panel grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-start">
            <div className="min-w-0 space-y-1 text-sm">
              <p className="flex flex-wrap items-center gap-2">
                <Stars value={r.rating} />
                <Link href={`/shop/${r.business.slug}#reviews`} className="font-semibold hover:underline">{r.business.name}</Link>
                {r.status === "HIDDEN" && <Badge tone="danger">Hidden{r.hiddenReason ? `: ${r.hiddenReason}` : ""}</Badge>}
                {r.author.isShadowBanned && <Badge tone="danger">Shadow-banned author</Badge>}
              </p>
              <p className="text-xs text-ink-500">{r.author.name} · {r.author.phone ?? "—"} · {r.createdAt.toLocaleString("en-GB")}</p>
              <p className="whitespace-pre-line text-ink-700">{r.body}</p>
              {r.sellerReply && <p className="text-xs text-ink-500">Seller replied: {r.sellerReply}</p>}
            </div>
            <ReviewModeration id={r.id} status={r.status} />
          </li>
        ))}
      </ul>
      {reviews.length === 0 && <p className="panel p-8 text-center text-sm text-ink-500">No reviews here.</p>}
    </div>
  );
}
