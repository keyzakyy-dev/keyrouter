"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/components";
import { APP_CONFIG } from "@/shared/constants/config";
import { cn } from "@/shared/utils/cn";

/**
 * shadcn/ui-style login page.
 * Uses KeyRouter design tokens + material-symbols icons (the UI icon set used
 * across the app). No external shadcn deps — the pieces here are written by
 * hand to match the shadcn look (clean card, subtle borders, focus rings).
 */
function Icon({ name, className }) {
  return (
    <span className={cn("material-symbols-outlined select-none", className)} aria-hidden="true">
      {name}
    </span>
  );
}

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [resetHint, setResetHint] = useState("");
  const [retryAfter, setRetryAfter] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasPassword, setHasPassword] = useState(null);
  const [authMode, setAuthMode] = useState("password");
  const [ssoType, setSsoType] = useState("oidc");
  const [oidcConfigured, setOidcConfigured] = useState(false);
  const [oidcLoginLabel, setOidcLoginLabel] = useState("Sign in with OIDC");
  const [samlConfigured, setSamlConfigured] = useState(false);
  const [samlLoginLabel, setSamlLoginLabel] = useState("Sign in with SAML SSO");
  const [mustChange, setMustChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // Countdown for rate-limit
  useEffect(() => {
    if (retryAfter <= 0) return;
    const id = setInterval(() => setRetryAfter((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [retryAfter]);

  useEffect(() => {
    async function checkAuth() {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

      try {
        const res = await fetch(`${baseUrl}/api/auth/status`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated === true || data.requireLogin === false) {
            window.location.assign("/dashboard");
            return;
          }
          setHasPassword(!!data.hasPassword);
          setAuthMode(data.authMode || "password");
          setSsoType(data.ssoType || "oidc");
          setOidcConfigured(data.oidcConfigured === true);
          setOidcLoginLabel(data.oidcLoginLabel || "Sign in with OIDC");
          setSamlConfigured(data.samlConfigured === true);
          setSamlLoginLabel(data.samlLoginLabel || "Sign in with SAML SSO");
        } else {
          setHasPassword(true);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        setHasPassword(true);
      }
    }
    checkAuth();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResetHint("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.mustChangePassword) {
          setMustChange(true);
          return;
        }
        window.location.assign("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "Invalid password");
        if (data.resetHint) setResetHint(data.resetHint);
        if (data.retryAfter) setRetryAfter(Number(data.retryAfter));
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: password, newPassword }),
      });
      if (res.ok) {
        window.location.assign("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to set password");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOidcLogin = () => {
    window.location.href = "/api/auth/oidc/start";
  };

  const handleSamlLogin = () => {
    window.location.href = "/api/auth/saml/start";
  };

  const isSsoEnabled = ["sso", "oidc", "saml", "both"].includes(authMode);
  const activeSsoType = ssoType || (authMode === "saml" ? "saml" : "oidc");

  const samlAvailable = isSsoEnabled && activeSsoType === "saml" && samlConfigured;
  const oidcAvailable = isSsoEnabled && activeSsoType === "oidc" && oidcConfigured;
  const ssoAvailable = samlAvailable || oidcAvailable;

  const passwordAvailable = authMode === "password" || authMode === "both" || !ssoAvailable;

  const ssoTitle =
    activeSsoType === "saml" ? "SAML 2.0 Single Sign-On" : "OIDC Single Sign-On";

  const isSsoMode = samlAvailable || oidcAvailable;
  const pageTitle = isSsoMode ? "Single sign-on" : "Sign in";
  const pageSubtitle = isSsoMode
    ? "Securely access your KeyRouter control room."
    : "Enter your dashboard password to continue.";

  if (hasPassword === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4 relative overflow-hidden">
        <div className="dot-grid-bg absolute inset-0 pointer-events-none" aria-hidden="true" />
        <div className="relative z-10 flex items-center gap-3 text-sm text-text-muted">
          <span className="inline-block h-4 w-4 rounded-full border-2 border-brand-500/40 border-t-brand-500 animate-spin" />
          Checking dashboard access…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden flex items-center justify-center px-4 py-10">
      {/* Ambient background */}
      <div className="dot-grid-bg absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-brand-500/15 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-[430px]">
        <div className="rounded-[20px] border border-border-subtle bg-surface shadow-[var(--shadow-elev)] overflow-hidden">
          {/* Accent line */}
          <div className="h-1 bg-gradient-to-r from-brand-500 via-brand-400 to-brand-600" />

          <div className="p-7 sm:p-9">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-11 rounded-[12px] bg-gradient-to-br from-brand-500 to-brand-700 shadow-[var(--shadow-warm)]">
                <Icon name="hub" className="text-white text-[22px]" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[15px] font-bold tracking-tight text-text-main">
                  {APP_CONFIG.name}
                </span>
                <span className="mt-1 text-[11px] text-text-muted">v{APP_CONFIG.version}</span>
              </div>
            </div>

            {/* Heading */}
            <div className="mt-8">
              <h1 className="text-2xl font-bold tracking-tight text-text-main">{pageTitle}</h1>
              <p className="mt-1.5 text-sm text-text-muted">{pageSubtitle}</p>
            </div>

            {mustChange ? (
              <form onSubmit={handleSetNewPassword} className="mt-7 flex flex-col gap-5">
                <div className="rounded-[10px] border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-[13px] text-amber-700 dark:text-amber-300">
                  Set a new password before accessing the dashboard remotely.
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="login-new-password" className="text-[13px] font-medium text-text-main">
                    New password
                  </label>
                  <div className="relative">
                    <Icon name="lock" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-[20px]" />
                    <input
                      id="login-new-password"
                      type="password"
                      placeholder="Enter a new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      autoFocus
                      className={cn(
                        "w-full py-2.5 pl-11 pr-4 text-sm text-text-main bg-sidebar rounded-[10px]",
                        "border border-border placeholder:text-text-muted/60",
                        "focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50",
                        "transition-all duration-150"
                      )}
                    />
                  </div>
                  {error && (
                    <p className="text-xs text-red-500 flex items-center gap-1.5">
                      <Icon name="error" className="text-[15px]" />
                      {error}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  loading={loading}
                  disabled={!newPassword}
                >
                  Set password
                </Button>
              </form>
            ) : (
              <div className="mt-7 flex flex-col gap-5">
                {/* SSO buttons */}
                {samlAvailable && (
                  <Button type="button" variant="outline" size="lg" className="w-full" onClick={handleSamlLogin}>
                    <Icon name="badge" className="text-[18px] text-brand-600" />
                    {samlLoginLabel}
                  </Button>
                )}
                {oidcAvailable && (
                  <Button type="button" variant="outline" size="lg" className="w-full" onClick={handleOidcLogin}>
                    <Icon name="badge" className="text-[18px] text-brand-600" />
                    {oidcLoginLabel}
                  </Button>
                )}

                {ssoAvailable && passwordAvailable && (
                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-[11px] uppercase tracking-wider text-text-subtle">or</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}

                {passwordAvailable && (
                  <form onSubmit={handleLogin} className="flex flex-col gap-5">
                    {isSsoEnabled && !ssoAvailable && (
                      <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
                        {activeSsoType === "saml" ? "SAML SSO" : "OIDC"} is enabled, but the
                        configuration is incomplete. Password login is still available for recovery.
                      </p>
                    )}

                    {authMode === "both" && ssoAvailable && (
                      <p className="text-xs text-text-muted text-center">
                        Password and {activeSsoType === "saml" ? "SAML SSO" : "OIDC"} login are both enabled.
                      </p>
                    )}

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="login-password" className="text-[13px] font-medium text-text-main">
                          Password
                        </label>
                        <span className="text-[11px] text-text-subtle">
                          default is <code className="bg-sidebar px-1.5 py-0.5 rounded-md text-[10px]">123456</code>
                        </span>
                      </div>

                      <div className="relative">
                        <Icon name="lock" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-[20px]" />
                        <input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter dashboard password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoFocus={!oidcAvailable}
                          disabled={retryAfter > 0}
                          className={cn(
                            "w-full py-2.5 pl-11 pr-11 text-sm text-text-main bg-sidebar rounded-[10px]",
                            "border border-border placeholder:text-text-muted/60",
                            "focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50",
                            "text-[16px] sm:text-sm transition-all duration-150 disabled:opacity-50"
                          )}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-text-muted hover:text-text-main transition-colors"
                        >
                          <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-[20px]" />
                        </button>
                      </div>

                      {error && (
                        <p className="text-xs text-red-500 flex items-center gap-1.5">
                          <Icon name="error" className="text-[15px]" />
                          {error}
                        </p>
                      )}
                      {retryAfter > 0 && (
                        <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                          <Icon name="timer" className="text-[15px]" />
                          Locked. Retry in <span className="font-mono">{retryAfter}s</span>.
                        </p>
                      )}
                      {resetHint && (
                        <p className="text-xs text-text-muted">
                          Forgot password? Open <code className="bg-sidebar px-1.5 py-0.5 rounded-md">keyrouter</code> CLI
                          on the host → <b>Settings</b> → <b>Reset Password to Default</b>.
                        </p>
                      )}
                      {hasPassword === false && (
                        <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                          <Icon name="security" className="text-[15px]" />
                          No password set yet — you'll set one when logging in remotely.
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full"
                      loading={loading}
                      disabled={retryAfter > 0}
                      icon={retryAfter > 0 ? undefined : "arrow_forward"}
                    >
                      {retryAfter > 0 ? `Wait ${retryAfter}s` : "Sign in"}
                    </Button>
                  </form>
                )}

                {!passwordAvailable && error && <p className="text-xs text-red-500">{error}</p>}
              </div>
            )}
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] text-text-subtle">
          {ssoTitle} · {APP_CONFIG.name} v{APP_CONFIG.version}
        </p>
      </div>
    </div>
  );
}
