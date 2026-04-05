import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const RatingSchema = z.object({
  requestId: z.string().uuid(),
  stars:     z.number().min(1).max(5),
  comment:   z.string().max(300).optional(),
});

// ── Submit a rating ───────────────────────────────────────────────────────────
export async function submitRating(
  prisma: PrismaClient,
  raterId: string,
  input: { requestId: string; stars: number; comment?: string }
) {
  const data = RatingSchema.parse(input);

  // Fetch the request
  const request = await prisma.cashRequest.findUnique({
    where: { id: data.requestId },
    include: { requester: true, acceptor: true },
  });

  if (!request) throw new Error("Request not found.");
  if (request.status !== "COMPLETED") {
    throw new Error("You can only rate after a request is completed.");
  }

  // Only requester or acceptor can rate
  const isRequester = request.requesterId === raterId;
  const isAcceptor  = request.acceptorId  === raterId;

  if (!isRequester && !isAcceptor) {
    throw new Error("You are not a participant in this request.");
  }

  // Determine who is being rated
  // Requester rates the acceptor and vice versa
  const ratedId = isRequester ? request.acceptorId! : request.requesterId;

  // Check if already rated
  const existing = await prisma.rating.findUnique({
    where: { raterId_requestId: { raterId, requestId: data.requestId } },
  });

  if (existing) throw new Error("You have already rated this request.");

  // Create rating
  const rating = await prisma.rating.create({
    data: {
      raterId,
      ratedId,
      requestId: data.requestId,
      stars:     data.stars,
      comment:   data.comment,
    },
    include: {
      rater: true,
      rated: true,
    },
  });

  return rating;
}

// ── Get ratings for a user ────────────────────────────────────────────────────
export async function getUserRatings(prisma: PrismaClient, userId: string) {
  const ratings = await prisma.rating.findMany({
    where: { ratedId: userId },
    include: { rater: true, request: true },
    orderBy: { createdAt: "desc" },
  });

  const total   = ratings.length;
  const average = total > 0
    ? Math.round((ratings.reduce((sum, r) => sum + r.stars, 0) / total) * 10) / 10
    : 0;

  return { ratings, average, total };
}

// ── Check if current user has rated a specific request ────────────────────────
export async function getMyRatingForRequest(
  prisma: PrismaClient,
  raterId: string,
  requestId: string
) {
  return prisma.rating.findUnique({
    where: { raterId_requestId: { raterId, requestId } },
  });
}