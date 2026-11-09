"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { APP_CONFIG, UPDATER_CONFIG } from "@/shared/constants/config";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import Button from "./Button";
import { ConfirmModal } from "./Modal";
import {
  managementNavItems,
  monitoringNavItems,
  systemNavItems,
  debugNavItems,
  MEDIA_PROVIDER_KINDS_VISIBLE,
} from "./navItems";
import { MEDIA_PROVIDER_KINDS } from "@/shared/constants/providers";

const NAV_ITEM_BASE =
  "group flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 font-display text-sm font-medium transition-colors duration-150";
const NAV_ITEM_ACTIVE = "text-primary";
const NAV_ITEM_IDLE = "text-text-muted hover:text-primary";
const NAV_ICON_ACTIVE = "text-primary";
const NAV_ICON_IDLE = "text-text-subtle transition-colors group-hover:text-primary";

function NavLinkItem({ item, active }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(NAV_ITEM_BASE, active ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE)}
    >
      <span
        className={cn(
          "material-symbols-outlined text-[18px]",
          active ? NAV_ICON_ACTIVE : NAV_ICON_IDLE,
        )}
      >
        {item.icon}
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export default function HeaderNav() {
  const pathname = usePathname();
  const navRef = useRef(null);

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [shutdownCountdown, setShutdownCountdown] = useState(0);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const { copied, copy } = useCopyToClipboard(2000);

  const INSTALL_CMD = UPDATER_CONFIG.installCmdLatest;

  // Vertical wheel → horizontal scroll on the nav strip. Non-passive listener so
  // preventDefault can stop the page from scrolling; at either end the event is
  // left alone so the wheel keeps doing its normal job.
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (e.deltaX !== 0) return; // horizontal input already works natively
      if (el.scrollWidth <= el.clientWidth) return;
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1;
      if ((e.deltaY < 0 && atStart) || (e.deltaY > 0 && atEnd)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch("/api/version")
        .then((res) => res.json())
        .then((data) => {
          if (data.hasUpdate) setUpdateInfo(data);
        })
        .catch(() => {});
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleUpdate = () => {
    setShowUpdateModal(false);
    setIsUpdating(true);
  };

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

  const isActive = (href) => {
    if (href === "/dashboard/endpoint") {
      return pathname === "/dashboard" || pathname.startsWith("/dashboard/endpoint");
    }
    return pathname.startsWith(href);
  };

  const kinds = MEDIA_PROVIDER_KINDS.filter((k) =>
    MEDIA_PROVIDER_KINDS_VISIBLE.includes(k.id)
  );

  const items = [
    ...managementNavItems,
    ...monitoringNavItems,
    ...kinds.map((kind) => ({
      href: `/dashboard/media-providers/${kind.id}`,
      label: kind.label,
      icon: kind.icon,
    })),
    ...systemNavItems,
    ...debugNavItems,
  ];

  return (
    <>
      <nav ref={navRef} className="scrollbar-hide flex w-full items-center overflow-x-auto">
        <div className="flex items-center gap-0.5">
          {items.map((item) => (
            <NavLinkItem key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </div>
      </nav>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
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

function ManualUpdatePanel({ latestVersion, installCmd, copied, onCopyAndShutdown, onCancel, countdown, isDisconnected }) {
  const isCountingDown = countdown > 0;
  return (
    <div className="w-full max-w-lg rounded-xl border border-white/10 bg-neutral-900/95 p-6 text-white">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-full bg-clay-500/20 text-clay-400">
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
        <code className="break-all font-mono text-xs text-clay-400">{installCmd}</code>
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
