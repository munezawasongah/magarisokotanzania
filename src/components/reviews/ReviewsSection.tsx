import Link from "next/link";
import type { Dictionary } from "@/i18n";
import { fmt } from "@/i18n";
import { getBusinessReviews, reviewEligibility } from "@/server/reviews";
import { prisma } from "@/lib/prisma";
import { Stars } from "@/components/ui/Stars";
import { ReviewForm } from "./ReviewForm";
import { ReviewReply } from "./ReviewReply";

/** Rating summary, star distribution, reviews with seller replies, and the review form. */
export async function ReviewsSection({ businessId, slug, ratingAvg, ratingCount, viewerId, dict }: {
  businessId: string; slug: string; ratingAvg: number; ratingCount: number; viewerId?: string | null; dict: Dictionary;
}) {
  const t = dict.reviews;
  const [{ rows, dist }, elig, isOwner] = await Promise.all([
    getBusinessReviews(businessId, viewerId),
    reviewEligibility(viewerId, businessId),
    viewerId ? prisma.businessMember.findFirst({ where: { businessId, userId: viewerId, role: { in: ["OWNER", "MANAGER"] } } }) : null,
  ]);
  const mine = viewerId ? rows.find((r) => r.authorId === viewerId) : undefined;
  const max = Math.max(1, ...dist.map((d) => d.count));

  return (
    <section id="reviews" className="scroll-mt-28">
      <h2 className="mb-4 text-xl font-bold">{t.title}</h2>
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="panel h-fit p-5 text-center">
          <p className="condensed text-4xl font-bold tabular-nums">{ratingCount ? ratingAvg.toFixed(1) : "–"}</p>
          <Stars value={ratingAvg} size="h-5 w-5" className="mt-1" />
          <p className="mt-1 text-sm text-ink-500">{ratingCount === 1 ? t.countOne : fmt(t.count, { n: ratingCount })}</p>
          <ul className="mt-4 space-y-1 text-xs">
            {dist.map((d) => (
              <li key={d.star} className="flex items-center gap-2">
                <span className="w-3 tabular-nums">{d.star}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100"><span className="block h-full rounded-full bg-plate-400" style={{ width: `${(d.count / max) * 100}%` }} /></span>
                <span className="w-5 text-right tabular-nums text-ink-500">{d.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          {!isOwner && (
            <div className="panel p-5">
              <h3 className="mb-3 font-bold">{mine ? t.edit : t.write}</h3>
              {elig.ok ? (
                <ReviewForm businessId={businessId} existing={mine ? { rating: mine.rating, body: mine.body } : null} />
              ) : elig.reason === "login" ? (
                <Link href={`/login?callbackUrl=${encodeURIComponent(`/shop/${slug}#reviews`)}`} className="btn-ghost py-2">{t.loginToReview}</Link>
              ) : (
                <p className="text-sm text-ink-500">{elig.reason === "own" ? t.ownShop : t.onlyContacted}</p>
              )}
            </div>
          )}
          {rows.length === 0 ? (
            <p className="panel p-5 text-sm text-ink-500">{t.none}</p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-white">
              {rows.map((r) => (
                <li key={r.id} className="space-y-2 p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="font-semibold">{r.authorName}</span>
                    <span className="text-xs text-ink-500">{r.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    {r.status === "HIDDEN" && <span className="text-xs text-danger">{t.hidden}</span>}
                  </div>
                  <p className="whitespace-pre-line text-ink-700">{r.body}</p>
                  {r.sellerReply && (
                    <div className="rounded-md border-l-4 border-plate-400 bg-paper p-3">
                      <p className="text-xs font-semibold">{t.sellerReply}</p>
                      <p className="mt-1 whitespace-pre-line text-ink-700">{r.sellerReply}</p>
                    </div>
                  )}
                  {isOwner && r.status === "PUBLISHED" && <ReviewReply reviewId={r.id} initial={r.sellerReply} />}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
