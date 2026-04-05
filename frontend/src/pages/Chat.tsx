// @ts-nocheck
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { useChat } from "../hooks/useChat";
import { ME_QUERY } from "../graphql/queries";

// ── Location message detector ─────────────────────────────────────────────────
function isLocationMessage(content) {
  return content.startsWith("📍LOCATION:");
}

function parseLocation(content) {
  const coords = content.replace("📍LOCATION:", "");
  const [lat, lng] = coords.split(",");
  return { lat: parseFloat(lat), lng: parseFloat(lng) };
}

function getMapsUrl(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMe }) {
  const isLocation = isLocationMessage(msg.content);

  return (
    <div className={`mb-3 flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-xs lg:max-w-md px-3 py-2 rounded-xl text-sm ${
          isMe ? "bg-indigo-600 text-white" : "bg-gray-700 text-white"
        }`}
      >
        {/* Sender name for received messages */}
        {!isMe && (
          <p className="text-xs text-gray-400 mb-1">{msg.sender.name}</p>
        )}

        {/* Location message */}
        {isLocation ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold">
              📍 {isMe ? "You shared your location" : `${msg.sender.name} shared their location`}
            </p>
            <a
              href={getMapsUrl(
                parseLocation(msg.content).lat,
                parseLocation(msg.content).lng
              )}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold text-center ${
                isMe
                  ? "bg-white text-indigo-700 hover:bg-indigo-100"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              View on Google Maps →
            </a>
          </div>
        ) : (
          // Regular text message
          <p>{msg.content}</p>
        )}

        {/* Timestamp */}
        <p
          className={`text-xs mt-1 ${
            isMe ? "text-indigo-300" : "text-gray-500"
          }`}
        >
          {new Date(msg.createdAt).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}
        </p>
      </div>
    </div>
  );
}

// ── Main Chat Component ───────────────────────────────────────────────────────

function Chat() {
  const { requestId }   = useParams();
  const navigate        = useNavigate();
  const [input, setInput] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);

  const {
    chatRoom,
    messages,
    sendMessage,
    bottomRef,
    loading,
    sendLoading,
    error,
  } = useChat(requestId ?? "");

  const { data: meData } = useQuery(ME_QUERY);
  const myId = meData?.me?.id;

  // ── Send text message ─────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput("");
  };

  // ── Share location ────────────────────────────────────────────────────────
  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      alert("Your browser does not support location sharing.");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Send as a special formatted message
        await sendMessage(`📍LOCATION:${latitude},${longitude}`);
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          alert(
            "Location access denied. Please allow location access in your browser settings and try again."
          );
        } else {
          alert("Could not get your location. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading chat...</p>
      </div>
    );
  }

  // ── Error / not found ─────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
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
        <div className="flex-1">
          <h1 className="text-lg font-semibold">
            {chatRoom.request.requester.name} &amp;{" "}
            {chatRoom.request.acceptor?.name}
          </h1>
          <p className="text-gray-400 text-sm">
            ₹{chatRoom.request.amount} — {chatRoom.request.reason}
          </p>
        </div>

        {/* Share Location button in header */}
        <button
          onClick={handleShareLocation}
          disabled={locationLoading || sendLoading}
          className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
        >
          {locationLoading ? (
            <>
              <span className="animate-spin">⏳</span>
              Getting location...
            </>
          ) : (
            <>
              📍 Share Location
            </>
          )}
        </button>
      </div>

      <div className="border-b border-gray-700 mb-4" />

      {/* Messages */}
      <div className="flex-1 bg-gray-800 p-4 rounded-xl overflow-y-auto mb-4 min-h-64 max-h-[60vh]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <p className="text-gray-400">No messages yet</p>
            <p className="text-gray-500 text-sm">
              Say hello! You can also share your location so the other person can find you.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMe={msg.sender.id === myId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
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
          className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded-xl disabled:opacity-50 font-medium"
        >
          {sendLoading ? "..." : "Send"}
        </button>
      </div>

      {/* Location hint */}
      <p className="text-gray-600 text-xs text-center mt-2">
        Use "Share Location" to help the other person find you on campus
      </p>

    </div>
  );
}

export default Chat;