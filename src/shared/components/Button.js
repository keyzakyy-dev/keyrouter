"use client";

import { cn } from "@/shared/utils/cn";

const variants = {
  primary:
    "bg-primary text-white hover:bg-primary-hover shadow-sm disabled:bg-surface-3 disabled:text-text-muted dark:bg-primary dark:text-black dark:hover:bg-primary-hover",
  secondary: "bg-surface-2 hover:bg-surface-3 text-text-main border border-border disabled:opacity-50",
  outline: "border border-border text-text-main hover:bg-surface-2 hover:border-text-subtle",
  ghost: "text-text-muted hover:bg-surface-2 hover:text-text-main",
  danger:
    "bg-red-600 hover:bg-red-700 text-white shadow-sm disabled:bg-surface-3 disabled:text-text-muted dark:bg-red-500 dark:hover:bg-red-400 dark:text-white",
  success:
    "bg-green-700 hover:bg-green-800 text-white shadow-sm disabled:bg-surface-3 disabled:text-text-muted dark:bg-green-500 dark:hover:bg-green-400 dark:text-white",
};

const sizes = {
  xs: "h-6 px-2.5 text-[11px] rounded-[4px] gap-1.5",
  sm: "h-7 px-3 text-xs rounded-[5px]",
  md: "h-9 px-4 text-sm rounded-md",
  lg: "h-11 px-6 text-sm rounded-md",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  disabled = false,
  loading = false,
  fullWidth = false,
  className,
  ...props
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 ease-out cursor-pointer",
        "active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className={cn("material-symbols-outlined animate-spin", size === "xs" ? "text-[14px]" : "text-[18px]")}>progress_activity</span>
      ) : icon ? (
        <span className={cn("material-symbols-outlined", size === "xs" ? "text-[14px]" : "text-[18px]")}>{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && (
        <span className={cn("material-symbols-outlined", size === "xs" ? "text-[14px]" : "text-[18px]")}>{iconRight}</span>
      )}
    </button>
  );
}
