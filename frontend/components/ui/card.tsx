import React from "react";

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Skip inner padding — use for cards that contain tables (needs overflow-hidden) */
  noPadding?: boolean;
  /** Green-tinted accent border */
  accent?: "green";
}

export function Card({
  children,
  className = "",
  noPadding = false,
  accent,
}: CardProps) {
  const accentClass =
    accent === "green" ? "border-green-200 bg-green-50" : "border-gray-200 bg-white";
  const paddingClass = noPadding ? "" : "p-5";

  return (
    <div
      className={`rounded-xl border ${accentClass} ${paddingClass} ${className}`}
    >
      {children}
    </div>
  );
}
