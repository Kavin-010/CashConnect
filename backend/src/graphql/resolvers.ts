import { withFilter } from "graphql-subscriptions";
import { requireAuth } from "../middleware/auth";
import { generateAndSendOtp, verifyOtp, resetPassword } from "../services/otpService";
import {
  getOpenRequests, getMyRequests, postRequest,
  acceptRequest, completeRequest, cancelRequest,
} from "../services/requestService";
import { getChatRoom, getMessages, sendMessage } from "../services/chatService";
import { EVENTS } from "./pubsub";
import type { PrismaClient } from "@prisma/client";
import type { PubSub } from "graphql-subscriptions";
import type { JwtPayload } from "../middleware/auth";
import { signup, login, updateProfile, changePassword } from "../services/authService";

interface Context {
  user: JwtPayload | null;
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
  },

  Mutation: {
    signup: async (_: unknown, { input }: { input: any }, ctx: Context) => signup(ctx.prisma, input),
    login: async (_: unknown, { input }: { input: any }, ctx: Context) => login(ctx.prisma, input),
    forgotPassword: async (_: unknown, { email }: { email: string }, ctx: Context) => generateAndSendOtp(ctx.prisma, email),
    verifyOtp: async (_: unknown, { email, code }: { email: string; code: string }, ctx: Context) => verifyOtp(ctx.prisma, email, code),
    resetPassword: async (_: unknown, { token, newPassword }: { token: string; newPassword: string }, ctx: Context) => resetPassword(ctx.prisma, token, newPassword),

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
    sendMessage: async (_: unknown, { input }: { input: any }, ctx: Context) => {
      const { userId } = requireAuth(ctx);
      return sendMessage(ctx.prisma, userId, input);
    },
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
        (payload: { requestStatusChanged: { id: string } }, variables: { requestId: string }) =>
          payload.requestStatusChanged.id === variables.requestId
      ),
    },
  },
};