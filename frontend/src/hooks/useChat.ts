import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { CHAT_ROOM_QUERY } from "../graphql/queries";
import { SEND_MESSAGE_MUTATION } from "../graphql/mutations";
import { MESSAGE_SENT_SUBSCRIPTION } from "../graphql/subscriptions";

export function useChat(requestId: string) {
  const { data, loading, error, subscribeToMore } = useQuery(CHAT_ROOM_QUERY, {
    variables: { requestId },
    skip: !requestId,
  });

  const roomId = data?.chatRoom?.id;

  useEffect(() => {
    if (!roomId) return;
    const unsub = subscribeToMore({
      document: MESSAGE_SENT_SUBSCRIPTION,
      variables: { roomId },
      updateQuery: (prev: any, { subscriptionData }: any) => {
        if (!subscriptionData.data) return prev;
        const newMsg = subscriptionData.data.messageSent;
        const exists = prev.chatRoom.messages.some((m: any) => m.id === newMsg.id);
        if (exists) return prev;
        return {
          chatRoom: {
            ...prev.chatRoom,
            messages: [...prev.chatRoom.messages, newMsg],
          },
        };
      },
    });
    return () => unsub();
  }, [roomId, subscribeToMore]);

  const [sendMutation, { loading: sendLoading }] = useMutation(SEND_MESSAGE_MUTATION);
  const sendMessage = async (content: string) => {
    if (!roomId || !content.trim()) return;
    await sendMutation({ variables: { input: { roomId, content: content.trim() } } });
  };

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.chatRoom?.messages]);

  return {
    chatRoom: data?.chatRoom,
    messages: data?.chatRoom?.messages ?? [],
    sendMessage,
    bottomRef,
    loading,
    sendLoading,
    error,
  };
}