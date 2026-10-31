"use client";

import { useState, useMemo } from "react";
import PropTypes from "prop-types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import Card from "@/shared/components/Card";
import { cn } from "@/shared/utils/cn";

const COLORS = ["#a3a3a3", "#b4b4bb", "#c4c4cb", "#d4d4d8", "#71717a"];

const fmtTokens = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n || 0);
};

const fmtTokensFull = (n) => new Intl.NumberFormat().format(n || 0);
const fmtRequests = (n) => String(n || 0);

const truncate = (s, max = 22) => (s && s.length > max ? s.slice(0, max) + "…" : s || "");

export default function TopModelsChart({ byModel, bare = false }) {
  const [viewMode, setViewMode] = useState("tokens");

  const chartData = useMemo(() => {
    if (!byModel) return [];
    return Object.values(byModel)
      .map((data) => ({
        name: truncate(data.rawModel || "Unknown"),
        tokens: (data.promptTokens || 0) + (data.completionTokens || 0),
        requests: data.requests || 0,
      }))
      .filter((d) => d[viewMode] > 0)
      .sort((a, b) => b[viewMode] - a[viewMode])
      .slice(0, 5);
  }, [byModel, viewMode]);

  const fmt = viewMode === "tokens" ? fmtTokens : fmtRequests;
  const fmtFull = viewMode === "tokens" ? fmtTokensFull : fmtRequests;
  const label = viewMode === "tokens" ? "Tokens" : "Requests";

  const total = chartData.reduce((a, d) => a + (d[viewMode] || 0), 0);
  const top = chartData[0];

  const Wrapper = bare ? "div" : Card;
  const wrapClass = cn(
    "flex min-w-0 flex-col gap-4",
    bare ? "" : "p-3 sm:p-4"
  );

  return (
    <Wrapper className={wrapClass}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-base font-semibold text-text-main">Top Models</span>
        <div className="grid grid-cols-2 items-center gap-1 rounded-full bg-surface-2 p-1">
          {["tokens", "requests"].map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={cn(
                "px-2.5 py-0.5 rounded-full font-display text-xs font-medium transition-colors",
                viewMode === m
                  ? "bg-surface text-text-main shadow-[var(--shadow-soft)]"
                  : "text-text-muted hover:text-text-main"
              )}
            >
              {m === "tokens" ? "Tokens" : "Requests"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-2/50 p-2.5">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-wider text-text-subtle">Total {label}</div>
            <div className="truncate font-display text-sm font-bold text-text-main">{fmtFull(total)}</div>
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-wider text-text-subtle">Top model</div>
            <div className="truncate font-display text-sm font-bold text-text-main" title={top?.name}>
              {top?.name || "-"}
            </div>
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-wider text-text-subtle">Shown</div>
            <div className="truncate font-display text-sm font-bold text-text-main">{chartData.length}</div>
          </div>
        </div>
      )}

      {/* Chart / empty */}
      {!chartData.length ? (
        <div className="h-44 flex flex-col items-center justify-center gap-1 text-text-muted">
          <span className="material-symbols-outlined text-[26px] text-primary dark:text-primary">smart_toy</span>
          <span className="text-sm">No model usage yet</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 40, left: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "currentColor", fillOpacity: 0.5 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmt}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 10, fill: "currentColor", fillOpacity: 0.7 }}
              tickLine={false}
              axisLine={false}
              width={90}
            />
            <Tooltip
              cursor={{ fill: "var(--color-bg-subtle)", opacity: 0.6 }}
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                fontSize: "12px",
                boxShadow: "var(--shadow-elevated)",
              }}
              labelStyle={{ color: "var(--color-text-muted)", marginBottom: 4 }}
              formatter={(value) => [fmtFull(value), label]}
            />
            <Bar dataKey={viewMode} radius={[0, 4, 4, 0]}>
              {chartData.map((d, i) => (
                <Cell key={d.name} fill={COLORS[i % COLORS.length]} fillOpacity={0.88} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Wrapper>
  );
}

TopModelsChart.propTypes = {
  byModel: PropTypes.object,
};
