import "server-only";
import { prisma } from "@/lib/prisma";
import type { InquiryInput } from "@/lib/validation";
import type { InquiryStatus } from "@/generated/prisma/enums";
import type { SessionUser } from "@/lib/session";
import { sendSms } from "@/lib/sms";
import { formatTzs } from "@/lib/money";
import { ListingError, recordListingEvent } from "./listings";
import { scoreInquiry } from "./fraud/engine";
import { getDeviceContext, recordDevice } from "@/lib/device";
import { Prisma } from "@/generated/prisma/client";

const MAX_PER_PHONE_PER_HOUR = 8;

export async function createInquiry(input: InquiryInput, ctx: { buyer?: SessionUser | null; ipHash?: string }) {
  if (input.website) throw new ListingError("Rejected", 400); // honeypot filled → bot

  const since = new Date(Date.now() - 3600_000);
  const recent = await prisma.inquiry.count({ where: { phone: input.phone, createdAt: { gte: since } } });
  if (recent >= MAX_PER_PHONE_PER_HOUR) throw new ListingError("Too many messages from this number. Try again later.", 429);

  // Resolve who receives the lead
  let recipientId: string;
  let businessId: string | undefined = input.businessId;
  let subject = "";
  if (input.listingId) {
    const l = await prisma.listing.findUnique({ where: { id: input.listingId }, select: { sellerId: true, businessId: true, status: true, title: true, contactPhone: true } });
    if (!l || l.status !== "ACTIVE") throw new ListingError("This listing is no longer available", 404);
    recipientId = l.sellerId;
    businessId = l.businessId ?? undefined;
    subject = l.title;
  } else if (input.partId) {
    const p = await prisma.sparePart.findUnique({ where: { id: input.partId }, select: { sellerId: true, businessId: true, status: true, title: true } });
    if (!p || p.status !== "ACTIVE") throw new ListingError("This part is no longer available", 404);
    recipientId = p.sellerId;
    businessId = p.businessId ?? undefined;
    subject = p.title;
  } else {
    const b = await prisma.business.findUnique({ where: { id: input.businessId! }, include: { members: { where: { role: "OWNER" }, take: 1 } } });
    if (!b || !b.members[0]) throw new ListingError("Business not found", 404);
    recipientId = b.members[0].userId;
    subject = b.name;
  }
  if (ctx.buyer?.id === recipientId) throw new ListingError("You cannot send an inquiry to yourself", 400);

  // ── fraud screening of the sender ──
  const device = await getDeviceContext();
  if (ctx.buyer) await recordDevice(ctx.buyer.id, device);
  const risk = await scoreInquiry({ phone: input.phone, email: input.email, message: input.message, buyerId: ctx.buyer?.id, deviceHash: device.deviceHash });
  const flagged = !risk.held && risk.level !== "LOW";
  const warning = flagged ? `⚠ Possible scam — ${risk.signals.map((x) => x.label).join("; ")}` : undefined;

  const inquiry = await prisma.inquiry.create({
    data: {
      type: input.type,
      listingId: input.listingId,
      partId: input.partId,
      businessId,
      recipientId,
      buyerId: ctx.buyer?.id,
      name: input.name,
      phone: input.phone,
      email: input.email,
      message: input.message,
      offerTzs: input.offerTzs !== undefined ? BigInt(input.offerTzs) : undefined,
      preferredDate: input.preferredDate,
      ipHash: ctx.ipHash,
      riskScore: risk.score,
      isHeld: risk.held,
      status: risk.held ? "SPAM" : undefined,
      sellerNote: warning,
      messages: { create: { body: input.message, senderId: ctx.buyer?.id } },
    },
    select: { id: true },
  });

  if (risk.signals.some((x) => x.points > 0)) {
    await prisma.fraudFlag.createMany({
      data: risk.signals.filter((x) => x.points > 0).map((x) => ({
        entity: "INQUIRY" as const, entityId: inquiry.id, userId: ctx.buyer?.id, signal: x.code, points: x.points,
        detail: { label: x.label, phone: input.phone, held: risk.held } as Prisma.InputJsonValue,
      })),
    });
  }
  // Held (scam) inquiries look successful to the sender but never reach the seller.
  if (risk.held) return inquiry;

  if (input.listingId) await recordListingEvent(input.listingId, "INQUIRY");

  // Notify the seller by SMS (non-blocking)
  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { phone: true } });
  if (recipient?.phone) {
    const offer = input.offerTzs ? ` Offer: ${formatTzs(input.offerTzs)}.` : "";
    void sendSms(recipient.phone, `${flagged ? "CAUTION - possible scam. " : ""}MagariSOKO Tanzania: New inquiry on "${subject.slice(0, 50)}" from ${input.name} (${input.phone}).${offer} Reply from your dashboard.`);
  }
  return inquiry;
}

export async function listInquiriesForUser(userId: string, status?: InquiryStatus) {
  return prisma.inquiry.findMany({
    where: { recipientId: userId, status, isHeld: false },
    include: {
      listing: { select: { title: true, slug: true, images: { take: 1, select: { url: true } } } },
      part: { select: { title: true, slug: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function updateInquiryStatus(user: SessionUser, id: string, status: InquiryStatus, sellerNote?: string) {
  const inq = await prisma.inquiry.findUnique({ where: { id }, select: { recipientId: true } });
  if (!inq || inq.recipientId !== user.id) throw new ListingError("Not found", 404);
  return prisma.inquiry.update({ where: { id }, data: { status, sellerNote }, select: { id: true, status: true } });
}

export async function replyToInquiry(user: SessionUser, id: string, body: string) {
  const inq = await prisma.inquiry.findUnique({ where: { id }, select: { recipientId: true, buyerId: true, phone: true, status: true } });
  if (!inq || (inq.recipientId !== user.id && inq.buyerId !== user.id)) throw new ListingError("Not found", 404);
  const msg = await prisma.inquiryMessage.create({ data: { inquiryId: id, senderId: user.id, body } });
  if (inq.recipientId === user.id) {
    if (inq.status === "NEW") await prisma.inquiry.update({ where: { id }, data: { status: "CONTACTED" } });
    void sendSms(inq.phone, `MagariSOKO Tanzania: The seller replied: "${body.slice(0, 120)}"`);
  }
  return msg;
}
