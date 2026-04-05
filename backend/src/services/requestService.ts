import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { pubsub, EVENTS } from "../graphql/pubsub";

const PostRequestSchema = z.object({
  amount:           z.number().positive().max(10000),
  reason:           z.string().min(5).max(500),
  location:         z.string().min(2).max(200).optional(),
  expiresInMinutes: z.number().min(5).max(1440).optional(),
});

export async function getOpenRequests(prisma: PrismaClient, currentUserId: string) {
  const now = new Date();

  await prisma.cashRequest.updateMany({
    where: {
      status: "OPEN",
      expiresAt: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  return prisma.cashRequest.findMany({
    where: {
      status: "OPEN",
      requesterId: { not: currentUserId },
    },
    include: { requester: true, acceptor: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMyRequests(prisma: PrismaClient, userId: string) {
  return prisma.cashRequest.findMany({
    where: { requesterId: userId },
    include: { requester: true, acceptor: true, chatRoom: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function postRequest(
  prisma: PrismaClient,
  requesterId: string,
  input: { amount: number; reason: string; location?: string; expiresInMinutes?: number }
) {
  const data = PostRequestSchema.parse(input);

  const expiresAt = data.expiresInMinutes
    ? new Date(Date.now() + data.expiresInMinutes * 60 * 1000)
    : null;

  return prisma.cashRequest.create({
    data: {
      requesterId,
      amount:   data.amount,
      reason:   data.reason,
      location: data.location,
      expiresAt,
    },
    include: { requester: true, acceptor: true },
  });
}

export async function acceptRequest(
  prisma: PrismaClient,
  requestId: string,
  acceptorId: string
) {
  const existing = await prisma.cashRequest.findUnique({ where: { id: requestId } });
  if (!existing) throw new Error("Request not found.");
  if (existing.status !== "OPEN") throw new Error("Request is no longer available.");
  if (existing.requesterId === acceptorId) throw new Error("You cannot accept your own request.");

  if (existing.expiresAt && existing.expiresAt < new Date()) {
    await prisma.cashRequest.update({
      where: { id: requestId },
      data: { status: "EXPIRED" },
    });
    throw new Error("This request has expired.");
  }

  const [updated] = await prisma.$transaction([
    prisma.cashRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED", acceptorId },
      include: { requester: true, acceptor: true },
    }),
    prisma.chatRoom.create({ data: { requestId } }),
  ]);

  pubsub.publish(EVENTS.REQUEST_STATUS_CHANGED, { requestStatusChanged: updated });
  return updated;
}

export async function completeRequest(
  prisma: PrismaClient,
  requestId: string,
  userId: string
) {
  const existing = await prisma.cashRequest.findUnique({ where: { id: requestId } });
  if (!existing) throw new Error("Request not found.");
  if (existing.status !== "ACCEPTED") throw new Error("Only accepted requests can be completed.");
  if (existing.requesterId !== userId && existing.acceptorId !== userId) {
    throw new Error("Unauthorized.");
  }

  const updated = await prisma.cashRequest.update({
    where: { id: requestId },
    data: { status: "COMPLETED" },
    include: { requester: true, acceptor: true },
  });

  pubsub.publish(EVENTS.REQUEST_STATUS_CHANGED, { requestStatusChanged: updated });
  return updated;
}

export async function cancelRequest(
  prisma: PrismaClient,
  requestId: string,
  userId: string
) {
  const existing = await prisma.cashRequest.findUnique({ where: { id: requestId } });
  if (!existing) throw new Error("Request not found.");
  if (existing.requesterId !== userId) throw new Error("Only the requester can cancel.");
  if (!["OPEN", "ACCEPTED"].includes(existing.status)) {
    throw new Error("This request cannot be cancelled.");
  }

  const updated = await prisma.cashRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
    include: { requester: true, acceptor: true },
  });

  pubsub.publish(EVENTS.REQUEST_STATUS_CHANGED, { requestStatusChanged: updated });
  return updated;
}