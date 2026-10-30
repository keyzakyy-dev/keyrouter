"use client";

import Dropdown from "@/shared/components/Dropdown";
import { cn } from "@/shared/utils/cn";

export default function Select({
  label,
  options = [],
  value,
  onChange,
  placeholder = "Select an option",
  error,
  hint,
  disabled = false,
  required = false,
  className,
  selectClassName,
  labelClassName,
  align,
  ...props
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className={cn("text-sm font-medium text-text-main", labelClassName)}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <Dropdown
        options={options}
        value={value}
        onChange={(v) => onChange && onChange({ target: { value: v } })}
        placeholder={placeholder}
        disabled={disabled}
        buttonClassName={cn(
          "min-h-[42px] rounded-[10px] px-3 py-2.5",
          error && "border-red-500/40 ring-1 ring-red-500 focus:ring-2 focus:ring-red-500/40",
          selectClassName
        )}
        align={align}
        {...props}
      />
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
