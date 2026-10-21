import { requireUser } from "@/lib/session";
import { getDictionary } from "@/i18n/server";
import { listInquiriesForUser } from "@/server/inquiries";
import { serialize } from "@/lib/json";
import { LeadsInbox } from "@/components/dashboard/LeadsInbox";

export default async function LeadsPage() {
  const user = await requireUser("/dashboard/leads");
  const { dict } = await getDictionary();
  const leads = serialize(await listInquiriesForUser(user.id));
  return (
    <div className="space-y-5">
      <h1 className="display text-2xl">{dict.dash.leads}</h1>
      <LeadsInbox leads={leads} me={user.id} />
    </div>
  );
}
