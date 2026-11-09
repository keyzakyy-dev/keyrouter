"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/shared/components/Card";
import Button from "@/shared/components/Button";
import Drawer from "@/shared/components/Drawer";
import Dropdown from "@/shared/components/Dropdown";
import Pagination from "@/shared/components/Pagination";
import { cn } from "@/shared/utils/cn";
import { AI_PROVIDERS, getProviderByAlias } from "@/shared/constants/providers";

let providerNameCache = null;
let providerNodesCache = null;

async function fetchProviderNames() {
  if (providerNameCache && providerNodesCache) {
    return { providerNameCache, providerNodesCache };
  }

  const nodesRes = await fetch("/api/provider-nodes");
  const nodesData = await nodesRes.json();
  const nodes = nodesData.nodes || [];
  providerNodesCache = {};

  for (const node of nodes) {
    providerNodesCache[node.id] = node.name;
  }

  providerNameCache = {
    ...AI_PROVIDERS,
    ...providerNodesCache
  };

  return { providerNameCache, providerNodesCache };
}

function getProviderName(providerId, cache) {
  if (!providerId) return providerId;
  if (!cache) return providerId;

  const cached = cache[providerId];

  if (typeof cached === 'string') {
    return cached;
  }

  if (cached?.name) {
    return cached.name;
  }

  const providerConfig = getProviderByAlias(providerId) || AI_PROVIDERS[providerId];
  return providerConfig?.name || providerId;
}

function getCachedTokens(tokens) {
  return tokens?.cached_tokens || tokens?.cache_read_input_tokens || 0;
}

function getCacheCreationTokens(tokens) {
  return tokens?.cache_creation_input_tokens || 0;
}

function getInputTokens(tokens) {
  const prompt = tokens?.prompt_tokens || tokens?.input_tokens || 0;
  // Canonical storage keeps prompt cache-inclusive. Legacy Claude rows may have
  // stored prompt cache-exclusive; fall back to cache when it's larger so old
  // rows don't under-report input.
  const cache = getCachedTokens(tokens);
  return prompt < cache ? cache : prompt;
}

function MetricTile({ label, value, hint, accent }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-lg border border-border-subtle bg-surface-2/60 px-3 py-2">
      <span className="text-[11px] text-text-subtle">{label}</span>
      <span
        className={cn(
          "truncate font-mono text-sm tabular-nums",
          accent === "danger" ? "text-danger" : accent === "success" ? "text-success" : accent === "primary" ? "text-primary" : "text-text-main"
        )}
        title={String(value)}
      >
        {value}
      </span>
      {hint && <span className="truncate font-mono text-[10px] text-text-subtle">{hint}</span>}
    </div>
  );
}

function isRedacted(value) {
  return value && typeof value === "object" && value.redacted === true;
}

function JsonBlock({ value, tone = "default", maxHeight = "max-h-[420px]" }) {
  const [copied, setCopied] = useState(false);
  const redacted = isRedacted(value);
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (insecure context) — leave the button inert
    }
  };

  const tones = {
    default: "border-border-subtle bg-surface-2 text-text-main",
    warn: "border-warning/40 bg-warning/10 text-warning",
    ok: "border-success/40 bg-success/10 text-text-main",
  };

  return (
    <div className="relative">
      {redacted ? (
        <div className="flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-2/50 p-3 text-xs text-text-muted sm:p-4">
          <span className="material-symbols-outlined shrink-0 text-[16px]">lock</span>
          <span>
            Conversation payload is redacted by the usage API — only metadata (tokens, latency) is kept.
          </span>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={copy}
            className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border border-border-subtle bg-surface/90 px-2 py-1 text-xs text-text-subtle transition-colors hover:text-text-main"
          >
            <span className="material-symbols-outlined text-[14px]">{copied ? "check" : "content_copy"}</span>
            {copied ? "Copied" : "Copy"}
          </button>
          <pre
            className={cn(
              "max-w-full overflow-auto rounded-lg border p-3 font-mono text-xs sm:p-4",
              maxHeight,
              tones[tone] || tones.default
            )}
          >
            {text}
          </pre>
        </>
      )}
    </div>
  );
}

function SectionTitle({ icon, children }) {
  return (
    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-text-subtle">
      {icon && <span className="material-symbols-outlined text-[14px]">{icon}</span>}
      {children}
    </h4>
  );
}

function DetailDrawerBody({ detail, providerName }) {
  const [activeTab, setActiveTab] = useState("request");
  const input = getInputTokens(detail.tokens);
  const cached = getCachedTokens(detail.tokens);
  const cacheWrite = getCacheCreationTokens(detail.tokens);
  const output = detail.tokens?.completion_tokens || 0;
  const isError = detail.status && detail.status !== "success";

  const tabs = [
    { value: "request", label: "Request", icon: "input", available: detail.request !== undefined },
    { value: "providerRequest", label: "Translated", icon: "translate", available: detail.providerRequest !== undefined },
    { value: "providerResponse", label: "Raw", icon: "data_object", available: detail.providerResponse !== undefined },
    { value: "response", label: "Response", icon: "output", available: detail.response !== undefined },
  ].filter((tab) => tab.available);
  const current = tabs.find((tab) => tab.value === activeTab) || tabs[0];

  const cacheHitRate = input > 0 && cached > 0 ? Math.round((cached / input) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Identity row */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
            isError ? "bg-danger/15 text-danger" : "bg-success/15 text-success"
          )}
        >
          <span className={cn("size-1.5 rounded-full", isError ? "bg-danger" : "bg-success")} />
          {detail.status || "unknown"}
        </span>
        <span className="truncate font-mono text-sm text-text-main" title={detail.model}>
          {detail.model}
        </span>
        <span className="text-text-subtle">·</span>
        <span className="truncate text-xs text-text-muted" title={providerName}>{providerName}</span>
        <span className="ml-auto whitespace-nowrap font-mono text-[10px] text-text-subtle tabular-nums">
          {new Date(detail.timestamp).toLocaleString()}
        </span>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricTile label="TTFT" value={`${detail.latency?.ttft || 0}ms`} />
        <MetricTile label="Total" value={`${detail.latency?.total || 0}ms`} accent={isError ? "danger" : undefined} />
        <MetricTile label="Input" value={input.toLocaleString()} hint={cacheHitRate ? `${cacheHitRate}% cached` : undefined} />
        <MetricTile label="Output" value={output.toLocaleString()} />
        <MetricTile label="Cached" value={cached > 0 ? cached.toLocaleString() : "–"} accent={cached > 0 ? "primary" : undefined} />
        <MetricTile label="Cache Write" value={cacheWrite > 0 ? cacheWrite.toLocaleString() : "–"} />
        <MetricTile
          label="Total Tokens"
          value={(input + output).toLocaleString()}
          hint={output > 0 ? `${(input / output).toFixed(1)}:1 in/out` : undefined}
        />
        <MetricTile label="Request ID" value={detail.id?.slice(0, 18) || "–"} hint="click row for full" />
      </div>

      {/* PXPIPE */}
      {detail.pxpipe && (
        <div className="rounded-lg border border-border-subtle p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">image</span>
            <span className="text-xs font-medium text-text-subtle">pxpipe</span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[11px] font-medium",
                detail.pxpipe.applied ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
              )}
            >
              {detail.pxpipe.applied ? "applied" : "skipped"}
            </span>
          </div>
          {detail.pxpipe.applied ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MetricTile label="Before" value={`${(detail.pxpipe.tokensBeforeEst || 0).toLocaleString()}`} hint="est. tokens" />
              <MetricTile label="After" value={`${(detail.pxpipe.tokensAfterEst || 0).toLocaleString()}`} hint="est. tokens" />
              <MetricTile label="Saved" value={`${detail.pxpipe.savedPct || 0}%`} accent="success" />
              <MetricTile label="Images" value={detail.pxpipe.imageCount || 0} hint={`${detail.pxpipe.durationMs || 0}ms`} />
            </div>
          ) : (
            <p className="text-xs text-text-muted">
              Reason: <span className="font-mono text-text-main">{detail.pxpipe.reason}</span>
              {detail.pxpipe.detail ? ` — ${detail.pxpipe.detail}` : ""}
            </p>
          )}
        </div>
      )}

      {/* Payload tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-border-subtle bg-surface-2/60 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              current?.value === tab.value
                ? "bg-surface text-text-main shadow-[var(--shadow-soft)]"
                : "text-text-muted hover:text-text-main"
            )}
          >
            <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[200px]">
        {current?.value === "request" && (
          <JsonBlock value={detail.request} maxHeight="max-h-[460px]" />
        )}

        {current?.value === "providerRequest" && (
          <JsonBlock value={detail.providerRequest} maxHeight="max-h-[460px]" />
        )}

        {current?.value === "providerResponse" && (
          <JsonBlock value={detail.providerResponse} maxHeight="max-h-[460px]" />
        )}

        {current?.value === "response" && (
          <div className="space-y-3">
            {isRedacted(detail.response) ? (
              <JsonBlock value={detail.response} />
            ) : (
              <>
                {detail.response?.thinking && (
                  <div>
                    <SectionTitle icon="psychology">Thinking process</SectionTitle>
                    <JsonBlock value={detail.response.thinking} tone="warn" maxHeight="max-h-[240px]" />
                  </div>
                )}
                <div>
                  <SectionTitle icon="chat">Content</SectionTitle>
                  <JsonBlock value={detail.response?.content || "[No content]"} maxHeight="max-h-[420px]" />
                </div>
              </>
            )}
          </div>
        )}

        {!current && (
          <p className="text-sm text-text-muted">No payload captured for this request.</p>
        )}
      </div>
    </div>
  );
}

export default function RequestDetailsTab() {
  const [details, setDetails] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [providers, setProviders] = useState([]);
  const [providerNameCache, setProviderNameCache] = useState(null);
  const [filters, setFilters] = useState({
    provider: "",
    startDate: "",
    endDate: ""
  });

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/usage/providers");
      const data = await res.json();
      setProviders(data.providers || []);

      const cache = await fetchProviderNames();
      setProviderNameCache(cache.providerNameCache);
    } catch (error) {
      console.error("Failed to fetch providers:", error);
    }
  }, []);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString()
      });
      if (filters.provider) params.append("provider", filters.provider);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await fetch(`/api/usage/request-details?${params}`);
      const data = await res.json();

      setDetails(data.details || []);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (error) {
      console.error("Failed to fetch request details:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filters]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleViewDetail = (detail) => {
    setSelectedDetail(detail);
    setIsDrawerOpen(true);
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newPageSize) => {
    setPagination(prev => ({ ...prev, pageSize: newPageSize, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({ provider: "", startDate: "", endDate: "" });
  };

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Card padding="none">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="rd-provider-filter" className="text-xs text-text-subtle">Provider</label>
            <Dropdown
              value={filters.provider}
              onChange={(v) => setFilters({ ...filters, provider: v })}
              options={[
                { value: "", label: "All Providers" },
                ...providers.map((provider) => ({ value: provider.id, label: provider.name })),
              ]}
              buttonClassName={cn(
                "h-9 px-3 rounded-lg",
                "text-sm text-text-main w-full min-w-0"
              )}
              className="w-full min-w-[180px]"
            />
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="start-date-filter" className="text-xs text-text-subtle">Start</label>
            <input
              id="start-date-filter"
              type="datetime-local"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className={cn(
                "h-9 px-3 rounded-lg border border-border bg-surface font-mono tabular-nums",
                "w-full min-w-0 text-xs text-text-main"
              )}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="end-date-filter" className="text-xs text-text-subtle">End</label>
            <input
              id="end-date-filter"
              type="datetime-local"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className={cn(
                "h-9 px-3 rounded-lg border border-border bg-surface font-mono tabular-nums",
                "w-full min-w-0 text-xs text-text-main"
              )}
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            disabled={!filters.provider && !filters.startDate && !filters.endDate}
            className="h-9"
          >
            <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
            Reset
          </Button>

          <span className="ml-auto self-end pb-2 text-xs text-text-subtle tabular-nums">
            {pagination.totalItems.toLocaleString()} request{pagination.totalItems === 1 ? "" : "s"}
          </span>
        </div>
      </Card>

      <Card padding="none">
        <div className="max-h-[calc(100vh-340px)] overflow-auto">
          <table className="w-full min-w-[920px] border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr>
                {[
                  { label: "Time", align: "left" },
                  { label: "Model", align: "left" },
                  { label: "Provider", align: "left" },
                  { label: "Input", align: "right" },
                  { label: "Cached", align: "right" },
                  { label: "Cache W", align: "right" },
                  { label: "Output", align: "right" },
                  { label: "Latency", align: "right" },
                  { label: "", align: "right" },
                ].map((col) => (
                  <th
                    key={col.label}
                    className={cn(
                      "whitespace-nowrap border-b border-border-subtle bg-surface-2 px-3 py-2.5 text-xs font-medium text-text-subtle",
                      col.align === "right" ? "text-right" : "text-left"
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="p-10 text-center text-text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : details.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-text-muted">
                      <span className="material-symbols-outlined text-[28px] text-text-subtle">receipt_long</span>
                      <span className="text-sm">No request details for this range</span>
                      <span className="text-xs text-text-subtle">
                        Widen the date filter or send traffic through the proxy
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                details.map((detail, index) => {
                  const isError = detail.status && detail.status !== "success";
                  return (
                    <tr
                      key={`${detail.id}-${index}`}
                      className="group cursor-pointer transition-colors hover:bg-surface-2/60"
                      onClick={() => handleViewDetail(detail)}
                    >
                      <td className="whitespace-nowrap border-b border-border-subtle/60 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              isError ? "bg-danger" : "bg-success"
                            )}
                            title={detail.status}
                          />
                          <span className="font-mono text-xs text-text-main tabular-nums">
                            {new Date(detail.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="max-w-[240px] border-b border-border-subtle/60 px-3 py-2.5">
                        <span className="block truncate font-mono text-xs text-text-main" title={detail.model}>
                          {detail.model}
                        </span>
                      </td>
                      <td className="max-w-[160px] border-b border-border-subtle/60 px-3 py-2.5">
                        <span className="block truncate text-xs text-text-muted" title={getProviderName(detail.provider, providerNameCache)}>
                          {getProviderName(detail.provider, providerNameCache)}
                        </span>
                      </td>
                      <td className="border-b border-border-subtle/60 px-3 py-2.5 text-right font-mono text-xs text-text-main tabular-nums">
                        {getInputTokens(detail.tokens).toLocaleString()}
                      </td>
                      <td className="border-b border-border-subtle/60 px-3 py-2.5 text-right font-mono text-xs tabular-nums">
                        <span className={getCachedTokens(detail.tokens) > 0 ? "text-primary" : "text-text-subtle"}>
                          {getCachedTokens(detail.tokens) > 0 ? getCachedTokens(detail.tokens).toLocaleString() : "–"}
                        </span>
                      </td>
                      <td className="border-b border-border-subtle/60 px-3 py-2.5 text-right font-mono text-xs tabular-nums">
                        <span className={getCacheCreationTokens(detail.tokens) > 0 ? "text-text-main" : "text-text-subtle"}>
                          {getCacheCreationTokens(detail.tokens) > 0 ? getCacheCreationTokens(detail.tokens).toLocaleString() : "–"}
                        </span>
                      </td>
                      <td className="border-b border-border-subtle/60 px-3 py-2.5 text-right font-mono text-xs text-text-main tabular-nums">
                        {detail.tokens?.completion_tokens?.toLocaleString() || 0}
                      </td>
                      <td className="border-b border-border-subtle/60 px-3 py-2.5 text-right font-mono text-xs tabular-nums">
                        <span className="text-text-subtle">{detail.latency?.ttft || 0}</span>
                        <span className="text-text-subtle">/</span>
                        <span className="text-text-main">{detail.latency?.total || 0}ms</span>
                      </td>
                      <td className="border-b border-border-subtle/60 px-3 py-2.5 text-right">
                        <span className="material-symbols-outlined text-[18px] text-text-subtle transition-colors group-hover:text-primary group-hover:translate-x-0.5">
                          chevron_right
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && details.length > 0 && (
          <div className="border-t border-border-subtle">
            <Pagination
              currentPage={pagination.page}
              pageSize={pagination.pageSize}
              totalItems={pagination.totalItems}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </Card>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Request Details"
        width="lg"
      >
        {selectedDetail && (
          <DetailDrawerBody
            key={selectedDetail.id}
            detail={selectedDetail}
            providerName={getProviderName(selectedDetail.provider, providerNameCache)}
          />
        )}
      </Drawer>
    </div>
  );
}
