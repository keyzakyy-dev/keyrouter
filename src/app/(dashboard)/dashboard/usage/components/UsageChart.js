"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Card from "@/shared/components/Card";
import { cn } from "@/shared/utils/cn";

const fmtTokens = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n || 0);
};

const fmtTokensFull = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => `$${(n || 0).toFixed(4)}`;
const fmtCostFull = (n) => `$${(n || 0).toFixed(2)}`;
const fmtRequests = (n) => String(n || 0);

const VIEW_MODES = [
  { value: "tokens", label: "Tokens" },
  { value: "requests", label: "Requests" },
  { value: "cost", label: "Cost" },
];

const VIEW_CONFIG = {
  tokens: { dataKey: "tokens", color: "#a3a3a3", gradId: "gradTokens", formatter: fmtTokens, formatterFull: fmtTokensFull, label: "Tokens" },
  requests: { dataKey: "requests", color: "#d4d4d8", gradId: "gradRequests", formatter: fmtRequests, formatterFull: fmtRequests, label: "Requests" },
  cost: { dataKey: "cost", color: "#71717a", gradId: "gradCost", formatter: fmtCost, formatterFull: fmtCostFull, label: "Cost" },
};

export default function UsageChart({ period = "7d", bare = false }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("tokens");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/usage/chart?period=${period}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to fetch chart data:", e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const cfg = VIEW_CONFIG[viewMode];

  const aggregate = useMemo(() => {
    if (!data.length) return { total: 0, peak: 0, avg: 0 };
    const values = data.map((d) => d[cfg.dataKey] || 0);
    const total = values.reduce((a, b) => a + b, 0);
    const peak = Math.max(...values);
    return { total, peak, avg: values.length ? Math.round(total / values.length) : 0 };
  }, [data, cfg]);

  const hasData = data.some((d) => (d[cfg.dataKey] || 0) > 0);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Header: title + view toggle */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-base font-semibold text-text-main">Traffic</span>
        <div
          className="grid w-full items-center gap-1 rounded-full bg-surface-2 p-1 sm:w-auto"
          style={{ gridTemplateColumns: `repeat(${VIEW_MODES.length}, minmax(0, 1fr))` }}
        >
          {VIEW_MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setViewMode(m.value)}
              className={cn(
                "px-3 py-1 rounded-full font-display text-sm font-medium transition-colors",
                viewMode === m.value
                  ? "bg-surface text-text-main shadow-[var(--shadow-soft)]"
                  : "text-text-muted hover:text-text-main"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      {!loading && hasData && (
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-2/50 p-2.5">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-wider text-text-subtle">Total {cfg.label}</div>
            <div className="truncate font-display text-sm font-bold text-text-main">{cfg.formatterFull(aggregate.total)}</div>
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-wider text-text-subtle">Peak</div>
            <div className="truncate font-display text-sm font-bold text-text-main">{cfg.formatter(aggregate.peak)}</div>
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-wider text-text-subtle">Per point</div>
            <div className="truncate font-display text-sm font-bold text-text-main">{cfg.formatter(aggregate.avg)}</div>
          </div>
        </div>
      )}

      {/* Chart / states */}
      {loading ? (
        <div className="h-48 flex items-center justify-center gap-2 text-text-muted text-sm">
          <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
          Loading…
        </div>
      ) : !hasData ? (
        <div className="h-48 flex flex-col items-center justify-center gap-1 text-text-muted">
          <span className="material-symbols-outlined text-[26px] text-text-subtle">monitoring</span>
          <span className="text-sm">No data for this period</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradTokens" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a3a3a3" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#a3a3a3" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradRequests" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d4d4d8" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#d4d4d8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#71717a" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "currentColor", fillOpacity: 0.5 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "currentColor", fillOpacity: 0.5 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={cfg.formatter}
              width={50}
            />
            <Tooltip
              cursor={{ stroke: cfg.color, strokeWidth: 1, strokeDasharray: "4 4" }}
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                fontSize: "12px",
                boxShadow: "var(--shadow-elevated)",
              }}
              labelStyle={{ color: "var(--color-text-muted)", marginBottom: 4 }}
              formatter={(value) => [cfg.formatterFull(value), cfg.label]}
            />
            <Area
              type="monotone"
              dataKey={cfg.dataKey}
              stroke={cfg.color}
              strokeWidth={2}
              fill={`url(#${cfg.gradId})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

UsageChart.propTypes = {
  period: PropTypes.string,
};
