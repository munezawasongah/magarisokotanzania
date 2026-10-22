import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiUser } from "@/lib/session";
import { json, jsonError } from "@/lib/json";
import { describeSearch, normaliseSearchQuery, saveSearch } from "@/server/alerts";
import { ListingError } from "@/server/errors";

/** GET — my saved searches. */
export async function GET() {
  const user = await apiUser();
  if (!user) return jsonError("Unauthorized", 401);
  return json(await prisma.savedSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }));
}

const schema = z.object({ query: z.string().max(2000), name: z.string().trim().max(80).optional(), alerts: z.boolean().default(true) });

/** POST { query, name?, alerts } — save the current car search (alerts on by default). */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return jsonError("Log in to save searches", 401);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid search", 422);
  try {
    const query = normaliseSearchQuery(parsed.data.query);
    const name = parsed.data.name || (await describeSearch(query));
    const s = await saveSearch(user, { name, query, alerts: parsed.data.alerts });
    return json(s, { status: 201 });
  } catch (e) {
    if (e instanceof ListingError) return jsonError(e.message, e.status);
    throw e;
  }
}
