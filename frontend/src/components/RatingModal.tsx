// @ts-nocheck
import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { SUBMIT_RATING_MUTATION } from "../graphql/mutations";
import { MY_REQUESTS_QUERY } from "../graphql/queries";
import { StarPicker } from "./StarRating";

function RatingModal({ requestId, ratedUser, onClose, onSuccess }) {
  const [stars,   setStars]   = useState(0);
  const [comment, setComment] = useState("");

  const [submitRating, { loading }] = useMutation(SUBMIT_RATING_MUTATION, {
    refetchQueries: [{ query: MY_REQUESTS_QUERY }],
  });

  const handleSubmit = async () => {
    if (stars === 0) { alert("Please select a star rating"); return; }
    try {
      await submitRating({
        variables: {
          input: {
            requestId,
            stars,
            comment: comment.trim() || undefined,
          },
        },
      });
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.message ?? "Failed to submit rating");
    }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Rate {ratedUser}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Stars */}
        <div className="flex flex-col items-center gap-3 mb-5">
          <p className="text-gray-400 text-sm">How was your experience?</p>
          <StarPicker value={stars} onChange={setStars} />
          <p className="text-yellow-400 text-sm font-medium h-5">
            {stars === 1 && "Poor"}
            {stars === 2 && "Fair"}
            {stars === 3 && "Good"}
            {stars === 4 && "Very Good"}
            {stars === 5 && "Excellent!"}
          </p>
        </div>

        {/* Comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Leave a comment (optional)"
          maxLength={300}
          rows={3}
          className="w-full p-3 rounded-lg bg-gray-700 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-4"
        />

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || stars === 0}
            className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Rating"}
          </button>
        </div>

      </div>
    </div>
  );
}

export default RatingModal;