import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getMonetisation } from "@/lib/settings";
import { saveMonetisationAction } from "@/server/actions/admin";
import { formatTzs } from "@/lib/money";
import { SITE } from "@/config/site";

export const metadata = { title: "Pricing & fees" };

/** The owner switches from "everything free" to paid listings here, without a redeploy. */
export default async function AdminPricingPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const [m, listings, privateSellers, businesses] = await Promise.all([
    getMonetisation(),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.business.count({ where: { type: "PRIVATE_SELLER", isActive: true } }),
    prisma.business.count({ where: { type: { not: "PRIVATE_SELLER" }, isActive: true } }),
  ]);
  const num = (name: keyof typeof m, label: string, hint: string, step = "1") => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type="number" min="0" step={step} defaultValue={m[name] as number} className="field tabular-nums" />
      <p className="mt-1 text-xs text-ink-500">{hint}</p>
    </div>
  );
  return (
    <form action={saveMonetisationAction} className="max-w-3xl space-y-6">
      <header>
        <h1 className="display text-2xl">Pricing &amp; fees</h1>
        <p className="mt-1 text-sm text-ink-500">
          Today: {listings.toLocaleString()} live cars, {privateSellers.toLocaleString()} private sellers, {businesses.toLocaleString()} businesses.
          Keep listing free until buyers are coming in steadily; cars on the site matter more than fees early on.
          There is never a commission on sales. Featured / Bump prices and business plans are on the <Link href="/pricing" className="underline">public pricing page</Link>.
        </p>
      </header>
      {saved && <p className="rounded-md border border-go-600/40 bg-go-600/5 p-3 text-sm text-go-600" role="status">Saved. The pricing page and new listings use these settings now.</p>}

      <fieldset className="panel space-y-3 p-5">
        <legend className="px-1 font-semibold">Phase</legend>
        <label className="flex items-start gap-3">
          <input type="radio" name="phase" value="LAUNCH" defaultChecked={m.phase === "LAUNCH"} className="mt-1" />
          <span><span className="font-semibold">Launch: everything free.</span> <span className="text-sm text-ink-500">Every listing is free for private sellers and businesses. The homepage says “List your car free”.</span></span>
        </label>
        <label className="flex items-start gap-3">
          <input type="radio" name="phase" value="PAID" defaultChecked={m.phase === "PAID"} className="mt-1" />
          <span><span className="font-semibold">Paid listings.</span> <span className="text-sm text-ink-500">Private sellers get their first listings free, then pay per listing for {SITE.listingLifetimeDays} days. Businesses without a monthly plan get a small free allowance. Listings made during launch stay free, including renewals.</span></span>
        </label>
      </fieldset>

      <fieldset className="panel grid gap-4 p-5 sm:grid-cols-2">
        <legend className="px-1 font-semibold">Private sellers (used in the paid phase)</legend>
        {num("freePrivateListings", "Free listings per seller", "Counted over the seller's whole history.")}
        {num("privateListingFee", `Fee per listing (${SITE.currency}) for ${SITE.listingLifetimeDays} days`, `Now ${formatTzs(m.privateListingFee)}. Renewing a paid listing costs the same. 0 switches the fee off.`, "500")}
      </fieldset>

      <fieldset className="panel grid gap-4 p-5 sm:grid-cols-2">
        <legend className="px-1 font-semibold">Businesses</legend>
        {num("businessFreeListings", "Live listings without a plan (paid phase)", "Dealers, yards and importers need a monthly plan for more. During launch there is no limit.")}
        {num("registrationFee", `One-off sign-up fee (${SITE.currency})`, "0 = free sign-up, approved automatically. Above 0, you verify each payment under Registrations. Private sellers never pay it.", "1000")}
      </fieldset>

      <button className="btn-primary">Save pricing</button>
    </form>
  );
}
