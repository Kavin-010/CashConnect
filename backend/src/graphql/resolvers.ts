import { withFilter } from "graphql-subscriptions";
import { requireAuth } from "../middleware/auth";
import {
  signup, login, verifyEmail,
  resendVerificationOtp, updateProfile, changePassword,
} from "../services/authService";
import {
  generateAndSendOtp, verifyOtp, resetPassword,
} from "../services/otpService";
import {
  getOpenRequests, getMyRequests, postRequest,
  acceptRequest, completeRequest, cancelRequest,
} from "../services/requestService";
import { getChatRoom, getMessages, sendMessage } from "../services/chatService";
import { submitRating, getUserRatings, getMyRatingForRequest } from "../services/ratingService";
import { EVENTS } from "./pubsub";
import type { PrismaClient } from "@prisma/client";
import type { PubSub } from "graphql-subscriptions";
import type { JwtPayload } from "../middleware/auth";

interface Context {
  user:   JwtPayload | null;
  prisma: PrismaClient;
  pubsub: PubSub;
}

export const resolvers = {
  Query: {
    me: async (_: unknown, __: unknown, ctx: Context) => {
      const { userId } = requireAuth(ctx);
      return ctx.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    },
    openRequests: async (_: unknown, __: unknown, ctx: Context) => {
      const { userId } = requireAuth(ctx);
      return getOpenRequests(ctx.prisma, userId);
    },
    myRequests: async (_: unknown, __: unknown, ctx: Context) => {
      const { userId } = requireAuth(ctx);
      return getMyRequests(ctx.prisma, userId);
    },
    request: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      requireAuth(ctx);
      return ctx.prisma.cashRequest.findUnique({
        where: { id },
        include: { requester: true, acceptor: true, chatRoom: true },
      });
    },
    chatRoom: async (_: unknown, { requestId }: { requestId: string }, ctx: Context) => {
      const { userId } = requireAuth(ctx);
      return getChatRoom(ctx.prisma, requestId, userId);
    },
    messages: async (_: unknown, { roomId }: { roomId: string }, ctx: Context) => {
      const { userId } = requireAuth(ctx);
      return getMessages(ctx.prisma, roomId, userId);
    },
    userRatings: async (_: unknown, { userId }: { userId: string }, ctx: Context) => {
      requireAuth(ctx);
      return getUserRatings(ctx.prisma, userId);
    },
    myRatingForRequest: async (_: unknown, { requestId }: { requestId: string }, ctx: Context) => {
      const { userId } = requireAuth(ctx);
      return getMyRatingForRequest(ctx.prisma, userId, requestId);
    },
  },

  Mutation: {
    // ── Auth ────────────────────────────────────────────────────────────────
    signup: async (_: unknown, { input }: { input: any }, ctx: Context) => {
      const result = await signup(ctx.prisma, input);
      return {
        email:             result.user.email,
        needsVerification: false,       // ✅ always false now
        token:             result.token, // ✅ return token so frontend can login immediately
      };
    },
    verifyEmail: async (
      _: unknown,
      { email, code }: { email: string; code: string },
      ctx: Context
    ) => {
      return verifyEmail(ctx.prisma, email, code);
    },
    resendVerification: async (
      _: unknown,
      { email }: { email: string },
      ctx: Context
    ) => {
      return resendVerificationOtp(ctx.prisma, email);
    },
    login: async (_: unknown, { input }: { input: any }, ctx: Context) => {
      return login(ctx.prisma, input);
    },

    // ── Password reset ───────────────────────────────────────────────────────
    forgotPassword: async (_: unknown, { email }: { email: string }, ctx: Context) => {
      return generateAndSendOtp(ctx.prisma, email, "PASSWORD_RESET");
    },
    verifyOtp: async (
      _: unknown,
      { email, code }: { email: string; code: string },
      ctx: Context
    ) => {
      return verifyOtp(ctx.prisma, email, code);
    },
    resetPassword: async (
      _: unknown,
      { token, newPassword }: { token: string; newPassword: string },
      ctx: Context
    ) => {
      return resetPassword(ctx.prisma, token, newPassword);
    },

    // ── Profile ──────────────────────────────────────────────────────────────
    updateProfile: async (_: unknown, { input }: { input: any }, ctx: Context) => {
      const { userId } = requireAuth(ctx);
      return updateProfile(ctx.prisma, userId, input);
    },
    changePassword: async (
      _: unknown,
      { currentPassword, newPassword }: { currentPassword: string; newPassword: string },
      ctx: Context
    ) => {
      const { userId } = requireAuth(ctx);
      return changePassword(ctx.prisma, userId, currentPassword, newPassword);
    },

    // ── Requests ─────────────────────────────────────────────────────────────
    postRequest: async (_: unknown, { input }: { input: any }, ctx: Context) => {
      const { userId } = requireAuth(ctx);
      return postRequest(ctx.prisma, userId, input);
    },
    acceptRequest: async (_: unknown, { requestId }: { requestId: string }, ctx: Context) => {
      const { userId } = requireAuth(ctx);
      return acceptRequest(ctx.prisma, requestId, userId);
    },
    completeRequest: async (_: unknown, { requestId }: { requestId: string }, ctx: Context) => {
      const { userId } = requireAuth(ctx);
      return completeRequest(ctx.prisma, requestId, userId);
    },
    cancelRequest: async (_: unknown, { requestId }: { requestId: string }, ctx: Context) => {
      const { userId } = requireAuth(ctx);
      return cancelRequest(ctx.prisma, requestId, userId);
    },

    // ── Chat ─────────────────────────────────────────────────────────────────
    sendMessage: async (_: unknown, { input }: { input: any }, ctx: Context) => {
      const { userId } = requireAuth(ctx);
      return sendMessage(ctx.prisma, userId, input);
    },

    // ── Ratings ──────────────────────────────────────────────────────────────
    submitRating: async (_: unknown, { input }: { input: any }, ctx: Context) => {
      const { userId } = requireAuth(ctx);
      return submitRating(ctx.prisma, userId, input);
    },
  },

  Subscription: {
    messageSent: {
      subscribe: withFilter(
        (_: unknown, __: unknown, ctx: Context) => {
          requireAuth(ctx);
          return ctx.pubsub.asyncIterator([EVENTS.MESSAGE_SENT]);
        },
        (payload: { messageSent: { roomId: string } }, variables: { roomId: string }) =>
          payload.messageSent.roomId === variables.roomId
      ),
    },
    requestStatusChanged: {
      subscribe: withFilter(
        (_: unknown, __: unknown, ctx: Context) => {
          requireAuth(ctx);
          return ctx.pubsub.asyncIterator([EVENTS.REQUEST_STATUS_CHANGED]);
        },
        (
          payload: { requestStatusChanged: { id: string } },
          variables: { requestId: string }
        ) => payload.requestStatusChanged.id === variables.requestId
      ),
    },
  },
};