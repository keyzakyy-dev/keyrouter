"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/shared/components";
import { APP_CONFIG } from "@/shared/constants/config";
import { cn } from "@/shared/utils/cn";
import {
  Boxes,
  ChevronLeft,
  Eye,
  EyeOff,
  Lock,
  BadgeCheck,
  Fingerprint,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Animated floating paths (background art for the left panel)        */
/* ------------------------------------------------------------------ */
function FloatingPaths({ position }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    color: `rgba(15,23,42,${0.1 + i * 0.03})`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        className="h-full w-full text-slate-400/70 dark:text-white/60"
        viewBox="0 0 696 316"
        fill="none"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.03}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
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
  const pageTitle = isSsoMode ? "Single sign-on" : "Sign in";

  if (hasPassword === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="inline-block h-4 w-4 rounded-full border-2 border-brand-500/40 border-t-brand-500 animate-spin" />
          Checking dashboard access…
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen lg:h-screen lg:overflow-hidden lg:grid lg:grid-cols-2 bg-bg">
      {/* ── Left brand panel (desktop) ── */}
      <div className="relative hidden h-full flex-col border-r border-border-subtle p-10 lg:flex bg-gradient-to-b from-surface/80 to-surface/30">
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="flex items-center justify-center size-9 rounded-[10px] bg-gradient-to-br from-brand-500 to-brand-700 shadow-[var(--shadow-warm)] text-white">
            <Boxes className="size-5" />
          </div>
          <p className="text-lg font-bold tracking-tight text-text-main">
            {APP_CONFIG.name}
          </p>
        </div>

        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
        <div className="from-background absolute inset-0 z-10 bg-gradient-to-t via-transparent to-transparent" />

        <div className="relative z-10 mt-auto max-w-sm">
          <blockquote className="space-y-3">
            <p className="text-xl font-medium leading-snug text-text-main">
              &ldquo;One local endpoint talking to forty-plus providers. I
              stopped juggling API keys and quota pages entirely.&rdquo;
            </p>
            <footer className="font-mono text-xs text-text-muted">
              — KeyRouter user
            </footer>
          </blockquote>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="relative flex min-h-screen flex-col justify-center p-4 sm:p-6 lg:p-10">
        {/* Ambient radial glows */}
        <div
          aria-hidden
          className="absolute inset-0 isolate contain-strict -z-10 opacity-70"
        >
          <div className="absolute top-0 right-0 h-[320px] w-[560px] -translate-y-[87.5%] translate-x-[30%] rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,rgba(229,106,74,0.14)_0,rgba(0,0,0,0)_80%)]" />
          <div className="absolute top-0 right-0 h-[320px] w-[240px] translate-x-[5%] -translate-y-[50%] rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(229,106,74,0.08)_0,rgba(0,0,0,0)_100%)]" />
        </div>

        <Button
          variant="ghost"
          className="absolute top-7 left-5"
          onClick={() => (window.location.href = "/")}
        >
          <ChevronLeft className="size-4 me-2" />
          Home
        </Button>

        <div className="mx-auto w-full max-w-sm space-y-5">
          {/* Mobile brand */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex items-center justify-center size-8 rounded-[10px] bg-gradient-to-br from-brand-500 to-brand-700 text-white">
              <Boxes className="size-4" />
            </div>
            <p className="text-lg font-bold tracking-tight text-text-main">
              {APP_CONFIG.name}
            </p>
          </div>

          <div className="flex flex-col space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-text-main">
              {pageTitle}
            </h1>
            <p className="text-sm text-text-muted">
              {isSsoMode
                ? "Securely access your KeyRouter control room."
                : "Enter your dashboard password to continue."}
            </p>
          </div>

          {/* SSO buttons */}
          <div className="space-y-2.5">
            {samlAvailable && (
              <Button type="button" size="lg" variant="outline" className="w-full" onClick={handleSamlLogin}>
                <Fingerprint className="size-4 me-2 text-brand-600" />
                {samlLoginLabel}
              </Button>
            )}
            {oidcAvailable && (
              <Button type="button" size="lg" variant="outline" className="w-full" onClick={handleOidcLogin}>
                <BadgeCheck className="size-4 me-2 text-brand-600" />
                {oidcLoginLabel}
              </Button>
            )}
          </div>

          {ssoAvailable && passwordAvailable && (
            <div className="flex w-full items-center justify-center gap-3">
              <div className="h-px w-full bg-border" />
              <span className="px-2 text-xs text-text-subtle">OR</span>
              <div className="h-px w-full bg-border" />
            </div>
          )}

          {passwordAvailable && !mustChange && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              {isSsoEnabled && !ssoAvailable && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {activeSsoType === "saml" ? "SAML SSO" : "OIDC"} is enabled, but the configuration
                  is incomplete. Password login is still available for recovery.
                </p>
              )}
              {authMode === "both" && ssoAvailable && (
                <p className="text-xs text-text-muted">
                  Password and {activeSsoType === "saml" ? "SAML SSO" : "OIDC"} login are both enabled.
                </p>
              )}

              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-sm font-medium text-text-main">
                  Password
                </label>
                <span className="text-xs text-text-subtle">
                  default is <code className="bg-sidebar px-1.5 py-0.5 rounded-md text-[10px]">123456</code>
                </span>
              </div>

              <div className="relative h-max">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your dashboard password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus={!oidcAvailable}
                  disabled={retryAfter > 0}
                  className={cn(
                    "peer w-full h-11 rounded-[10px] border border-border bg-surface-2 px-3.5 text-sm text-text-main",
                    "pl-10 pr-10 placeholder:text-text-muted/60",
                    "focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50",
                    "text-[16px] sm:text-sm transition-all duration-150 disabled:opacity-50"
                  )}
                />
                <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5 text-text-muted peer-disabled:opacity-50">
                  <Lock className="size-4" aria-hidden="true" />
                </div>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 end-0 flex items-center justify-center pe-3.5 text-text-muted hover:text-text-main transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>

              {error && (
                <p className="flex items-center gap-1.5 text-xs text-red-500">{error}</p>
              )}
              {retryAfter > 0 && (
                <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                  Locked. Retry in <span className="font-mono">{retryAfter}s</span>.
                </p>
              )}
              {resetHint && (
                <p className="text-xs text-text-muted">
                  Forgot password? Open <code className="bg-sidebar px-1.5 py-0.5 rounded-md">keyrouter</code>{" "}
                  CLI on the host → <b>Settings</b> → <b>Reset Password to Default</b>.
                </p>
              )}
              {hasPassword === false && (
                <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                  No password set yet — you'll set one when logging in remotely.
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={loading}
                disabled={retryAfter > 0}
                iconRight={retryAfter > 0 ? undefined : "arrow_forward"}
              >
                {retryAfter > 0 ? `Wait ${retryAfter}s` : "Sign in"}
              </Button>
            </form>
          )}

          {mustChange && (
            <form onSubmit={handleSetNewPassword} className="space-y-3.5">
              <div className="rounded-[10px] border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-[13px] text-amber-700 dark:text-amber-300">
                Set a new password before accessing the dashboard remotely.
              </div>
              <div className="relative h-max">
                <input
                  id="login-new-password"
                  type="password"
                  placeholder="Enter a new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                  className={cn(
                    "peer w-full h-11 rounded-[10px] border border-border bg-surface-2 px-3.5 text-sm text-text-main",
                    "pl-10 placeholder:text-text-muted/60",
                    "focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50",
                    "text-[16px] sm:text-sm transition-all duration-150"
                  )}
                />
                <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3.5 text-text-muted">
                  <Lock className="size-4" aria-hidden="true" />
                </div>
              </div>
              {error && (
                <p className="flex items-center gap-1.5 text-xs text-red-500">{error}</p>
              )}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={loading}
                disabled={!newPassword}
              >
                Set password
              </Button>
            </form>
          )}

          {!passwordAvailable && error && <p className="text-xs text-red-500">{error}</p>}

          <p className="pt-1 text-center text-[11px] text-text-subtle">
            {ssoTitle} · {APP_CONFIG.name} v{APP_CONFIG.version}
          </p>
        </div>
      </div>
    </main>
  );
}
