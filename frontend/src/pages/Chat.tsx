// @ts-nocheck
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useSubscription } from "@apollo/client/react";
import { useChat } from "../hooks/useChat";
import { ME_QUERY } from "../graphql/queries";
import { REQUEST_STATUS_CHANGED_SUBSCRIPTION } from "../graphql/subscriptions";

function isLocationMessage(c) { return c.startsWith("📍LOCATION:"); }
function parseLocation(c) {
  const [lat, lng] = c.replace("📍LOCATION:", "").split(",");
  return { lat: parseFloat(lat), lng: parseFloat(lng) };
}

function MessageBubble({ msg, isMe }) {
  const isLoc = isLocationMessage(msg.content);
  const { lat, lng } = isLoc ? parseLocation(msg.content) : {};

  return (
    <div style={{ display:"flex", justifyContent:isMe?"flex-end":"flex-start", marginBottom:12 }}>
      <div style={{
        maxWidth:"72%",
        background: isMe ? "var(--accent)" : "var(--card2)",
        borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        padding:"12px 16px",
        border: isMe ? "none" : "1px solid var(--border)",
      }}>
        {!isMe && <p style={{ color:"var(--accent2)", fontSize:11, fontWeight:700, marginBottom:4, textTransform:"uppercase", letterSpacing:0.5 }}>{msg.sender.name}</p>}

        {isLoc ? (
          <>
            <p style={{ fontSize:12, fontWeight:700, marginBottom:8, color: isMe ? "#000" : "var(--white)" }}>
              📍 {isMe?"You shared your location":`${msg.sender.name}'s location`}
            </p>
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display:"block", background: isMe ? "rgba(0,0,0,0.2)" : "var(--accent)", color: isMe ? "#000" : "#000", textDecoration:"none", padding:"8px 14px", borderRadius:50, fontSize:12, fontWeight:700, textAlign:"center", letterSpacing:0.5 }}
            >
              VIEW ON MAPS →
            </a>
          </>
        ) : (
          <p style={{ color: isMe ? "#000" : "var(--white)", fontSize:14, lineHeight:1.5 }}>{msg.content}</p>
        )}

        <p style={{ color: isMe ? "rgba(0,0,0,0.5)" : "var(--muted2)", fontSize:10, marginTop:6, textAlign:"right" }}>
          {new Date(msg.createdAt).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true })}
        </p>
      </div>
    </div>
  );
}

export default function Chat() {
  const { requestId }     = useParams();
  const navigate          = useNavigate();
  const [input, setInput] = useState("");
  const [completed, setCompleted] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const { chatRoom, messages, sendMessage, bottomRef, loading, sendLoading, error } = useChat(requestId ?? "");
  const { data: meData } = useQuery(ME_QUERY);
  const myId = meData?.me?.id;

  // ── Listen for request completion so BOTH users see the closed state ───────
  // When requester clicks "Mark Done", backend publishes COMPLETED status.
  // This subscription catches it for the ACCEPTOR automatically.
  useSubscription(REQUEST_STATUS_CHANGED_SUBSCRIPTION, {
    variables: { requestId: requestId ?? "" },
    skip: !requestId,
    onData: ({ data }) => {
      const updated = data?.data?.requestStatusChanged;
      if (updated?.status === "COMPLETED" || updated?.status === "CANCELLED") {
        setCompleted(true);
      }
    },
  });

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput("");
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) { alert("Location not supported"); return; }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        await sendMessage(`📍LOCATION:${pos.coords.latitude},${pos.coords.longitude}`);
        setLocationLoading(false);
      },
      () => { setLocationLoading(false); alert("Location access denied. Enable it in browser settings."); },
      { enableHighAccuracy:true, timeout:10000 }
    );
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <p style={{ color:"var(--muted)" }}>Loading chat...</p>
    </div>
  );

  if (error || !chatRoom) return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, padding:24 }}>
      <p style={{ color:"var(--danger)", fontSize:16, textAlign:"center" }}>{error ? error.message : "Chat room not found"}</p>
      <button className="btn-accent" onClick={()=>navigate("/dashboard")} style={{ padding:"12px 24px", fontSize:13, fontWeight:700 }}>
        BACK TO DASHBOARD
      </button>
    </div>
  );

  // ── Request completed/cancelled banner ────────────────────────────────────
  if (completed) return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20, padding:24 }}>
      <div style={{ fontSize:60 }}>✅</div>
      <h2 style={{ fontFamily:"var(--font-head)", fontSize:32, letterSpacing:2, color:"var(--white)", textAlign:"center" }}>REQUEST COMPLETED</h2>
      <p style={{ color:"var(--muted)", fontSize:14, textAlign:"center", maxWidth:300 }}>
        This cash request has been marked as completed. The chat is now closed.
      </p>
      <button className="btn-accent" onClick={()=>navigate("/dashboard")} style={{ padding:"14px 32px", fontSize:14, fontWeight:700, letterSpacing:1 }}>
        BACK TO DASHBOARD
      </button>
      <button onClick={()=>navigate("/history")} style={{ background:"none", border:"none", color:"var(--muted)", fontSize:13, cursor:"pointer", fontFamily:"var(--font-body)" }}>
        View request history
      </button>
    </div>
  );

  return (
    <div style={{ height:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column", maxWidth:480, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:14, background:"var(--bg)", flexShrink:0 }}>
        <button onClick={()=>navigate("/dashboard")} style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:22, lineHeight:1 }}>←</button>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontFamily:"var(--font-head)", fontSize:18, letterSpacing:1, color:"var(--white)", lineHeight:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {chatRoom.request.requester.name} × {chatRoom.request.acceptor?.name}
          </p>
          <p style={{ color:"var(--muted)", fontSize:12, marginTop:2 }}>
            ₹{chatRoom.request.amount} · {chatRoom.request.reason}
          </p>
        </div>
        <button
          onClick={handleShareLocation}
          disabled={locationLoading||sendLoading}
          style={{ background:"var(--accentdim)", border:"1px solid var(--accent)", borderRadius:50, padding:"8px 14px", cursor:"pointer", color:"var(--accent)", fontSize:11, fontWeight:700, fontFamily:"var(--font-body)", whiteSpace:"nowrap", flexShrink:0 }}
        >
          {locationLoading?"...":"📍 SHARE"}
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"20px 20px 10px" }}>
        {messages.length===0 ? (
          <div style={{ textAlign:"center", padding:"60px 20px" }}>
            <p style={{ fontSize:36, marginBottom:8 }}>💬</p>
            <p style={{ color:"var(--muted)", fontSize:14 }}>No messages yet</p>
            <p style={{ color:"var(--muted2)", fontSize:12, marginTop:4 }}>Share your location to meet up!</p>
          </div>
        ) : (
          messages.map(msg => <MessageBubble key={msg.id} msg={msg} isMe={msg.sender.id===myId} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding:"12px 16px", borderTop:"1px solid var(--border)", display:"flex", gap:10, background:"var(--bg)", flexShrink:0 }}>
        <input
          className="inp"
          type="text"
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&handleSend()}
          placeholder="Type a message..."
          style={{ flex:1, borderRadius:50, padding:"12px 20px" }}
        />
        <button className="btn-accent" onClick={handleSend} disabled={sendLoading||!input.trim()} style={{ padding:"12px 20px", fontSize:13, fontWeight:700, borderRadius:50, flexShrink:0 }}>
          SEND
        </button>
      </div>
    </div>
  );
}