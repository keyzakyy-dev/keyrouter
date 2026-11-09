"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PropTypes from "prop-types";
import {
  Card,
  CardSkeleton,
  Badge,
  Button,
  Modal,
  Toggle,
} from "@/shared/components";
import ProviderIcon from "@/shared/components/ProviderIcon";
import { getProviderIconSrc } from "@/shared/utils/providerIcon";
import { OAUTH_PROVIDERS, APIKEY_PROVIDERS } from "@/shared/constants/config";
import {
  FREE_PROVIDERS,
  FREE_TIER_PROVIDERS,
  WEB_COOKIE_PROVIDERS,
  OPENAI_COMPATIBLE_PREFIX,
  ANTHROPIC_COMPATIBLE_PREFIX,
} from "@/shared/constants/providers";
import Link from "next/link";
import { getErrorCode, getRelativeTime } from "@/shared/utils";
import { useNotificationStore } from "@/store/notificationStore";
import { useHeaderSearchStore } from "@/store/headerSearchStore";
import ModelAvailabilityBadge from "./components/ModelAvailabilityBadge";
import AddCompatibleModal from "./components/AddCompatibleModal";
import StatusFilterDropdown from "./components/StatusFilterDropdown";
import { STATUS_FILTER_OPTIONS, matchesStatusFilter } from "./utils";

function getConnectionErrorTag(connection) {
  if (!connection) return null;

  const explicitType = connection.lastErrorType;
  if (explicitType === "runtime_error") return "RUNTIME";
  if (
    explicitType === "upstream_auth_error" ||
    explicitType === "auth_missing" ||
    explicitType === "token_refresh_failed" ||
    explicitType === "token_expired"
  )
    return "AUTH";
  if (explicitType === "upstream_rate_limited") return "429";
  if (explicitType === "upstream_unavailable") return "5XX";
  if (explicitType === "network_error") return "NET";

  const numericCode = Number(connection.errorCode);
  if (Number.isFinite(numericCode) && numericCode >= 400)
    return String(numericCode);

  const fromMessage = getErrorCode(connection.lastError);
  if (fromMessage === "401" || fromMessage === "403") return "AUTH";
  if (fromMessage && fromMessage !== "ERR") return fromMessage;

  const msg = (connection.lastError || "").toLowerCase();
  if (
    msg.includes("runtime") ||
    msg.includes("not runnable") ||
    msg.includes("not installed")
  )
    return "RUNTIME";
  if (
    msg.includes("invalid api key") ||
    msg.includes("token invalid") ||
    msg.includes("revoked") ||
    msg.includes("unauthorized")
  )
    return "AUTH";

  return "ERR";
}

function getEffectiveConnStatus(conn) {
  const isCooldown = Object.entries(conn).some(
    ([k, v]) =>
      k.startsWith("modelLock_") && v && new Date(v).getTime() > Date.now(),
  );
  return conn.testStatus === "unavailable" && !isCooldown
    ? "active"
    : conn.testStatus;
}

const APIKEY_INITIAL_VISIBLE = 20;

export default function ProvidersPage() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <ProvidersContent />
    </Suspense>
  );
}

function ProvidersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const TAB_IDS = ["custom", "oauth", "free", "apikey"];
  const TAB_STORAGE_KEY = "providersActiveTab";

  const getInitialTab = () => {
    const t = searchParams.get("tab");
    if (t && TAB_IDS.includes(t)) return t;
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(TAB_STORAGE_KEY);
      if (saved && TAB_IDS.includes(saved)) return saved;
    }
    return "custom";
  };

  const activeTab = getInitialTab();

  const handleTabChange = (value) => {
    if (value === activeTab) return;
    const params = new URLSearchParams(searchParams);
    params.set("tab", value);
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, value);
    } catch {}
    router.push(`/dashboard/providers?${params.toString()}`, { scroll: false });
  };

  const [connections, setConnections] = useState([]);
  const [providerNodes, setProviderNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllApikey, setShowAllApikey] = useState(false);
  const [showAddCompatibleModal, setShowAddCompatibleModal] = useState(false);
  const [showAddAnthropicCompatibleModal, setShowAddAnthropicCompatibleModal] =
    useState(false);
  const [testingMode, setTestingMode] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const notify = useNotificationStore();
  const searchQuery = useHeaderSearchStore((s) => s.query);
  const registerSearch = useHeaderSearchStore((s) => s.register);
  const unregisterSearch = useHeaderSearchStore((s) => s.unregister);

  useEffect(() => {
    registerSearch("Search providers...");
    return () => unregisterSearch();
  }, [registerSearch, unregisterSearch]);

  const matchSearch = (name) => {
    if (!searchQuery.trim()) return true;
    if (!name) return false;
    return name.toLowerCase().includes(searchQuery.trim().toLowerCase());
  };

  const sortByPriority = (entries, authType) =>
    [...entries].sort(([ka, a], [kb, b]) => {
      const pa = a.priority ?? 999;
      const pb = b.priority ?? 999;
      if (pa !== pb) return pa - pb;
      const sa = getProviderStats(ka, authType);
      const sb = getProviderStats(kb, authType);
      const ca = sa.connected > 0 ? 1 : 0;
      const cb = sb.connected > 0 ? 1 : 0;
      if (ca !== cb) return cb - ca;
      return (a.name || "").localeCompare(b.name || "");
    });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [connectionsRes, nodesRes] = await Promise.all([
          fetch("/api/providers"),
          fetch("/api/provider-nodes"),
        ]);
        const connectionsData = await connectionsRes.json();
        const nodesData = await nodesRes.json();
        if (connectionsRes.ok)
          setConnections(connectionsData.connections || []);
        if (nodesRes.ok) setProviderNodes(nodesData.nodes || []);
      } catch (error) {
        console.log("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getProviderStats = (providerId, authType) => {
    const authTypes = Array.isArray(authType) ? authType : [authType];
    const providerConnections = connections.filter(
      (c) => c.provider === providerId && authTypes.includes(c.authType),
    );

    const connected = providerConnections.filter((c) => {
      const status = getEffectiveConnStatus(c);
      return status === "active" || status === "success";
    }).length;

    const errorConns = providerConnections.filter((c) => {
      const status = getEffectiveConnStatus(c);
      return (
        status === "error" || status === "expired" || status === "unavailable"
      );
    });

    const error = errorConns.length;
    const total = providerConnections.length;
    const allDisabled =
      total > 0 && providerConnections.every((c) => c.isActive === false);

    const latestError = errorConns.sort(
      (a, b) => new Date(b.lastErrorAt || 0) - new Date(a.lastErrorAt || 0),
    )[0];
    const errorCode = latestError ? getConnectionErrorTag(latestError) : null;
    const errorTime = latestError?.lastErrorAt
      ? getRelativeTime(latestError.lastErrorAt)
      : null;

    return { connected, error, total, errorCode, errorTime, allDisabled };
  };

  const matchStatus = (stats, isNoAuth) =>
    matchesStatusFilter(statusFilter, stats, isNoAuth);

  // Toggle all connections for a provider on/off. authType may be a single
  // string or an array (kiro counts oauth + api_key/apikey together).
  const handleToggleProvider = async (providerId, authType, newActive) => {
    const authTypes = Array.isArray(authType) ? authType : [authType];
    const matches = (c) =>
      c.provider === providerId && authTypes.includes(c.authType);
    const providerConns = connections.filter(matches);
    setConnections((prev) =>
      prev.map((c) => (matches(c) ? { ...c, isActive: newActive } : c)),
    );
    await Promise.allSettled(
      providerConns.map((c) =>
        fetch(`/api/providers/${c.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: newActive }),
        }),
      ),
    );
  };

  const handleBatchTest = async (mode, providerId = null) => {
    if (testingMode) return;
    setTestingMode(mode === "provider" ? providerId : mode);
    setTestResults(null);
    try {
      const res = await fetch("/api/providers/test-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, providerId }),
      });
      const data = await res.json();
      setTestResults(data);
      if (data.summary) {
        const { passed, failed, total } = data.summary;
        if (failed === 0) notify.success(`All ${total} tests passed`);
        else notify.warning(`${passed}/${total} passed, ${failed} failed`);
      }
    } catch (error) {
      setTestResults({ error: "Test request failed" });
      notify.error("Provider test failed");
    } finally {
      setTestingMode(null);
    }
  };

  const compatibleProviders = providerNodes
    .filter((node) => node.type === "openai-compatible")
    .map((node) => ({
      id: node.id,
      name: node.name || "OpenAI Compatible",
      color: "#10A37F",
      textIcon: "OC",
      apiType: node.apiType,
    }))
    .filter(
      (p) => matchSearch(p.name) && matchStatus(getProviderStats(p.id, "apikey")),
    );

  const anthropicCompatibleProviders = providerNodes
    .filter((node) => node.type === "anthropic-compatible")
    .map((node) => ({
      id: node.id,
      name: node.name || "Anthropic Compatible",
      color: "#D97757",
      textIcon: "AC",
    }))
    .filter(
      (p) => matchSearch(p.name) && matchStatus(getProviderStats(p.id, "apikey")),
    );

  // Dual-auth providers (oauth + apikey) store API keys as authType "apikey"
  // (and sometimes "api_key"). Card stats must count both so totals match detail.
  // kiro has no authModes in registry but accepts both (headless uses "api_key").
  const dualAuthTypes = (info, key) => {
    if (key === "kiro") return ["oauth", "apikey", "api_key"];
    const modes = info?.authModes;
    // Free-tier and API-key providers default to supporting apikey even when the
    // registry entry omits authModes (e.g. cloudflare-ai, byteplus, ollama,
    // vertex) — otherwise their apikey connections are invisible on the grid card.
    if (!Array.isArray(modes)) {
      return key in FREE_TIER_PROVIDERS || key in APIKEY_PROVIDERS
        ? ["oauth", "apikey", "api_key"]
        : "oauth";
    }
    if (!modes.includes("apikey")) return "oauth";
    return ["oauth", "apikey", "api_key"];
  };

  const oauthEntries = sortByPriority(
    Object.entries(OAUTH_PROVIDERS).filter(
      ([key, info]) =>
        !info.hidden &&
        matchSearch(info.name) &&
        matchStatus(getProviderStats(key, dualAuthTypes(info, key)), info.noAuth),
    ),
    "oauth",
  );
  const freeEntries = Object.entries(FREE_PROVIDERS)
    .filter(
      ([key, info]) =>
        !info.hidden &&
        matchSearch(info.name) &&
        matchStatus(getProviderStats(key, dualAuthTypes(info, key)), info.noAuth),
    )
    .sort(([, a], [, b]) => (b.noAuth ? 1 : 0) - (a.noAuth ? 1 : 0));
  // Free Tier cards may be oauth-only (e.g. kimchi) or dual-auth, so count via
  // dualAuthTypes per provider instead of a fixed "apikey" — otherwise oauth
  // connections are invisible here (mismatch with the detail page).
  const freeTierEntries = Object.entries(FREE_TIER_PROVIDERS)
    .filter(
      ([key, info]) =>
        !info.hidden &&
        matchSearch(info.name) &&
        (info.serviceKinds ?? ["llm"]).includes("llm") &&
        matchStatus(getProviderStats(key, dualAuthTypes(info, key)), info.noAuth),
    )
    .sort(([ka, a], [kb, b]) => {
      const pa = a.priority ?? 999;
      const pb = b.priority ?? 999;
      if (pa !== pb) return pa - pb;
      const noAuthDiff = (b.noAuth ? 1 : 0) - (a.noAuth ? 1 : 0);
      if (noAuthDiff !== 0) return noAuthDiff;
      const ca = getProviderStats(ka, dualAuthTypes(a, ka)).connected > 0 ? 0 : 1;
      const cb = getProviderStats(kb, dualAuthTypes(b, kb)).connected > 0 ? 0 : 1;
      if (ca !== cb) return ca - cb;
      return (a.name || "").localeCompare(b.name || "");
    });
  // API Key: connected providers first, then alphabetical by name
  const apikeyEntries = Object.entries(APIKEY_PROVIDERS)
    .filter(
      ([key, info]) =>
        !info.hidden &&
        (info.serviceKinds ?? ["llm"]).includes("llm") &&
        matchSearch(info.name) &&
        matchStatus(getProviderStats(key, "apikey"), info.noAuth),
    )
    .sort(([ka, a], [kb, b]) => {
      const ca = getProviderStats(ka, "apikey").total > 0 ? 0 : 1;
      const cb = getProviderStats(kb, "apikey").total > 0 ? 0 : 1;
      if (ca !== cb) return ca - cb;
      return (a.name || "").localeCompare(b.name || "");
    });
  const isApikeySearching = !!searchQuery.trim() || statusFilter !== "all";
  const visibleApikeyEntries =
    isApikeySearching || showAllApikey
      ? apikeyEntries
      : apikeyEntries.slice(0, APIKEY_INITIAL_VISIBLE);
  const hiddenApikeyCount = apikeyEntries.length - APIKEY_INITIAL_VISIBLE;

  // Web Cookie: providers authenticated by a pasted browser/session cookie
  // (connections are stored with authType "cookie" — see POST /api/providers).
  const webCookieEntries = Object.entries(WEB_COOKIE_PROVIDERS)
    .filter(
      ([key, info]) =>
        !info.hidden &&
        (info.serviceKinds ?? ["llm"]).includes("llm") &&
        matchSearch(info.name) &&
        matchStatus(getProviderStats(key, "cookie"), info.noAuth),
    )
    .sort(([ka, a], [kb, b]) => {
      const ca = getProviderStats(ka, "cookie").total > 0 ? 0 : 1;
      const cb = getProviderStats(kb, "cookie").total > 0 ? 0 : 1;
      if (ca !== cb) return ca - cb;
      return (a.name || "").localeCompare(b.name || "");
    });

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const hasAnyResult =
    oauthEntries.length > 0 ||
    freeEntries.length > 0 ||
    freeTierEntries.length > 0 ||
    apikeyEntries.length > 0 ||
    webCookieEntries.length > 0 ||
    compatibleProviders.length > 0 ||
    anthropicCompatibleProviders.length > 0;

  // ─── Summary metrics (from live connection data) ────────────────────────────
  const summary = {
    total: connections.length,
    connected: connections.filter((c) => {
      const s = getEffectiveConnStatus(c);
      return s === "active" || s === "success";
    }).length,
    errors: connections.filter((c) => {
      const s = getEffectiveConnStatus(c);
      return s === "error" || s === "expired" || s === "unavailable";
    }).length,
    activeProviders: new Set(
      connections.filter((c) => c.isActive !== false).map((c) => c.provider),
    ).size,
    uniqueProviders: new Set(connections.map((c) => c.provider)).size,
  };

  // Failing connections for the status strip: provider display name + error tag.
  const displayName = (p) =>
    OAUTH_PROVIDERS[p]?.name ||
    APIKEY_PROVIDERS[p]?.name ||
    FREE_PROVIDERS[p]?.name ||
    FREE_TIER_PROVIDERS[p]?.name ||
    WEB_COOKIE_PROVIDERS[p]?.name ||
    p;
  const errorProviders = connections
    .filter((c) => {
      const s = getEffectiveConnStatus(c);
      return s === "error" || s === "expired" || s === "unavailable";
    })
    .sort((a, b) => (b.lastErrorAt || 0) < (a.lastErrorAt || 0) ? -1 : 1)
    .slice(0, 8)
    .map((c) => ({
      provider: c.provider,
      label: displayName(c.provider),
      code: getConnectionErrorTag(c),
    }));

  const renderTestButton = (mode) => (
    <button
      onClick={() => handleBatchTest(mode)}
      disabled={!!testingMode}
      className={`flex w-full items-center justify-center gap-2 rounded-lg px-3.5 py-2 font-display text-sm font-medium transition-colors sm:w-auto ${
        testingMode === mode
          ? "bg-primary text-white dark:text-neutral-950 animate-pulse"
          : "border border-border bg-surface text-text-muted hover:border-text-subtle hover:text-text-main"
      }`}
      title={`Test all ${mode} connections`}
      aria-label={`Test all ${mode} connections`}
    >
      <span
        className={`material-symbols-outlined text-[16px]${testingMode === mode ? " animate-spin" : ""}`}
      >
        play_arrow
      </span>
      {testingMode === mode ? "Testing..." : "Test All"}
    </button>
  );

  const tabs = [
    { id: "custom", label: "Custom", icon: "extension", count: compatibleProviders.length + anthropicCompatibleProviders.length },
    { id: "oauth", label: "OAuth", icon: "lock_open", count: oauthEntries.length },
    { id: "free", label: "Free Tier", icon: "spa", count: freeEntries.length + freeTierEntries.length },
    { id: "apikey", label: "API Key", icon: "vpn_key", count: apikeyEntries.length + webCookieEntries.length },
  ];

  // ─── Uniform tiles: every provider gets the same compact card ──
  const makeTiles = (items, getItem) =>
    items.map((item) => {
      const { id, key, info, stats, authType, onToggle } = getItem(item);
      return { key: key ?? id, id, info, stats, authType, onToggle };
    });

  const customTiles = makeTiles(
    [...compatibleProviders, ...anthropicCompatibleProviders],
    (p) => ({
      id: p.id,
      info: p,
      stats: getProviderStats(p.id, "apikey"),
      authType: "compatible",
      onToggle: (active) => handleToggleProvider(p.id, "apikey", active),
    }),
  );

  const oauthTiles = makeTiles(oauthEntries, ([key, info]) => {
    const authTypes = dualAuthTypes(info, key);
    return {
      id: key,
      info,
      stats: getProviderStats(key, authTypes),
      authType: "oauth",
      onToggle: (active) => handleToggleProvider(key, authTypes, active),
    };
  });

  const freeTiles = makeTiles(
    [
      ...freeEntries.map(([key, info]) => ({ key, info, kind: "free" })),
      ...freeTierEntries.map(([key, info]) => ({ key, info, kind: "freeTier" })),
    ],
    ({ key, info, kind }) => {
      const authTypes = dualAuthTypes(info, key);
      const authType =
        kind === "freeTier"
          ? Array.isArray(authTypes)
            ? authTypes[0] ?? "apikey"
            : authTypes
          : "free";
      return {
        id: key,
        key: `${kind}-${key}`,
        info,
        stats: getProviderStats(key, authTypes),
        authType,
        onToggle: (active) => handleToggleProvider(key, authTypes, active),
      };
    },
  );

  const apikeyTiles = makeTiles(
    [
      ...visibleApikeyEntries.map(([key, info]) => ({ key, info, authType: "apikey" })),
      ...webCookieEntries.map(([key, info]) => ({ key, info, authType: "cookie" })),
    ],
    ({ key, info, authType }) => ({
      id: key,
      key: `${authType}-${key}`,
      info,
      stats: getProviderStats(key, authType),
      authType,
      onToggle: (active) => handleToggleProvider(key, authType, active),
    }),
  );

  const renderAsymGrid = (tiles) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      {tiles.map((tile) => (
        <ProviderCard
          key={tile.key}
          providerId={tile.id}
          provider={tile.info}
          stats={tile.stats}
          authType={tile.authType}
          onToggle={tile.onToggle}
        />
      ))}
    </div>
  );

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      {/* Status strip: healthy count + clickable error chips (filter shortcuts) */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <p className="text-sm text-text-muted">
          <span className="font-display font-semibold text-text-main">{summary.connected}</span>
          {" "}of {summary.total} connections healthy
          {summary.errors > 0 ? ` · ${summary.errors} down` : ""}
        </p>
        {errorProviders.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {errorProviders.slice(0, 3).map((row, i) => (
              <button
                key={`${row.provider}-${i}`}
                type="button"
                onClick={() => setStatusFilter(statusFilter === "error" ? "all" : "error")}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors ${
                  statusFilter === "error"
                    ? "border-danger bg-danger/15 text-danger"
                    : "border-danger/30 bg-danger/10 text-danger hover:border-danger"
                }`}
                title="Filter to providers with errors"
              >
                {row.label}
                {row.code ? <span className="text-text-muted">{row.code}</span> : null}
              </button>
            ))}
            {errorProviders.length > 3 && (
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === "error" ? "all" : "error")}
                className="inline-flex items-center rounded-md border border-border bg-surface px-2 py-0.5 text-xs text-text-muted transition-colors hover:text-text-main"
                title="Filter to providers with errors"
              >
                +{errorProviders.length - 3} more
              </button>
            )}
          </div>
        )}
        {summary.errors === 0 && summary.total > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-success">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            All healthy
          </span>
        )}
      </div>

      {/* Filter + Tabs */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" aria-label="Provider categories" className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-surface-2 p-1">
            {tabs.map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleTabChange(t.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 font-display text-[13px] font-medium transition-all duration-150 ${
                    active
                      ? "bg-surface text-primary shadow-[var(--shadow-soft)] dark:text-primary"
                      : "text-text-muted hover:text-text-main"
                  }`}
                >
                  <span className={`material-symbols-outlined text-[15px] ${active ? "text-primary dark:text-primary" : "text-text-subtle"}`}>
                    {t.icon}
                  </span>
                  {t.label}
                  <span className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] leading-none ${active ? "bg-surface-2 text-text-main" : "bg-bg text-text-muted"}`}>
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
          <StatusFilterDropdown
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>
      </div>

      {!hasAnyResult && (
        <div className="text-center py-8 border border-dashed border-border rounded-md">
          <span className="material-symbols-outlined text-[32px] text-text-muted mb-2">
            search_off
          </span>
          <p className="text-text-muted text-sm">
            No providers match your search or filters
          </p>
        </div>
      )}

      {/* Tab: Custom (OpenAI/Anthropic Compatible) */}
      {activeTab === "custom" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-text-main">Custom Providers</h2>
              <p className="mt-0.5 text-[11px] text-text-subtle">OpenAI- & Anthropic-compatible endpoints</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:flex sm:w-auto">
              <button
                onClick={() => setShowAddAnthropicCompatibleModal(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2 font-display text-sm font-medium text-text-muted transition-colors hover:border-text-subtle hover:text-text-main sm:w-auto"
              >
                <ProviderIcon
                  src="/providers/anthropic-m.png"
                  alt="Anthropic Compatible"
                  size={16}
                  className="object-contain rounded"
                />
                Anthropic endpoint
              </button>
              <button
                onClick={() => setShowAddCompatibleModal(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2 font-display text-sm font-medium text-text-muted transition-colors hover:border-text-subtle hover:text-text-main sm:w-auto"
              >
                <ProviderIcon
                  src="/providers/oai-cc.png"
                  alt="OpenAI Compatible"
                  size={16}
                  className="object-contain rounded"
                />
                OpenAI endpoint
              </button>
            </div>
          </div>
          {customTiles.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border px-6 py-10 text-center">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-surface-2 text-text-muted">
                <span className="material-symbols-outlined text-[24px]">extension</span>
              </span>
              <div className="space-y-1.5">
                <p className="font-display text-base font-semibold text-text-main">
                  No custom providers yet
                </p>
                <p className="mx-auto max-w-sm text-sm leading-relaxed text-text-muted">
                  Add an OpenAI- or Anthropic-compatible endpoint using the buttons above.
                </p>
              </div>
            </div>
          ) : (
            renderAsymGrid(customTiles)
          )}
        </div>
      )}

      {/* Tab: OAuth */}
      {activeTab === "oauth" && oauthTiles.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text-main">OAuth Providers</h2>
              <p className="mt-0.5 text-xs text-text-subtle">Sign in with provider account</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <ModelAvailabilityBadge />
              {renderTestButton("oauth")}
            </div>
          </div>
          {renderAsymGrid(oauthTiles)}
        </div>
      )}

      {/* Tab: Free Tier */}
      {activeTab === "free" && freeTiles.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text-main">Free Tier Providers</h2>
              <p className="mt-0.5 text-xs text-text-subtle">No-key / trial providers</p>
            </div>
            {renderTestButton("free")}
          </div>
          {renderAsymGrid(freeTiles)}
        </div>
      )}

      {/* Tab: API Key */}
      {activeTab === "apikey" && apikeyTiles.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text-main">API Key Providers</h2>
              <p className="mt-0.5 text-xs text-text-subtle">Providers using an API key</p>
            </div>
            {renderTestButton("apikey")}
          </div>
          {renderAsymGrid(apikeyTiles)}
          {!isApikeySearching && !showAllApikey && hiddenApikeyCount > 0 && (
            <button
              onClick={() => setShowAllApikey(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-text-subtle px-3 py-2.5 text-sm text-text-muted transition-colors hover:border-text-main hover:text-text-main"
            >
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
              Show all {apikeyEntries.length} providers
            </button>
          )}
        </div>
      )}

      <AddCompatibleModal
        variant="openai"
        isOpen={showAddCompatibleModal}
        onClose={() => setShowAddCompatibleModal(false)}
        onCreated={(node) => {
          setProviderNodes((prev) => [...prev, node]);
          setShowAddCompatibleModal(false);
        }}
      />
      <AddCompatibleModal
        variant="anthropic"
        isOpen={showAddAnthropicCompatibleModal}
        onClose={() => setShowAddAnthropicCompatibleModal(false)}
        onCreated={(node) => {
          setProviderNodes((prev) => [...prev, node]);
          setShowAddAnthropicCompatibleModal(false);
        }}
      />

      {/* Test Results Modal */}
      <Modal
        isOpen={!!testResults}
        title="Test Results"
        onClose={() => setTestResults(null)}
      >
        <ProviderTestResultsView results={testResults || {}} />
      </Modal>
    </div>
  );
}

function ProviderCard({ providerId, provider, stats, authType, onToggle }) {
  const { connected, error, errorCode, allDisabled } = stats;
  const isNoAuth = !!provider.noAuth;
  const isCompatible = providerId.startsWith(OPENAI_COMPATIBLE_PREFIX);
  const isAnthropicCompatible = providerId.startsWith(
    ANTHROPIC_COMPATIBLE_PREFIX,
  );

  const getIconPath = () => {
    if (isCompatible && provider.apiType)
      return provider.apiType === "responses"
        ? "/providers/oai-r.png"
        : "/providers/oai-cc.png";
    if (isAnthropicCompatible) return "/providers/anthropic-m.png";
    return getProviderIconSrc(provider.id);
  };

  const lampClass = allDisabled
    ? "bg-text-subtle/40"
    : error > 0
      ? "bg-danger"
      : connected > 0
        ? "bg-success"
        : "bg-text-subtle/40";

  const modeLabel =
    {
      free: "Free",
      oauth: "OAuth",
      apikey: "API Key",
      cookie: "Cookie",
      compatible: "Compatible",
    }[authType] || "Provider";

  // Minimal focused status row: lamp + short label.
  const renderStatus = () => {
    if (allDisabled)
      return (
        <Badge variant="default" size="sm">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">pause_circle</span>
            Disabled
          </span>
        </Badge>
      );
    if (isNoAuth)
      return <Badge variant="success" size="sm" dot>Ready</Badge>;
    const label =
      error > 0 ? (errorCode || "Error") : connected > 0 ? "Connected" : "Idle";
    return (
      <span className="flex items-center gap-1.5">
        <span className={`size-2 rounded-full ${lampClass}`} />
        <span className="text-xs font-medium text-text-muted">{label}</span>
      </span>
    );
  };

  const toggleControl = stats.total > 0 && (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <Toggle
        size="sm"
        checked={!allDisabled}
        onChange={() => onToggle(!allDisabled ? false : true)}
        title={allDisabled ? "Enable provider" : "Disable provider"}
      />
    </div>
  );

  return (
    <Link href={`/dashboard/providers/${providerId}`} className="group min-w-0">
      <Card
        padding="none"
        className={`relative h-full overflow-hidden transition-colors hover:bg-surface-2 cursor-pointer ${allDisabled ? "opacity-60" : ""}`}
      >
        <div className="flex items-center gap-3 p-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface-2">
            <ProviderIcon
              src={getIconPath()}
              alt={provider.name}
              size={24}
              className="object-contain rounded-md max-w-[26px] max-h-[26px]"
              fallbackText={provider.textIcon || provider.id.slice(0, 2).toUpperCase()}
              fallbackColor={provider.color}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate font-display text-[13px] font-medium text-text-main">
                {provider.name}
              </h3>
              <Badge variant="default" size="sm">{modeLabel}</Badge>
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-1.5">
              {renderStatus()}
            </div>
          </div>
          {toggleControl}
          <span className="material-symbols-outlined text-[16px] text-text-subtle opacity-40 transition-opacity group-hover:opacity-100">
            chevron_right
          </span>
        </div>
      </Card>
    </Link>
  );
}

ProviderCard.propTypes = {
  providerId: PropTypes.string.isRequired,
  provider: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    color: PropTypes.string,
    textIcon: PropTypes.string,
    apiType: PropTypes.string,
  }).isRequired,
  stats: PropTypes.shape({
    connected: PropTypes.number,
    error: PropTypes.number,
    errorCode: PropTypes.string,
    errorTime: PropTypes.string,
    total: PropTypes.number,
    allDisabled: PropTypes.bool,
  }).isRequired,
  authType: PropTypes.string,
  onToggle: PropTypes.func,
};

function ProviderTestResultsView({ results }) {
  if (results.error && !results.results) {
    return (
      <div className="text-center py-6">
        <span className="material-symbols-outlined text-danger text-[32px] mb-2 block">
          error
        </span>
        <p className="text-sm text-danger">{results.error}</p>
      </div>
    );
  }

  const { summary, mode } = results;
  const items = results.results || [];
  const modeLabel =
    {
      oauth: "OAuth",
      free: "Free",
      apikey: "API Key",
      provider: "Provider",
      all: "All",
    }[mode] || mode;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {summary && (
        <div className="flex flex-wrap items-center gap-2 text-xs mb-1 sm:gap-3">
          <span className="text-text-muted">{modeLabel} Test</span>
          <span className="px-2 py-0.5 rounded bg-success/15 text-success font-medium">
            {summary.passed} passed
          </span>
          {summary.failed > 0 && (
            <span className="px-2 py-0.5 rounded bg-danger/15 text-danger font-medium">
              {summary.failed} failed
            </span>
          )}
          <span className="text-text-muted sm:ml-auto">
            {summary.total} tested
          </span>
        </div>
      )}
      {items.map((r, i) => (
        <div
          key={r.connectionId || i}
          className="flex min-w-0 flex-wrap items-center gap-2 rounded-md bg-surface-2 px-3 py-2 text-xs sm:flex-nowrap"
        >
          <span
            className={`material-symbols-outlined text-[16px] ${r.valid ? "text-success" : "text-danger"}`}
          >
            {r.valid ? "check_circle" : "error"}
          </span>
          <div className="min-w-0 flex-[1_1_160px]">
            <span className="block truncate font-medium sm:inline">
              {r.connectionName}
            </span>
            <span className="block truncate text-text-muted sm:ml-1.5 sm:inline">
              ({r.provider})
            </span>
          </div>
          {r.latencyMs !== undefined && (
            <span className="shrink-0 text-text-muted font-mono tabular-nums">
              {r.latencyMs}ms
            </span>
          )}
          <span
            className={`shrink-0 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
              r.valid
                ? "bg-success/15 text-success"
                : "bg-danger/15 text-danger"
            }`}
          >
            {r.valid ? "OK" : r.diagnosis?.type || "ERROR"}
          </span>
        </div>
      ))}
      {items.length === 0 && (
        <div className="text-center py-4 text-text-muted text-sm">
          No active connections found for this group.
        </div>
      )}
    </div>
  );
}

ProviderTestResultsView.propTypes = {
  results: PropTypes.shape({
    mode: PropTypes.string,
    results: PropTypes.array,
    summary: PropTypes.shape({
      total: PropTypes.number,
      passed: PropTypes.number,
      failed: PropTypes.number,
    }),
    error: PropTypes.string,
  }).isRequired,
};
