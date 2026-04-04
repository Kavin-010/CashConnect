// @ts-nocheck
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { useChat } from "../hooks/useChat";
import { ME_QUERY } from "../graphql/queries";

function Chat() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { chatRoom, messages, sendMessage, bottomRef, loading, sendLoading, error } = useChat(requestId ?? "");
  const { data: meData } = useQuery(ME_QUERY);
  const myId = meData?.me?.id;
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput("");
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading chat...</p>
      </div>
    );
  }

  // ── Error or no chat room found ───────────────────────────────────────────
  if (error || !chatRoom) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-lg">
          {error ? error.message : "Chat room not found."}
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-xl"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // ── Chat UI ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col p-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-gray-400 hover:text-white text-sm"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-lg font-semibold">
            {chatRoom.request.requester.name} &amp; {chatRoom.request.acceptor?.name}
          </h1>
          <p className="text-gray-400 text-sm">
            ₹{chatRoom.request.amount} — {chatRoom.request.reason}
          </p>
        </div>
      </div>

      <div className="border-b border-gray-700 mb-4" />

      {/* Messages */}
      <div className="flex-1 bg-gray-800 p-4 rounded-xl overflow-y-auto mb-4 min-h-64 max-h-[60vh]">
        {messages.length === 0 ? (
          <p className="text-gray-400 text-center mt-8">
            No messages yet — say hello!
          </p>
        ) : (
          messages.map((msg: any) => {
            const isMe = msg.sender.id === myId;
            return (
              <div key={msg.id} className={`mb-3 flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-xl text-sm ${
                  isMe ? "bg-indigo-600 text-white" : "bg-gray-700 text-white"
                }`}>
                  {!isMe && (
                    <p className="text-xs text-gray-400 mb-1">{msg.sender.name}</p>
                  )}
                  <p>{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? "text-indigo-300" : "text-gray-500"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit", minute: "2-digit", hour12: true,
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="flex-1 p-3 rounded-xl bg-gray-700 text-white outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleSend}
          disabled={sendLoading || !input.trim()}
          className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded-xl disabled:opacity-50"
        >
          {sendLoading ? "..." : "Send"}
        </button>
      </div>

    </div>
  );
}

export default Chat;