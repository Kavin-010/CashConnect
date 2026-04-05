// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useSubscription } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { ME_QUERY, OPEN_REQUESTS_QUERY, MY_REQUESTS_QUERY, USER_RATINGS_QUERY } from "../graphql/queries";
import {
  POST_REQUEST_MUTATION,
  ACCEPT_REQUEST_MUTATION,
} from "../graphql/mutations";
import { REQUEST_STATUS_CHANGED_SUBSCRIPTION } from "../graphql/subscriptions";
import { clearToken } from "../lib/apolloClient";
import { StarDisplay } from "../components/StarRating";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function timeLeft(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  if (hrs > 0) return `Expires in ${hrs}h ${mins % 60}m`;
  return `Expires in ${mins}m`;
}

// ── Notification Banner ───────────────────────────────────────────────────────

function NotificationBanner({ notifications, onDismiss, onGoToChat }) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="bg-indigo-700 border border-indigo-500 text-white px-4 py-3 rounded-xl shadow-2xl flex flex-col gap-2"
        >
          <div className="flex justify-between items-start">
            <p className="font-semibold text-sm">Request Accepted! 🎉</p>
            <button
              onClick={() => onDismiss(n.id)}
              className="text-indigo-300 hover:text-white text-xl leading-none -mt-1"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-indigo-200">{n.message}</p>
          <button
            onClick={() => onGoToChat(n.requestId, n.id)}
            className="bg-white text-indigo-700 font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-100 self-start"
          >
            Open Chat →
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Request Subscriber ────────────────────────────────────────────────────────

function RequestSubscriber({ requestId, onStatusChange }) {
  useSubscription(REQUEST_STATUS_CHANGED_SUBSCRIPTION, {
    variables: { requestId },
    onData: ({ data }) => {
      if (data?.data?.requestStatusChanged) {
        onStatusChange(data.data.requestStatusChanged);
      }
    },
  });
  return null;
}

// ── Open Request Card with Rating ─────────────────────────────────────────────

function OpenRequestCard({ req, onAccept, acceptLoading }) {
  const { data: ratingData } = useQuery(USER_RATINGS_QUERY, {
    variables: { userId: req.requester.id },
  });

  const ratings = ratingData?.userRatings;

  return (
    <div className="bg-gray-800 p-4 rounded-xl flex justify-between items-start">
      <div className="flex-1">
        <p className="font-semibold">₹{req.amount}</p>
        <p className="text-sm text-gray-400 mt-0.5">{req.reason}</p>

        {/* Location */}
        {req.location && (
          <p className="text-xs text-indigo-300 mt-1">
            📍 {req.location}
          </p>
        )}

        {/* Requester info + rating */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className="text-xs text-gray-500">
            By {req.requester.name} ({req.requester.rollNumber})
            {req.requester.department && ` · ${req.requester.department}`}
          </p>
        </div>

        {/* Star rating of requester */}
        {ratings && (
          <div className="mt-1">
            <StarDisplay
              average={ratings.average}
              total={ratings.total}
              size="sm"
            />
          </div>
        )}

        <p className="text-xs text-gray-500 mt-1">
          Posted: {formatDate(req.createdAt)}
        </p>

        {/* Expiry */}
        {req.expiresAt && (
          <p className="text-xs text-yellow-400 mt-1">
            {timeLeft(req.expiresAt)}
          </p>
        )}
      </div>

      <button
        onClick={() => onAccept(req.id)}
        disabled={acceptLoading}
        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded disabled:opacity-50 ml-4 mt-1 text-sm"
      >
        Accept
      </button>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

function Dashboard() {
  const navigate = useNavigate();

  const { data: meData } = useQuery(ME_QUERY);
  const currentUser = meData?.me;

  const [notifications, setNotifications] = useState([]);

  const { data: myData, refetch: refetchMy } = useQuery(MY_REQUESTS_QUERY, {
    fetchPolicy: "network-only",
  });

  const myActiveRequests = (myData?.myRequests ?? []).filter(
    (r) => r.status === "OPEN" || r.status === "ACCEPTED"
  );

  const handleStatusChange = (updatedRequest) => {
    if (updatedRequest.status === "ACCEPTED" && updatedRequest.acceptor) {
      setNotifications((prev) => [
        ...prev,
        {
          id: `${updatedRequest.id}-${Date.now()}`,
          message: `${updatedRequest.acceptor.name} (${updatedRequest.acceptor.rollNumber}) accepted your ₹${updatedRequest.amount} request for "${updatedRequest.reason}"`,
          requestId: updatedRequest.id,
        },
      ]);
      refetchMy();
    }
  };

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const goToChat = (requestId, notifId) => {
    dismissNotification(notifId);
    navigate(`/chat/${requestId}`);
  };

  const {
    data: openData,
    loading: openLoading,
    error: openError,
    refetch: refetchOpen,
  } = useQuery(OPEN_REQUESTS_QUERY, { fetchPolicy: "network-only" });

  const [amount,     setAmount]     = useState("");
  const [reason,     setReason]     = useState("");
  const [location,   setLocation]   = useState("");
  const [expiryMins, setExpiryMins] = useState("60");

  const [postMutation, { loading: postLoading }] = useMutation(POST_REQUEST_MUTATION, {
    refetchQueries: [{ query: OPEN_REQUESTS_QUERY }, { query: MY_REQUESTS_QUERY }],
  });

  const handlePost = async () => {
    if (!amount || !reason || !location) {
      alert("Fill all fields including location");
      return;
    }
    try {
      await postMutation({
        variables: {
          input: {
            amount: Number(amount),
            reason,
            location,
            expiresInMinutes: Number(expiryMins),
          },
        },
      });
      setAmount("");
      setReason("");
      setLocation("");
      setExpiryMins("60");
    } catch (err) {
      alert(err.message ?? "Failed to post request");
    }
  };

  const [acceptMutation, { loading: acceptLoading }] = useMutation(
    ACCEPT_REQUEST_MUTATION,
    { refetchQueries: [{ query: OPEN_REQUESTS_QUERY }] }
  );

  const handleAccept = async (requestId) => {
    try {
      await acceptMutation({ variables: { requestId } });
      navigate(`/chat/${requestId}`);
    } catch (err) {
      alert(err.message ?? "Failed to accept");
    }
  };

  const logout = () => {
    clearToken();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">

      <NotificationBanner
        notifications={notifications}
        onDismiss={dismissNotification}
        onGoToChat={goToChat}
      />

      {myActiveRequests.map((req) => (
        <RequestSubscriber
          key={req.id}
          requestId={req.id}
          onStatusChange={handleStatusChange}
        />
      ))}

      {/* Header */}
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-2xl font-bold">CampusCash Dashboard 💸</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/profile")}
            className="text-sm text-gray-400 hover:text-white"
          >
            Profile
          </button>
          <button
            onClick={logout}
            className="text-sm text-gray-400 hover:text-white"
          >
            Logout
          </button>
        </div>
      </div>
      <p className="text-gray-400 mb-6">
        Logged in as:{" "}
        <span className="text-white font-medium">{currentUser?.name}</span>{" "}
        ({currentUser?.email})
      </p>

      {/* My Requests History Button */}
      <button
        onClick={() => navigate("/history")}
        className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-xl mb-6 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">📋</span>
          <div className="text-left">
            <p className="font-semibold text-sm">My Requests</p>
            <p className="text-gray-400 text-xs">
              View your active and past requests
              {myActiveRequests.length > 0 && (
                <span className="ml-2 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {myActiveRequests.length} active
                </span>
              )}
            </p>
          </div>
        </div>
        <span className="text-gray-400 text-lg">→</span>
      </button>

      {/* Post Request */}
      <div className="bg-gray-800 p-4 rounded-xl mb-6">
        <h2 className="mb-3 font-semibold">Post Cash Request</h2>

        <input
          type="number"
          placeholder="Amount (₹)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
        />
        <input
          type="text"
          placeholder="Reason (e.g. Need cash for canteen)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
        />
        <input
          type="text"
          placeholder="📍 Location (e.g. Canteen Block A, Main Library)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
        />

        <div className="flex items-center gap-3 mb-3">
          <label className="text-gray-400 text-sm whitespace-nowrap">Visible for:</label>
          <select
            value={expiryMins}
            onChange={(e) => setExpiryMins(e.target.value)}
            className="flex-1 p-2 rounded bg-gray-700 text-white"
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="120">2 hours</option>
            <option value="180">3 hours</option>
            <option value="360">6 hours</option>
            <option value="720">12 hours</option>
            <option value="1440">24 hours</option>
          </select>
        </div>

        <button
          onClick={handlePost}
          disabled={postLoading}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded disabled:opacity-50"
        >
          {postLoading ? "Posting..." : "Post Request"}
        </button>
      </div>

      {/* Active Requests from others */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Active Requests</h2>
          <button
            onClick={() => refetchOpen()}
            className="text-xs text-gray-400 hover:text-white"
          >
            ↻ Refresh
          </button>
        </div>

        {openError && <p className="text-red-400 mb-3">{openError.message}</p>}

        {openLoading && (openData?.openRequests ?? []).length === 0 ? (
          <p className="text-gray-400">Loading...</p>
        ) : (openData?.openRequests ?? []).length === 0 ? (
          <p className="text-gray-400">No open requests from others</p>
        ) : (
          <div className="space-y-3">
            {(openData?.openRequests ?? []).map((req) => (
              <OpenRequestCard
                key={req.id}
                req={req}
                onAccept={handleAccept}
                acceptLoading={acceptLoading}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default Dashboard;