import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { verifyBusinessAction } from "@/server/actions/admin";
import { Badge } from "@/components/ui/Badge";
import { formatTzPhone } from "@/lib/phone";

export default async function VerificationPage() {
  const list = await prisma.business.findMany({
    where: { verification: { in: ["PENDING", "UNVERIFIED"] } },
    include: { region: true, members: { where: { role: "OWNER" }, include: { user: { select: { name: true, phone: true } } } } },
    orderBy: [{ verification: "asc" }, { createdAt: "asc" }],
    take: 100,
  });
  return (
    <div className="space-y-5">
      <h1 className="display text-2xl">Business verification</h1>
      <p className="text-sm text-ink-500">Check the TIN on the TRA portal and the registration on BRELA ORS before approving. Verified businesses publish without review.</p>
      <ul className="space-y-3">
        {list.map((b) => (
          <li key={b.id} className="panel flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm">
              <p className="flex items-center gap-2"><Link href={`/shop/${b.slug}`} className="font-semibold hover:underline">{b.name}</Link><Badge tone={b.verification === "PENDING" ? "plate" : "muted"}>{b.verification}</Badge></p>
              <p className="text-ink-500">{b.type} · {b.region.name} · {formatTzPhone(b.phone)}</p>
              <p className="text-xs">TIN: <code>{b.tin ?? "—"}</code> · BRELA: <code>{b.brelaRegNo ?? "—"}</code> · Owner: {b.members[0]?.user.name ?? "—"}</p>
            </div>
            <div className="flex gap-2">
              <form action={verifyBusinessAction}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="decision" value="VERIFIED" /><button className="btn bg-go-600 text-white hover:bg-go-700">Verify</button></form>
              <form action={verifyBusinessAction} className="flex gap-2"><input type="hidden" name="id" value={b.id} /><input type="hidden" name="decision" value="REJECTED" /><input name="note" className="field py-2 text-xs" placeholder="Reason" /><button className="btn-danger">Reject</button></form>
            </div>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="panel p-8 text-center text-sm text-ink-500">No businesses waiting.</p>}
    </div>
  );
}
