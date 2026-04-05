// @ts-nocheck
import { useState } from "react";

// ── Display only (no interaction) ─────────────────────────────────────────────
export function StarDisplay({ average, total, size = "sm" }) {
  const fullStars  = Math.floor(average);
  const hasHalf    = average - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  const textSize   = size === "sm" ? "text-sm" : "text-xl";
  const starSize   = size === "sm" ? "text-base" : "text-2xl";

  if (total === 0) {
    return (
      <span className="text-gray-500 text-xs">No ratings yet</span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <div className={`flex ${starSize}`}>
        {"★".repeat(fullStars)}
        {hasHalf ? "½" : ""}
        <span className="text-gray-600">{"★".repeat(emptyStars)}</span>
      </div>
      <span className={`text-yellow-400 font-semibold ${textSize}`}>
        {average.toFixed(1)}
      </span>
      <span className="text-gray-500 text-xs">({total})</span>
    </div>
  );
}

// ── Interactive star picker ────────────────────────────────────────────────────
export function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-3xl transition-transform hover:scale-110 focus:outline-none"
        >
          <span className={
            star <= (hovered || value)
              ? "text-yellow-400"
              : "text-gray-600"
          }>
            ★
          </span>
        </button>
      ))}
    </div>
  );
}