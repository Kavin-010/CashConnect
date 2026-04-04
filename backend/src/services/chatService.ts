import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { pubsub, EVENTS } from "../graphql/pubsub";

const SendMessageSchema = z.object({
  roomId: z.string().uuid(),
  content: z.string().min(1).max(2000),
});

export async function getChatRoom(prisma: PrismaClient, requestId: string, userId: string) {
  const room = await prisma.chatRoom.findUnique({
    where: { requestId },
    include: {
      request: { include: { requester: true, acceptor: true } },
      messages: { include: { sender: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!room) throw new Error("Chat room not found.");
  const { requester, acceptor } = room.request;
  if (requester.id !== userId && acceptor?.id !== userId) throw new Error("You are not a participant.");
  return room;
}

export async function getMessages(prisma: PrismaClient, roomId: string, userId: string) {
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: { request: { include: { requester: true, acceptor: true } } },
  });

  if (!room) throw new Error("Chat room not found.");
  const { requester, acceptor } = room.request;
  if (requester.id !== userId && acceptor?.id !== userId) throw new Error("Unauthorized.");

  return prisma.message.findMany({
    where: { roomId },
    include: { sender: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function sendMessage(prisma: PrismaClient, senderId: string, input: { roomId: string; content: string }) {
  const data = SendMessageSchema.parse(input);

  const room = await prisma.chatRoom.findUnique({
    where: { id: data.roomId },
    include: { request: { include: { requester: true, acceptor: true } } },
  });

  if (!room) throw new Error("Chat room not found.");
  const { requester, acceptor } = room.request;
  if (requester.id !== senderId && acceptor?.id !== senderId) throw new Error("You are not a participant.");

  const message = await prisma.message.create({
    data: { content: data.content, senderId, roomId: data.roomId },
    include: { sender: true },
  });

  pubsub.publish(EVENTS.MESSAGE_SENT, { messageSent: message });
  return message;
}