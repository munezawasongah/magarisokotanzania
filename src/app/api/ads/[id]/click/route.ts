import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Counts the click, then redirects to the advertiser. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ad = await prisma.adPlacement.findUnique({ where: { id: (await params).id } });
  if (!ad) return NextResponse.redirect(new URL("/", req.url));
  await prisma.adPlacement.update({ where: { id: ad.id }, data: { clicks: { increment: 1 } } });
  return NextResponse.redirect(new URL(ad.linkUrl, req.url));
}
