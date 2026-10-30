"use client";

import PropTypes from "prop-types";
import { cn } from "@/shared/utils/cn";

const TONE = {
  ok: {
    pill: "bg-success/10 text-success border border-success/20",
    chip: "bg-success/10 text-success",
    dot: "bg-success",
  },
  busy: {
    pill: "bg-warning/10 text-warning border border-warning/20",
    chip: "bg-warning/10 text-warning",
    dot: "bg-warning animate-pulse",
  },
  off: {
    pill: "bg-surface-2 text-text-muted border border-border",
    chip: "bg-surface-2 text-text-muted",
    dot: "bg-text-subtle/40",
  },
  error: {
    pill: "bg-danger/10 text-danger border border-danger/20",
    chip: "bg-danger/10 text-danger",
    dot: "bg-danger",
  },
};

/** One remote route (tunnel / tailscale) with an instrument status and control area. */
export default function RouteRow({ icon, label, desc, tone = "off", toneLabel, children }) {
  const t = TONE[tone] || TONE.off;
  return (
    <div className="rounded-xl border border-border bg-surface p-4 transition-colors">
      <div className="flex items-start gap-3.5">
        <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl", t.chip)}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-display text-[15px] font-semibold text-text-main">{label}</span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                t.pill
              )}
            >
              <span className={cn("size-1.5 rounded-full", t.dot)} />
              {toneLabel}
            </span>
          </div>
          <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-text-muted">{desc}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

RouteRow.propTypes = {
  icon: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  desc: PropTypes.string.isRequired,
  tone: PropTypes.oneOf(["ok", "busy", "off", "error"]),
  toneLabel: PropTypes.string.isRequired,
  children: PropTypes.node,
};
