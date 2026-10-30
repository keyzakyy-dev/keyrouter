"use client";

import { cn } from "@/shared/utils/cn";

export default function SegmentedControl({
  options = [],
  value,
  onChange,
  size = "md",
  className,
  wrap = false,
}) {
  const sizes = {
    sm: "h-7 text-xs px-3",
    md: "h-9 text-sm",
    lg: "h-11 text-base",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-surface-2 p-1",
        wrap ? "flex-wrap" : "overflow-x-auto",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "shrink-0 inline-flex items-center justify-center gap-1.5 rounded-full px-4 font-display font-medium transition-all",
            sizes[size],
            value === option.value
              ? "bg-surface text-text-main shadow-[var(--shadow-soft)]"
              : "text-text-muted hover:text-text-main"
          )}
        >
          {option.icon && (
            <span className="material-symbols-outlined text-[16px]">{option.icon}</span>
          )}
          {option.label}
        </button>
      ))}
    </div>
  );
}
