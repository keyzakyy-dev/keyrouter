"use client";

import { cn } from "@/shared/utils/cn";

export default function Checkbox({ checked = false, onChange, size = "md", className }) {
  const sizes = {
    sm: "h-4 w-4",
    md: "h-[18px] w-[18px]",
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.preventDefault();
        if (onChange) onChange(!checked);
      }}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[5px] border transition-colors",
        sizes[size],
        checked
          ? "border-primary bg-primary text-white dark:border-primary dark:bg-primary dark:text-black"
          : "border-border bg-surface hover:border-text-subtle hover:bg-surface-2",
        className
      )}
    >
      {checked && (
        <span
          className="material-symbols-outlined leading-none font-bold"
          style={{ fontSize: size === "sm" ? 13 : 15 }}
        >
          check
        </span>
      )}
    </button>
  );
}
