"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import { useTheme } from "@/shared/hooks/useTheme";
import { ConfirmModal } from "./Modal";

const ICON_BTN_CLS =
  "flex items-center justify-center p-2 rounded-lg text-text-muted hover:text-primary transition-all";
const DANGER_BTN_CLS = " hover:text-red-500 dark:hover:text-red-400";

export default function HeaderMenu({ onLogout }) {
  const [shutdownOpen, setShutdownOpen] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const { toggleTheme, isDark } = useTheme();

  const handleShutdown = async () => {
    setIsShuttingDown(true);
    try {
      await fetch("/api/version/shutdown", { method: "POST" });
    } catch (e) {
      // Expected to fail as server shuts down; ignore error
    }
    setIsShuttingDown(false);
    setShutdownOpen(false);
  };

  return (
    <>
      <button className={ICON_BTN_CLS} onClick={toggleTheme} title="Theme">
        <span className="material-symbols-outlined">
          {isDark ? "light_mode" : "dark_mode"}
        </span>
      </button>

      <button
        className={ICON_BTN_CLS + DANGER_BTN_CLS}
        onClick={() => setShutdownOpen(true)}
        title="Shutdown"
      >
        <span className="material-symbols-outlined">power_settings_new</span>
      </button>

      <button
        className={ICON_BTN_CLS + DANGER_BTN_CLS}
        onClick={onLogout}
        title="Logout"
      >
        <span className="material-symbols-outlined">logout</span>
      </button>

      <ConfirmModal
        isOpen={shutdownOpen}
        onClose={() => setShutdownOpen(false)}
        onConfirm={handleShutdown}
        title="Close Proxy"
        message="Are you sure you want to close the proxy server?"
        confirmText="Close"
        cancelText="Cancel"
        variant="danger"
        loading={isShuttingDown}
      />
    </>
  );
}

HeaderMenu.propTypes = {
  onLogout: PropTypes.func.isRequired,
};
