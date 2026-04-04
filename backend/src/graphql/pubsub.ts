import { PubSub } from "graphql-subscriptions";

export const pubsub = new PubSub();

export const EVENTS = {
  MESSAGE_SENT: "MESSAGE_SENT",
  REQUEST_STATUS_CHANGED: "REQUEST_STATUS_CHANGED",
} as const;