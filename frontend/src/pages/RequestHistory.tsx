// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { MY_REQUESTS_QUERY, MY_RATING_FOR_REQUEST_QUERY } from "../graphql/queries";
import { COMPLETE_REQUEST_MUTATION, CANCEL_REQUEST_MUTATION } from "../graphql/mutations";
import RatingModal from "../components/RatingModal";
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

function statusBadge(status) {
  const map = {
    OPEN:      "bg-green-700 text-green-200",
    ACCEPTED:  "bg-blue-700 text-blue-200",
    COMPLETED: "bg-gray-600 text-gray-200",
    CANCELLED: "bg-red-800 text-red-200",
    EXPIRED:   "bg-yellow-800 text-yellow-200",
  };
  return map[status] ?? "bg-gray-700 text-gray-300";
}

// ── Main Component ────────────────────────────────────────────────────────────

function RequestHistory() {
  const navigate = useNavigate();

  // Rating modal state
  const [ratingModal, setRatingModal] = useState(null);
  // { requestId, ratedUser }

  const { data, loading, error, refetch } = useQuery(MY_REQUESTS_QUERY, {
    fetchPolicy: "network-only",
  });

  const [completeMutation] = useMutation(COMPLETE_REQUEST_MUTATION, {
    refetchQueries: [{ query: MY_REQUESTS_QUERY }],
  });

  const [cancelMutation] = useMutation(CANCEL_REQUEST_MUTATION, {
    refetchQueries: [{ query: MY_REQUESTS_QUERY }],
  });

  const handleComplete = async (req) => {
    if (!confirm("Mark this request as completed?")) return;
    try {
      await completeMutation({ variables: { requestId: req.id } });
      // After completing, prompt to rate the acceptor
      if (req.acceptor) {
        setTimeout(() => {
          setRatingModal({
            requestId: req.id,
            ratedUser: req.acceptor.name,
          });
        }, 500);
      }
    } catch (err) {
      alert(err.message ?? "Failed to complete");
    }
  };

  const handleCancel = async (requestId) => {
    if (!confirm("Cancel this request?")) return;
    try {
      await cancelMutation({ variables: { requestId } });
    } catch (err) {
      alert(err.message ?? "Failed to cancel");
    }
  };

  const allRequests     = data?.myRequests ?? [];
  const activeRequests  = allRequests.filter(r => r.status === "OPEN" || r.status === "ACCEPTED");
  const historyRequests = allRequests.filter(r => !["OPEN", "ACCEPTED"].includes(r.status));

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">

      {/* Rating Modal */}
      {ratingModal && (
        <RatingModal
          requestId={ratingModal.requestId}
          ratedUser={ratingModal.ratedUser}
          onClose={() => setRatingModal(null)}
          onSuccess={() => refetch()}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-gray-400 hover:text-white text-sm"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold">My Requests</h1>
        <button
          onClick={() => refetch()}
          className="ml-auto text-xs text-gray-400 hover:text-white"
        >
          ↻ Refresh
        </button>
      </div>

      {error && <p className="text-red-400 mb-4">{error.message}</p>}

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : allRequests.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">No requests yet</p>
          <p className="text-gray-500 text-sm mt-1">
            Go to dashboard and post your first cash request
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-sm"
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        <>
          {/* ── Summary Stats ── */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total",     value: allRequests.length,                                       color: "text-white" },
              { label: "Completed", value: allRequests.filter(r => r.status === "COMPLETED").length, color: "text-green-400" },
              { label: "Cancelled", value: allRequests.filter(r => r.status === "CANCELLED").length, color: "text-red-400" },
              { label: "Expired",   value: allRequests.filter(r => r.status === "EXPIRED").length,   color: "text-yellow-400" },
            ].map((stat) => (
              <div key={stat.label} className="bg-gray-800 rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-gray-400 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* ── Active Requests ── */}
          {activeRequests.length > 0 && (
            <div className="mb-8">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <span className="text-green-400">Active</span>
                <span className="bg-green-700 text-green-200 text-xs px-2 py-0.5 rounded-full">
                  {activeRequests.length}
                </span>
              </h2>
              <div className="space-y-3">
                {activeRequests.map((req) => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    navigate={navigate}
                    onComplete={handleComplete}
                    onCancel={handleCancel}
                    onRate={(requestId, ratedUser) =>
                      setRatingModal({ requestId, ratedUser })
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Past Requests ── */}
          <div>
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-gray-400">Past Requests</span>
              <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full">
                {historyRequests.length}
              </span>
            </h2>

            {historyRequests.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-6 text-center">
                <p className="text-gray-400">No past requests yet</p>
                <p className="text-gray-500 text-sm mt-1">
                  Completed, cancelled and expired requests will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyRequests.map((req) => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    navigate={navigate}
                    onComplete={handleComplete}
                    onCancel={handleCancel}
                    onRate={(requestId, ratedUser) =>
                      setRatingModal({ requestId, ratedUser })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Request Card ──────────────────────────────────────────────────────────────

function RequestCard({ req, navigate, onComplete, onCancel, onRate }) {

  // Check if user has already rated this request
  const { data: ratingData } = useQuery(MY_RATING_FOR_REQUEST_QUERY, {
    variables: { requestId: req.id },
    skip: req.status !== "COMPLETED",
  });

  const alreadyRated = !!ratingData?.myRatingForRequest;

  return (
    <div className="bg-gray-800 p-4 rounded-xl">
      <div className="flex justify-between items-start">
        <div className="flex-1">

          {/* Amount + Status */}
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold">₹{req.amount}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(req.status)}`}>
              {req.status}
            </span>
          </div>

          {/* Reason */}
          <p className="text-sm text-gray-400">{req.reason}</p>

          {/* Location */}
          {req.location && (
            <p className="text-xs text-indigo-300 mt-1">
              📍 {req.location}
            </p>
          )}

          {/* Date */}
          <p className="text-xs text-gray-500 mt-1">
            Posted: {formatDate(req.createdAt)}
          </p>

          {/* Expiry */}
          {req.expiresAt && req.status === "OPEN" && (
            <p className="text-xs text-yellow-400 mt-1">
              {timeLeft(req.expiresAt)}
            </p>
          )}

          {/* Acceptor info */}
          {req.acceptor && (
            <p className="text-sm mt-1">
              <span className="text-gray-400">
                {req.status === "COMPLETED" ? "Completed with" : "Accepted by"}:{" "}
              </span>
              <span className="text-green-400 font-semibold">{req.acceptor.name}</span>
              <span className="text-gray-500"> ({req.acceptor.rollNumber})</span>
            </p>
          )}

          {/* Already rated badge */}
          {req.status === "COMPLETED" && alreadyRated && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-yellow-400 text-xs">★</span>
              <span className="text-gray-400 text-xs">
                You rated {ratingData.myRatingForRequest.stars}/5
                {ratingData.myRatingForRequest.comment && (
                  <> — "{ratingData.myRatingForRequest.comment}"</>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 ml-4">

          {/* Open Chat */}
          {req.status === "ACCEPTED" && req.chatRoom && (
            <button
              onClick={() => navigate(`/chat/${req.id}`)}
              className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-sm"
            >
              Open Chat
            </button>
          )}

          {/* Mark Done */}
          {req.status === "ACCEPTED" && (
            <button
              onClick={() => onComplete(req)}
              className="bg-green-700 hover:bg-green-600 px-3 py-1 rounded text-sm"
            >
              Mark Done ✓
            </button>
          )}

          {/* Rate button — show only if completed and not yet rated */}
          {req.status === "COMPLETED" && req.acceptor && !alreadyRated && (
            <button
              onClick={() => onRate(req.id, req.acceptor.name)}
              className="bg-yellow-600 hover:bg-yellow-500 px-3 py-1 rounded text-sm"
            >
              ★ Rate
            </button>
          )}

          {/* Cancel */}
          {["OPEN", "ACCEPTED"].includes(req.status) && (
            <button
              onClick={() => onCancel(req.id)}
              className="bg-red-800 hover:bg-red-700 px-3 py-1 rounded text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default RequestHistory;