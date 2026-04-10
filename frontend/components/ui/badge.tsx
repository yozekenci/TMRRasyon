import React from "react";

export type BadgeVariant =
  | "green"
  | "blue"
  | "gray"
  | "amber"
  | "purple"
  | "sky"
  | "orange"
  | "pink";

const variantClasses: Record<BadgeVariant, string> = {
  green:  "bg-green-100 text-green-700",
  blue:   "bg-sky-100 text-sky-700",
  gray:   "bg-gray-100 text-gray-600",
  amber:  "bg-amber-100 text-amber-700",
  purple: "bg-purple-100 text-purple-700",
  sky:    "bg-sky-100 text-sky-700",
  orange: "bg-orange-100 text-orange-700",
  pink:   "bg-pink-100 text-pink-700",
};

export interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
