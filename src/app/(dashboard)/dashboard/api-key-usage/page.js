"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/shared/components";

function formatNumber(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(v);
}

function formatCost(c) {
  const v = Number(c) || 0;
  if (v === 0) return "$0";
  if (v < 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(2)}`;
}

function formatDate(iso) {
  if (!iso) return "never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "never";
  return d.toLocaleString();
}

function relativeTime(iso) {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "never";
  if (ms < 60000) return "just now";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function KeyCard({ k, expanded, onToggle }) {
  const disabled = !k.isActive;
  const healthy = (k.errorRate || 0) <= 0.1;
  return (
    <Card className={disabled ? "opacity-60" : ""}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Identity block — accent stripe on hover targets */}
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-2/60">
            <span className="material-symbols-outlined text-[22px] text-primary">key_vertical</span>
            <span
              aria-hidden="true"
              className={`absolute -right-1 -top-1 size-3 rounded-full border-2 border-surface ${k.isActive ? "bg-success" : "bg-text-subtle"}`}
              title={k.isActive ? "active" : "off"}
            />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-semibold text-text-main">{k.name}</h3>
            <p className="mt-0.5 truncate font-mono text-[11px] tracking-wide text-text-muted">
              {k.keyMasked || "no key"}
              <span className="mx-1.5 text-border-subtle">·</span>
              <span className="text-text-subtle">last used {relativeTime(k.lastUsed)}</span>
            </p>
          </div>
        </div>

        {/* Metrics — 4 tiles, no dividers, right-aligned cluster */}
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg bg-surface-2/50 px-3.5 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-text-muted">Requests</p>
            <p className="mt-0.5 font-display text-lg font-bold leading-tight text-text-main">
              {formatNumber(k.requests)}
            </p>
          </div>
          <div className="rounded-lg bg-surface-2/50 px-3.5 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-text-muted">Tokens</p>
            <p className="mt-0.5 font-display text-lg font-bold leading-tight text-text-main">
              {formatNumber(k.totalTokens)}
            </p>
          </div>
          <div className="rounded-lg bg-surface-2/50 px-3.5 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-text-muted">Cost</p>
            <p className="mt-0.5 font-display text-lg font-bold leading-tight text-text-main">
              {formatCost(k.cost)}
            </p>
          </div>
          <div className={`rounded-lg px-3.5 py-2 ${healthy ? "bg-surface-2/50" : "bg-danger/10"}`}>
            <p className="text-[10px] uppercase tracking-[0.14em] text-text-muted">Errors</p>
            <p className={`mt-0.5 font-display text-lg font-bold leading-tight ${healthy ? "text-text-main" : "text-danger"}`}>
              {(k.errorRate * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Footer: meta + toggle on one line */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-2.5">
        <p className="text-[11px] text-text-subtle">
          {k.createdAt ? `created ${formatDate(k.createdAt)}` : "no creation date"}
        </p>
        {k.models?.length > 0 && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="flex cursor-pointer items-center gap-1 text-xs text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-[14px] transition-transform" style={{ transform: expanded ? "rotate(180deg)" : "" }}>
              expand_more
            </span>
            {expanded ? "Hide models" : `Top models (${k.models.length})`}
          </button>
        )}
      </div>

      {expanded && k.models?.length > 0 && (
        <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
          {k.models.map((m) => (
            <div key={m.model} className="flex items-center justify-between gap-3 rounded-md bg-surface-2/40 px-3 py-1.5 text-xs">
              <span className="truncate font-mono text-text-main">{m.model}</span>
              <span className="shrink-0 text-text-muted">
                {formatNumber(m.requests)} req · {formatNumber(m.tokens)} tok · {formatCost(m.cost)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function MyKeyUsage() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/usage/api-keys", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setKeys(data.keys || []);
      setError("");
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {error && (
        <Card className="border-danger/30 bg-danger/5">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}
      {loading ? (
        <Card className="h-24 animate-pulse bg-surface-2/40" />
      ) : keys.length > 0 && (
        <div className="flex flex-col gap-4">
          {keys.map((k) => (
            <KeyCard
              key={k.id}
              k={k}
              expanded={expandedId === k.id}
              onToggle={() => setExpandedId(expandedId === k.id ? null : k.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Direct visits land here only for admins; apikey sessions are redirected to
// /dashboard/usage by the guard. Same content, one menu entry.
export default function ApiKeyUsagePage() {
  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-text-main">API Key Usage</h1>
          <p className="mt-1 text-xs text-text-subtle">
            Quota and activity per generated key
          </p>
        </div>
      </div>
      <MyKeyUsage />
    </div>
  );
}
