"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/components";
import { APP_CONFIG } from "@/shared/constants/config";
import { cn } from "@/shared/utils/cn";

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
  const [oidcLoginLabel, setOidcLoginLabel] = useState("Continue with OIDC SSO");
  const [samlConfigured, setSamlConfigured] = useState(false);
  const [samlLoginLabel, setSamlLoginLabel] = useState("Continue with SAML SSO");
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
          setOidcLoginLabel(data.oidcLoginLabel || "Continue with OIDC SSO");
          setSamlConfigured(data.samlConfigured === true);
          setSamlLoginLabel(data.samlLoginLabel || "Continue with SAML SSO");
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

  if (hasPassword === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="flex items-center gap-3 font-mono text-sm text-text-muted">
          <span className="inline-block h-4 w-4 rounded-full border-2 border-border border-t-text-main animate-spin" />
          handshaking…
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg text-text-main">
      {/* Background topology */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full opacity-50"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <g
          className="topo-bg-edges"
          fill="none"
          stroke="var(--color-border-subtle)"
          strokeWidth="1"
        >
          <line x1="100" y1="150" x2="220" y2="80" />
          <line x1="100" y1="150" x2="90" y2="320" />
          <line x1="220" y1="80" x2="360" y2="60" />
          <line x1="220" y1="80" x2="240" y2="260" />
          <line x1="360" y1="60" x2="520" y2="90" />
          <line x1="360" y1="60" x2="380" y2="210" />
          <line x1="520" y1="90" x2="640" y2="50" />
          <line x1="520" y1="90" x2="540" y2="200" />
          <line x1="640" y1="50" x2="800" y2="110" />
          <line x1="640" y1="50" x2="700" y2="180" />
          <line x1="800" y1="110" x2="950" y2="70" />
          <line x1="800" y1="110" x2="860" y2="230" />
          <line x1="950" y1="70" x2="1100" y2="150" />
          <line x1="950" y1="70" x2="1020" y2="300" />
          <line x1="1100" y1="150" x2="1180" y2="260" />
          <line x1="90" y1="320" x2="240" y2="260" />
          <line x1="90" y1="320" x2="140" y2="480" />
          <line x1="240" y1="260" x2="380" y2="210" />
          <line x1="240" y1="260" x2="300" y2="420" />
          <line x1="380" y1="210" x2="540" y2="200" />
          <line x1="380" y1="210" x2="460" y2="380" />
          <line x1="540" y1="200" x2="700" y2="180" />
          <line x1="540" y1="200" x2="620" y2="360" />
          <line x1="700" y1="180" x2="860" y2="230" />
          <line x1="700" y1="180" x2="780" y2="400" />
          <line x1="860" y1="230" x2="1020" y2="300" />
          <line x1="860" y1="230" x2="940" y2="460" />
          <line x1="1020" y1="300" x2="1180" y2="260" />
          <line x1="1020" y1="300" x2="1100" y2="430" />
          <line x1="1180" y1="260" x2="1180" y2="400" />
          <line x1="140" y1="480" x2="300" y2="420" />
          <line x1="140" y1="480" x2="120" y2="660" />
          <line x1="300" y1="420" x2="460" y2="380" />
          <line x1="300" y1="420" x2="280" y2="600" />
          <line x1="460" y1="380" x2="620" y2="360" />
          <line x1="460" y1="380" x2="440" y2="580" />
          <line x1="620" y1="360" x2="780" y2="400" />
          <line x1="620" y1="360" x2="600" y2="560" />
          <line x1="780" y1="400" x2="940" y2="460" />
          <line x1="780" y1="400" x2="760" y2="610" />
          <line x1="940" y1="460" x2="1100" y2="430" />
          <line x1="940" y1="460" x2="920" y2="660" />
          <line x1="1100" y1="430" x2="1180" y2="400" />
          <line x1="1100" y1="430" x2="1080" y2="640" />
          <line x1="1180" y1="260" x2="1180" y2="400" />
          <line x1="120" y1="660" x2="280" y2="600" />
          <line x1="120" y1="660" x2="100" y2="800" />
          <line x1="280" y1="600" x2="440" y2="580" />
          <line x1="280" y1="600" x2="500" y2="720" />
          <line x1="440" y1="580" x2="600" y2="560" />
          <line x1="440" y1="580" x2="500" y2="720" />
          <line x1="600" y1="560" x2="760" y2="610" />
          <line x1="760" y1="610" x2="920" y2="660" />
          <line x1="920" y1="660" x2="1080" y2="640" />
          <line x1="1080" y1="640" x2="1160" y2="760" />
          <line x1="500" y1="720" x2="1160" y2="760" />
        </g>
        <g className="topo-bg-nodes" fill="var(--color-text-subtle)">
          <circle cx="100" cy="150" r="3" />
          <circle cx="220" cy="80" r="3" />
          <circle cx="360" cy="60" r="3" />
          <circle cx="520" cy="90" r="3" />
          <circle cx="640" cy="50" r="3" />
          <circle cx="800" cy="110" r="3" />
          <circle cx="950" cy="70" r="3" />
          <circle cx="1100" cy="150" r="3" />
          <circle cx="90" cy="320" r="4" />
          <circle cx="240" cy="260" r="3" />
          <circle cx="380" cy="210" r="3" />
          <circle cx="540" cy="200" r="3" />
          <circle cx="700" cy="180" r="3" />
          <circle cx="860" cy="230" r="3" />
          <circle cx="1020" cy="300" r="4" />
          <circle cx="1180" cy="260" r="3" />
          <circle cx="140" cy="480" r="3" />
          <circle cx="300" cy="420" r="4" />
          <circle cx="460" cy="380" r="3" />
          <circle cx="620" cy="360" r="3" />
          <circle cx="780" cy="400" r="4" />
          <circle cx="940" cy="460" r="3" />
          <circle cx="1100" cy="430" r="3" />
          <circle cx="1180" cy="400" r="3" />
          <circle cx="120" cy="660" r="3" />
          <circle cx="280" cy="600" r="3" />
          <circle cx="440" cy="580" r="3" />
          <circle cx="600" cy="560" r="3" />
          <circle cx="760" cy="610" r="3" />
          <circle cx="920" cy="660" r="3" />
          <circle cx="1080" cy="640" r="3" />
          <circle cx="1160" cy="760" r="3" />
          <circle cx="500" cy="720" r="4" />
          <circle cx="100" cy="800" r="3" />
          <circle cx="700" cy="450" r="5" />
        </g>
      </svg>

      <div className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-5 py-10 sm:px-7">
        <div className="rounded-2xl border border-border-subtle bg-surface p-7 shadow-[var(--shadow-elev)] sm:p-10">
          {/* Brand — centered */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[var(--shadow-warm)]">
              <span className="material-symbols-outlined text-[26px]">hub</span>
            </div>
            <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-text-main">
              {APP_CONFIG.name}
            </h1>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-text-subtle">
              v{APP_CONFIG.versionLabel}
            </p>
          </div>

          {/* Access header — left */}
          <div className="mb-7 text-left">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-subtle">
              {isSsoMode ? "Single sign-on" : "Access control"}
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-text-main">
              Sign in
            </h2>

          </div>

          {/* SSO options */}
          {(samlAvailable || oidcAvailable) && (
            <div className="mb-6 space-y-2.5">
              {samlAvailable && (
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  icon="key"
                  onClick={handleSamlLogin}
                >
                  {samlLoginLabel}
                </Button>
              )}
              {oidcAvailable && (
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  icon="key"
                  onClick={handleOidcLogin}
                >
                  {oidcLoginLabel}
                </Button>
              )}
            </div>
          )}

          {ssoAvailable && passwordAvailable && (
            <div className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-subtle">
              <span className="h-px flex-1 bg-border-subtle" />
              or
              <span className="h-px flex-1 bg-border-subtle" />
            </div>
          )}

          {passwordAvailable && !mustChange && (
            <form onSubmit={handleLogin} className="space-y-5">
              {isSsoEnabled && !ssoAvailable && (
                <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 font-mono text-[11px] text-warning">
                  {activeSsoType === "saml" ? "SAML SSO" : "OIDC"} enabled but
                  configuration incomplete - use password to recover.
                </p>
              )}

              <div>
                <label
                  htmlFor="login-password"
                  className="mb-2 block font-mono text-[11px] uppercase tracking-[0.2em] text-text-main"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={retryAfter > 0}
                    autoFocus={!oidcAvailable}
                    className={cn(
                      "w-full rounded-lg border border-border bg-bg px-3.5 py-3 font-mono text-sm",
                      "focus:outline-none focus:border-text-main focus:ring-1 focus:ring-text-main",
                      "disabled:opacity-50 transition-colors placeholder:text-text-subtle"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex items-center px-3.5 font-mono text-[10px] uppercase tracking-wider text-text-subtle hover:text-text-main focus:text-text-main"
                  >
                    {showPassword ? "hide" : "show"}
                  </button>
                </div>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-text-subtle">
                  default password 123456
                </p>
              </div>

              {error && <p className="font-mono text-[11px] text-danger">{error}</p>}
              {retryAfter > 0 && (
                <p className="font-mono text-[11px] text-warning">
                  Locked · retry in {retryAfter}s
                </p>
              )}
              {resetHint && <p className="font-mono text-[11px] text-text-muted">{resetHint}</p>}

              <Button
                type="submit"
                size="lg"
                fullWidth
                loading={loading}
                disabled={retryAfter > 0}
                className="group rounded-xl font-mono uppercase tracking-[0.18em] shadow-sm hover:shadow-md"
              >
                {retryAfter > 0 ? `Wait ${retryAfter}s` : "Connect"}
                {!loading && (
                  <span className="material-symbols-outlined transition-transform duration-200 group-hover:translate-x-1">
                    arrow_forward
                  </span>
                )}
              </Button>
            </form>
          )}

          {mustChange && (
            <form onSubmit={handleSetNewPassword} className="space-y-5">
              <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 font-mono text-[11px] text-warning">
                Set a new password before remote access is allowed.
              </p>
              <div>
                <label
                  htmlFor="login-new-password"
                  className="mb-2 block font-mono text-[11px] uppercase tracking-[0.2em] text-text-main"
                >
                  New password
                </label>
                <input
                  id="login-new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                  required
                  className={cn(
                    "w-full rounded-lg border border-border bg-bg px-3.5 py-3 font-mono text-sm",
                    "focus:outline-none focus:border-text-main focus:ring-1 focus:ring-text-main",
                    "transition-colors placeholder:text-text-subtle"
                  )}
                />
              </div>
              {error && <p className="font-mono text-[11px] text-danger">{error}</p>}
              <Button
                type="submit"
                size="lg"
                fullWidth
                loading={loading}
                disabled={!newPassword}
              >
                Set password
              </Button>
            </form>
          )}

          {!passwordAvailable && error && (
            <p className="font-mono text-[11px] text-danger">{error}</p>
          )}

          {/* Card footer */}
          <p className="mt-8 border-t border-border-subtle pt-5 text-center font-mono text-[10px] uppercase tracking-[0.15em] text-text-subtle">
            {ssoTitle} · secure local session
          </p>
        </div>
      </div>
    </main>
  );
}
