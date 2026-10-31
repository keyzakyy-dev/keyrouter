"use client";

import PropTypes from "prop-types";
import Card from "@/shared/components/Card";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => `$${(n || 0).toFixed(2)}`;

const METRICS = [
  { label: "Total Requests", valueKey: "totalRequests", icon: "swap_vert" },
  { label: "Input Tokens", valueKey: "totalPromptTokens", icon: "upload" },
  { label: "Cached", valueKey: "totalCachedTokens", icon: "database" },
  { label: "Output Tokens", valueKey: "totalCompletionTokens", icon: "download" },
];

/** Overview: full-width cost banner + a uniform row of four metric cards. */
export default function OverviewCards({ stats }) {
  const cost = stats.totalCost || 0;

  return (
    <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
      {/* Cost banner */}
      <Card className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center justify-between gap-3 sm:flex-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-text-subtle">
            Est. Cost
          </span>
          <span className="material-symbols-outlined text-[22px] shrink-0 text-primary dark:text-primary sm:hidden">payments</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="font-display text-3xl font-bold tracking-tight text-text-main sm:text-4xl">
            {fmtCost(cost)}
          </div>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted sm:max-w-[160px] sm:text-right">
          Estimated, not actual billing
        </p>
      </Card>

      {/* Metric cards */}
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {METRICS.map((m) => (
          <Card key={m.valueKey} className="flex min-w-0 items-center justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{m.label}</div>
              <div className="mt-1 truncate font-display text-xl font-bold text-text-main" title={fmt(stats[m.valueKey])}>
                {fmt(stats[m.valueKey])}
              </div>
            </div>
            <span className="material-symbols-outlined text-[22px] shrink-0 text-primary dark:text-primary">{m.icon}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}

OverviewCards.propTypes = {
  stats: PropTypes.object.isRequired,
};
