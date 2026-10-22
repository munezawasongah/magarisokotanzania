import { apiUser } from "@/lib/session";
import { jsonError } from "@/lib/json";
import { getRevenueReport, PERIODS, type Period } from "@/server/revenue";

const csv = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** GET ?period=30d — every payment received in the period as a CSV file (opens in Excel). */
export async function GET(req: Request) {
  const user = await apiUser();
  if (!user?.roles.includes("ADMIN")) return jsonError("Forbidden", 403);
  const p = new URL(req.url).searchParams.get("period") ?? "30d";
  const period = (p in PERIODS ? p : "30d") as Period;
  const r = await getRevenueReport(period);
  const lines = [
    ["Date (EAT)", "From", "For", "Method", "Reference", "Amount TZS"].join(","),
    ...r.entries.map((e) => [e.at.toLocaleString("en-GB", { timeZone: "Africa/Dar_es_Salaam" }), e.who, e.purpose, e.method, e.reference, e.amountTzs].map(csv).join(",")),
    ["", "", "", "", "TOTAL", r.total].join(","),
  ];
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="magarisoko-revenue-${period}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
