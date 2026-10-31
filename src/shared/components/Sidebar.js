"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { APP_CONFIG, UPDATER_CONFIG } from "@/shared/constants/config";
import { MEDIA_PROVIDER_KINDS } from "@/shared/constants/providers";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import useSettingsStore from "@/store/settingsStore";
import Button from "./Button";
import { ConfirmModal } from "./Modal";

// ─── Data ────────────────────────────────────────────────────────────────────

// const VISIBLE_MEDIA_KINDS = ["embedding", "image", "imageToText", "tts", "stt", "webSearch", "webFetch", "video", "music"];
const VISIBLE_MEDIA_KINDS = ["embedding", "image", "video", "tts", "stt", "systemone"];
// Combined entry: webSearch + webFetch share one page at /dashboard/media-providers/web
const COMBINED_WEB_ITEM = { id: "web", label: "Web Fetch & Search", icon: "travel_explore", href: "/dashboard/media-providers/web" };

const managementItems = [
  { href: "/dashboard/endpoint", label: "Endpoint & Key", icon: "api" },
  { href: "/dashboard/providers", label: "Providers", icon: "dns" },
  // { href: "/dashboard/basic-chat", label: "Basic Chat", icon: "chat" }, // Hidden
  { href: "/dashboard/combos", label: "Combo & Vision Adapter", icon: "layers" },
  { href: "/dashboard/cli-tools", label: "CLI Tools", icon: "terminal" },
];

const monitoringItems = [
  { href: "/dashboard/usage", label: "Usage", icon: "bar_chart" },
  { href: "/dashboard/quota", label: "Quota Tracker", icon: "data_usage" },
  { href: "/dashboard/token-saver", label: "Token Saver", icon: "savings" },
  // { href: "/dashboard/pxpipe", label: "PXPIPE", icon: "image" },
];

const systemItems = [
  { href: "/dashboard/proxy-pools", label: "Proxy Pools", icon: "lan" },
  { href: "/dashboard/skills", label: "Skills", icon: "extension" },
];

const debugItems = [
  { href: "/dashboard/console-log", label: "Console Log", icon: "monitor" },
  { href: "/dashboard/translator", label: "Translator", icon: "translate" },
];

// ─── Style tokens ────────────────────────────────────────────────────────────

const NAV_ITEM_BASE =
  "group relative flex items-center rounded-lg font-display font-medium transition-colors duration-150";
const NAV_ITEM_ACTIVE = "bg-brand-500/10 text-brand-700 dark:text-brand-300";
const NAV_ITEM_IDLE = "text-text-muted hover:bg-surface-2 hover:text-text-main";
const NAV_ICON_ACTIVE = "text-brand-600 dark:text-brand-400";
const NAV_ICON_IDLE = "text-text-subtle transition-colors group-hover:text-text-main";
const NAV_ACTIVE_BAR =
  "absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-brand-500";

const COLLAPSE_STORAGE_KEY = "keyrouter.sidebar.collapsed";

// ─── Small pieces ────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="px-3 pb-1.5 pt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-text-subtle">
      {children}
    </p>
  );
}

function NavLink({ href, icon, label, active, onClick, collapsed, iconClassName }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        NAV_ITEM_BASE,
        collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
        active ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE,
      )}
    >
      {active && <span className={NAV_ACTIVE_BAR} />}
      <span
        className={cn(
          "material-symbols-outlined",
          iconClassName || "text-[18px]",
          active ? NAV_ICON_ACTIVE : NAV_ICON_IDLE,
        )}
      >
        {icon}
      </span>
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function NavButton({ icon, label, active, open, onClick, collapsed }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      title={collapsed ? label : undefined}
      className={cn(
        NAV_ITEM_BASE,
        "w-full",
        collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
        active ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE,
      )}
    >
      {active && <span className={NAV_ACTIVE_BAR} />}
      <span
        className={cn(
          "material-symbols-outlined text-[18px]",
          active ? NAV_ICON_ACTIVE : NAV_ICON_IDLE,
        )}
      >
        {icon}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 text-left">{label}</span>
          <span
            className={cn(
              "material-symbols-outlined text-[14px] text-text-subtle transition-transform duration-150",
              open && "rotate-180",
            )}
          >
            expand_more
          </span>
        </>
      )}
    </button>
  );
}

// Media providers group: accordion when expanded, hover flyout when collapsed.
function MediaNavGroup({ active, open, collapsed, onToggle, onNavigate, isPathActive }) {
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const mediaKinds = MEDIA_PROVIDER_KINDS.filter((k) => VISIBLE_MEDIA_KINDS.includes(k.id));

  if (collapsed) {
    return (
      <div
        className="relative"
        onMouseEnter={() => setFlyoutOpen(true)}
        onMouseLeave={() => setFlyoutOpen(false)}
      >
        <NavButton
          icon="perm_media"
          label="Media Providers"
          active={active}
          open={false}
          collapsed
          onClick={onToggle}
        />
        {flyoutOpen && (
          <div className="absolute left-full top-0 z-50 ml-2 w-64 rounded-xl border border-border-subtle bg-surface p-2 shadow-[var(--shadow-elev)]">
            <p className="px-3 pb-1.5 pt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-text-subtle">
              Media Providers
            </p>
            {mediaKinds.map((kind) => {
              const href = `/dashboard/media-providers/${kind.id}`;
              const isActive = isPathActive(href);
              return (
                <NavLink
                  key={kind.id}
                  href={href}
                  icon={kind.icon}
                  label={kind.label}
                  active={isActive}
                  onClick={onNavigate}
                  iconClassName="text-[16px]"
                />
              );
            })}
            <NavLink
              href={COMBINED_WEB_ITEM.href}
              icon={COMBINED_WEB_ITEM.icon}
              label={COMBINED_WEB_ITEM.label}
              active={isPathActive(COMBINED_WEB_ITEM.href)}
              onClick={onNavigate}
              iconClassName="text-[16px]"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <NavButton
        icon="perm_media"
        label="Media Providers"
        active={active}
        open={open}
        onClick={onToggle}
      />
      {open && (
        <div className="relative ml-4 space-y-0.5 border-l border-border-subtle pl-3">
          {mediaKinds.map((kind) => (
            <NavLink
              key={kind.id}
              href={`/dashboard/media-providers/${kind.id}`}
              icon={kind.icon}
              label={kind.label}
              active={isPathActive(`/dashboard/media-providers/${kind.id}`)}
              onClick={onNavigate}
              iconClassName="text-[16px]"
            />
          ))}
          <NavLink
            href={COMBINED_WEB_ITEM.href}
            icon={COMBINED_WEB_ITEM.icon}
            label={COMBINED_WEB_ITEM.label}
            active={isPathActive(COMBINED_WEB_ITEM.href)}
            onClick={onNavigate}
            iconClassName="text-[16px]"
          />
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export default function Sidebar({ onClose, collapsible = true }) {
  const pathname = usePathname();
  const isPathActive = (href) => pathname.startsWith(href);

  const [mediaOpen, setMediaOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [shutdownCountdown, setShutdownCountdown] = useState(0);
  const [enableTranslator, setEnableTranslator] = useState(false);
  const { copied, copy } = useCopyToClipboard(2000);

  const INSTALL_CMD = UPDATER_CONFIG.installCmdLatest;
  const isCollapsed = collapsible && collapsed;

  useEffect(() => {
    useSettingsStore.getState().fetchSettings().then((data) => {
      if (data?.enableTranslator) setEnableTranslator(true);
    });
  }, []);

  // Persist collapse preference (desktop only); avoid hydration mismatch by
  // reconciling after the first paint.
  useEffect(() => {
    if (!collapsible) return;
    const raf = requestAnimationFrame(() => {
      let stored = false;
      try {
        stored = localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1";
      } catch { /* ignore */ }
      setCollapsed(stored);
    });
    return () => cancelAnimationFrame(raf);
  }, [collapsible]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_STORAGE_KEY, isCollapsed ? "1" : "0");
    } catch { /* ignore */ }
  }, [isCollapsed]);

  // Lazy check for new npm version in background after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch("/api/version")
        .then(res => res.json())
        .then(data => { if (data.hasUpdate) setUpdateInfo(data); })
        .catch(() => {});
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const isActive = (href) => {
    if (href === "/dashboard/endpoint") {
      return pathname === "/dashboard" || pathname.startsWith("/dashboard/endpoint");
    }
    return pathname.startsWith(href);
  };

  // Open manual update panel (no countdown yet — user must click Copy to trigger shutdown)
  const handleUpdate = () => {
    setShowUpdateModal(false);
    setIsUpdating(true);
  };

  // Triggered by Copy button inside ManualUpdatePanel: copy + countdown + shutdown
  const handleCopyAndShutdown = async () => {
    try { await navigator.clipboard.writeText(INSTALL_CMD); } catch { /* clipboard blocked */ }
    copy(INSTALL_CMD);
    let remaining = UPDATER_CONFIG.shutdownCountdownSec;
    setShutdownCountdown(remaining);
    const timer = setInterval(() => {
      remaining -= 1;
      setShutdownCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        fetch("/api/version/shutdown", { method: "POST" }).catch(() => {});
        setIsDisconnected(true);
      }
    }, 1000);
  };

  const handleCancelUpdate = () => {
    setIsUpdating(false);
    setShutdownCountdown(0);
  };

  const navPadding = isCollapsed ? "px-2" : "px-3";
  const iconSize = isCollapsed ? "text-[20px]" : "text-[18px]";

  return (
    <>
      <aside
        className={cn(
          "flex flex-col border-r border-border-subtle bg-surface min-h-full",
          "transition-[width] duration-200 ease-out",
          isCollapsed ? "w-[76px]" : "w-72",
        )}
      >
        {/* Panel masthead */}
        <div
          className={cn(
            "flex items-center border-b border-border-subtle py-3",
            isCollapsed ? "justify-center px-2" : "justify-between px-5 font-mono uppercase",
          )}
        >
          {!isCollapsed && (
            <span className="text-[10px] tracking-[0.25em] text-text-subtle">
              KeyRouter · Panel
            </span>
          )}
          <span className="flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-[9px] tracking-[0.12em] text-success">
            <span className="size-1.5 rounded-full bg-success" />
            {!isCollapsed && "Online"}
          </span>
        </div>

        {/* Logo */}
        <div className={cn("pb-3", isCollapsed ? "pt-4" : "px-5 pt-4")}>
          <Link
            href="/dashboard"
            className={cn("group flex items-center", isCollapsed ? "justify-center" : "gap-3")}
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-brand-600 text-white shadow-[var(--shadow-warm)] transition-transform duration-150 group-hover:scale-[1.04]">
              <span className="material-symbols-outlined text-[20px]">hub</span>
            </div>
            {!isCollapsed && (
              <div className="leading-tight">
                <h1 className="text-[15px] font-bold tracking-tight text-text-main">
                  {APP_CONFIG.name}
                </h1>
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-subtle">
                  v{APP_CONFIG.versionLabel}
                </span>
              </div>
            )}
          </Link>
          {!isCollapsed && updateInfo && (
            <div className="mt-3 space-y-2 rounded-lg border border-border-subtle bg-bg p-2.5">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-green-700 dark:text-amber-400">
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                New version available: v{updateInfo.latestVersion}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowUpdateModal(true)}
                  className="cursor-pointer rounded-md bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
                >
                  Update now
                </button>
                <button
                  onClick={() => copy(INSTALL_CMD)}
                  title="Copy install command"
                  className="min-w-0 flex-1 cursor-pointer text-left transition-opacity hover:opacity-80"
                >
                  <code className="block truncate font-mono text-[10px] text-green-700/80 dark:text-amber-400/70">
                    {copied ? "✓ copied!" : INSTALL_CMD}
                  </code>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 overflow-y-auto space-y-0.5 py-3 custom-scrollbar", navPadding)}>
          {!isCollapsed && <SectionLabel>Management</SectionLabel>}
          {managementItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={isActive(item.href)}
              onClick={onClose}
              collapsed={isCollapsed}
              iconClassName={iconSize}
            />
          ))}

          {!isCollapsed && <SectionLabel>Monitoring</SectionLabel>}
          {monitoringItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={isActive(item.href)}
              onClick={onClose}
              collapsed={isCollapsed}
              iconClassName={iconSize}
            />
          ))}

          {!isCollapsed && <SectionLabel>System</SectionLabel>}
          <MediaNavGroup
            active={isPathActive("/dashboard/media-providers")}
            open={mediaOpen}
            collapsed={isCollapsed}
            onToggle={() => setMediaOpen((v) => !v)}
            onNavigate={onClose}
            isPathActive={isPathActive}
          />
          {systemItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={isActive(item.href)}
              onClick={onClose}
              collapsed={isCollapsed}
              iconClassName={iconSize}
            />
          ))}

          {/* Debug items (internal) */}
          {debugItems.map((item) => {
            const show = item.href !== "/dashboard/translator" || enableTranslator;
            return show ? (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={isActive(item.href)}
                onClick={onClose}
                collapsed={isCollapsed}
                iconClassName={iconSize}
              />
            ) : null;
          })}
        </nav>

        {/* Footer: pinned actions + collapse toggle */}
        <div className="border-t border-border-subtle p-3">
          <div className="space-y-0.5">
            <NavLink
              href="/dashboard/profile"
              icon="settings"
              label="Settings"
              active={isActive("/dashboard/profile")}
              onClick={onClose}
              collapsed={isCollapsed}
              iconClassName={iconSize}
            />
          </div>

          {collapsible && (
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "mt-3 flex items-center justify-center rounded-lg border border-border-subtle text-xs font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text-main",
                isCollapsed ? "mx-auto size-9" : "w-full gap-2 px-3 py-2",
              )}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isCollapsed ? "left_panel_open" : "left_panel_close"}
              </span>
              {!isCollapsed && <span>Collapse</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Update Confirmation Modal */}
      <ConfirmModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onConfirm={handleUpdate}
        title="Update KeyRouter"
        message={`Show install command for v${updateInfo?.latestVersion || ""}? You can copy it and shutdown to install manually.`}
        confirmText="Show Command"
        cancelText="Cancel"
        variant="primary"
      />

      {/* Disconnected / Updating Overlay */}
      {(isDisconnected || isUpdating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          {isUpdating ? (
            <ManualUpdatePanel
              latestVersion={updateInfo?.latestVersion}
              installCmd={INSTALL_CMD}
              copied={copied}
              onCopyAndShutdown={handleCopyAndShutdown}
              onCancel={handleCancelUpdate}
              countdown={shutdownCountdown}
              isDisconnected={isDisconnected}
            />
          ) : (
            <div className="p-8 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-red-500/20 text-red-500">
                <span className="material-symbols-outlined text-[32px]">power_off</span>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-white">Server Disconnected</h2>
              <p className="mb-6 text-text-muted">The proxy server has been stopped.</p>
              <Button variant="secondary" onClick={() => globalThis.location.reload()}>
                Reload Page
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

Sidebar.propTypes = {
  onClose: PropTypes.func,
  collapsible: PropTypes.bool,
};

function ManualUpdatePanel({ latestVersion, installCmd, copied, onCopyAndShutdown, onCancel, countdown, isDisconnected }) {
  const isCountingDown = countdown > 0;
  return (
    <div className="w-full max-w-lg rounded-xl border border-white/10 bg-neutral-900/95 p-6 text-white">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
          <span className="material-symbols-outlined text-[24px]">content_copy</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Update KeyRouter{latestVersion ? ` to v${latestVersion}` : ""}</h2>
          <p className="text-xs text-white/60">
            {isDisconnected
              ? "Server stopped. Paste the command into a terminal to install."
              : isCountingDown
                ? `Command copied. Server will stop in ${countdown}s...`
                : "Click the button below to copy the install command and shutdown."}
          </p>
        </div>
      </div>

      <p className="mb-2 text-sm text-white/80">Install command:</p>
      <div className="mb-4 w-full rounded bg-white/5 px-3 py-2">
        <code className="break-all font-mono text-xs text-amber-400">{installCmd}</code>
      </div>

      <ol className="mb-4 list-inside list-decimal space-y-1 text-xs text-white/70">
        <li>Click <strong>Copy & Shutdown</strong> below.</li>
        <li>Paste the command into your terminal and press Enter.</li>
        <li>Run <code className="rounded bg-white/10 px-1 text-green-400">keyrouter</code> again after install.</li>
      </ol>

      {isDisconnected ? (
        <Button variant="secondary" fullWidth onClick={() => globalThis.location.reload()}>
          Reload Page
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={isCountingDown}>
            Cancel
          </Button>
          <Button variant="primary" fullWidth onClick={onCopyAndShutdown} disabled={isCountingDown}>
            {copied ? "✓ Copied - shutting down..." : isCountingDown ? `Shutting down in ${countdown}s` : "Copy & Shutdown"}
          </Button>
        </div>
      )}
    </div>
  );
}

ManualUpdatePanel.propTypes = {
  latestVersion: PropTypes.string,
  installCmd: PropTypes.string.isRequired,
  copied: PropTypes.bool,
  onCopyAndShutdown: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  countdown: PropTypes.number,
  isDisconnected: PropTypes.bool,
};
