"use client";

import { cn } from "@/shared/utils/cn";

export default function Input({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  hint,
  icon,
  trailingIcon,
  onTrailingClick,
  trailingAriaLabel,
  disabled = false,
  required = false,
  className,
  inputClassName,
  ...props
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-muted">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-muted">
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            "w-full py-2.5 px-3 text-sm text-text-main bg-surface rounded-[4px]",
            "border border-border placeholder:text-text-muted/70 placeholder:font-mono",
            "focus:outline-none focus:ring-1 focus:ring-text-subtle focus:border-text-subtle",
            "transition-all duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed",
            // iOS zoom fix
            "text-[16px] sm:text-sm",
            icon && "pl-10",
            trailingIcon && "pr-10",
            error && "ring-1 ring-red-500 focus:ring-1 focus:ring-red-500/40 border-red-500/40",
            inputClassName
          )}
          {...props}
        />
        {trailingIcon && (
          <button
            type="button"
            aria-label={trailingAriaLabel}
            onClick={onTrailingClick}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-text-main transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">{trailingIcon}</span>
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-text-muted">{hint}</p>
      )}
    </div>
  );
}
