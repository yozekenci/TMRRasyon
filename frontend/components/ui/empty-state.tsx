import React from "react";

export interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
  /** When true (default), wraps in a white card with border */
  contained?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  action,
  contained = true,
}: EmptyStateProps) {
  const inner = (
    <div className="py-16 text-center">
      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-gray-400" />
      </div>
      <p className="text-gray-500 text-sm font-medium mb-4">{title}</p>
      {action && <div>{action}</div>}
    </div>
  );

  if (!contained) return inner;

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {inner}
    </div>
  );
}
