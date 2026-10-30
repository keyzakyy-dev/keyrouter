"use client";

import PropTypes from "prop-types";
import { Toggle } from "@/shared/components";

function Status({ ok, label, warnLabel }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-[4px] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
        ok ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
      }`}
    >
      <span className={`material-symbols-outlined text-[12px] ${ok ? "fill-1" : ""}`}>
        {ok ? "check_circle" : "warning"}
      </span>
      {ok ? label : warnLabel}
    </span>
  );
}

function Row({ icon, title, desc, children }) {
  return (
    <div className="flex items-start gap-2.5 py-3 first:pt-0 last:pb-0">
      <span className="material-symbols-outlined mt-0.5 text-[16px] text-text-subtle">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-text-main">{title}</p>
          {children}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{desc}</p>
      </div>
    </div>
  );
}

/** Compact security posture summary for the endpoint exposure. */
export default function SecurityPanel({
  requireApiKey,
  requireLogin,
  hasPassword,
  isRemoteHost,
  tunnelActive,
  tunnelDashboardAccess,
  onToggleDashboardAccess,
}) {
  const loginOk = requireLogin && hasPassword;
  const issues = (requireApiKey ? 0 : 1) + (loginOk ? 0 : 1);

  const jumpToKeys = () =>
    document.getElementById("require-api-key")?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <section className="rounded-md border border-border-subtle bg-surface p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-main">
          <span className="material-symbols-outlined text-[18px] text-primary">shield</span>
          Security
        </h2>
        <span
          className={`rounded-[4px] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
            issues === 0 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
          }`}
        >
          {issues === 0 ? "Locked down" : `${issues} open`}
        </span>
      </div>

      <div className="divide-y divide-border-subtle">
        <Row
          icon="vpn_key"
          title="API key required"
          desc="Calls without a valid key are rejected at the gateway."
        >
          {requireApiKey ? (
            <Status ok label="On" warnLabel="Off" />
          ) : (
            <button
              type="button"
              onClick={jumpToKeys}
              className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-text-main underline decoration-text-subtle underline-offset-2 hover:text-black"
            >
              Enable
            </button>
          )}
        </Row>

        <Row
          icon="login"
          title="Dashboard login"
          desc={
            !requireLogin
              ? "Login is off - anyone reaching the dashboard gets in."
              : !hasPassword
                ? "Still on the default password."
                : "Password protected."
          }
        >
          <Status ok={loginOk} label="On" warnLabel={!requireLogin ? "Off" : "Default"} />
        </Row>

        {isRemoteHost && !requireApiKey && (
          <Row
            icon="public"
            title="Reached from another host"
            desc="This browser is not on localhost, so the endpoint is exposed."
          >
            <Status ok={false} label="On" warnLabel="Bare" />
          </Row>
        )}

        {tunnelActive && (
          <Row
            icon="monitor"
            title="Dashboard over tunnel"
            desc="Serve the dashboard itself on the remote URL. Login still applies."
          >
            <Toggle checked={tunnelDashboardAccess} onChange={onToggleDashboardAccess} />
          </Row>
        )}
      </div>

      {issues > 0 && (
        <a
          href="/dashboard/profile"
          className="mt-3 flex items-center justify-center gap-1.5 rounded-md border border-border-subtle bg-bg px-3 py-1.5 text-xs font-semibold text-text-main transition hover:border-text-subtle hover:text-black"
        >
          <span className="material-symbols-outlined text-[14px]">settings</span>
          Open settings
        </a>
      )}
    </section>
  );
}

SecurityPanel.propTypes = {
  requireApiKey: PropTypes.bool.isRequired,
  requireLogin: PropTypes.bool.isRequired,
  hasPassword: PropTypes.bool.isRequired,
  isRemoteHost: PropTypes.bool.isRequired,
  tunnelActive: PropTypes.bool.isRequired,
  tunnelDashboardAccess: PropTypes.bool.isRequired,
  onToggleDashboardAccess: PropTypes.func.isRequired,
};
