/**
 * GLM Coding Plan + ZCode Start Plan usage (international + China regions)
 */

import { createHash } from "node:crypto";
import { proxyAwareFetch } from "../../utils/proxyFetch.js";
import { U } from "./shared.js";

// GLM quota endpoints (region-aware) — url from registry transport.usage
const GLM_QUOTA_URLS = {
  international: U("glm").url,
  china: U("glm-cn").url,
};

/**
 * Parse the GLM quota API response — shared by pasted API keys and
 * OAuth-minted coding-plan keys (both hit the same monitor endpoint).
 * Supports both TOKENS_LIMIT and CREDIT_LIMIT and dynamic intervals (e.g. session 5h, weekly 7d).
 */
export function parseGlmQuotaResponse(json) {
  const data = json?.data && typeof json.data === "object" ? json.data : {};
  const limits = Array.isArray(data.limits) ? data.limits : [];
  const quotas = {};

  for (const limit of limits) {
    // 1. Accept both TOKENS_LIMIT and CREDIT_LIMIT from GLM API
    if (!limit || (limit.type !== "TOKENS_LIMIT" && limit.type !== "CREDIT_LIMIT")) continue;
    const usedPercent = Number(limit.percentage) || 0;
    const resetMs = Number(limit.nextResetTime) || 0;
    const remaining = Math.max(0, 100 - usedPercent);

    // 2. Map key dynamically based on type and period (unit) to avoid overwriting
    let key = "session";
    if (limit.unit === 3) {
      key = `Session (${limit.number}h)`;
    } else if (limit.unit === 6) {
      key = "Weekly (7d)";
    } else if (limit.type === "TOKENS_LIMIT") {
      key = "Tokens";
    } else {
      key = `Limit (${limit.number})`;
    }

    quotas[key] = {
      used: usedPercent,
      total: 100,
      remaining,
      remainingPercentage: remaining,
      resetAt: resetMs > 0 ? new Date(resetMs).toISOString() : null,
      unlimited: false,
    };
  }

  const levelRaw = typeof data.level === "string" ? data.level : "";
  const plan = levelRaw
    ? levelRaw.charAt(0).toUpperCase() + levelRaw.slice(1).toLowerCase()
    : "Unknown";

  return { plan, quotas };
}

/**
 * GLM Coding Plan usage (international + China regions).
 *
 * OAuth connections carry a ZCode JWT: the balance gateway (zcode.z.ai)
 * reports both the plan validity and the Start Plan windows and — unlike the
 * coding-plan monitor endpoint — also answers for free accounts. Try it
 * first; the monitor endpoint stays as the fallback for pasted API keys.
 */
export async function getGlmUsage(apiKey, provider, proxyOptions = null, providerSpecificData = null) {
  const jwt = providerSpecificData?.zcodeJwtToken;
  let startPlanError = null;

  if (jwt) {
    const start = await getZcodeStartPlanUsage(jwt, providerSpecificData, proxyOptions);
    if (start.usage) return start.usage;
    startPlanError = start.error;
  }

  if (!apiKey) {
    return { message: startPlanError || "GLM API key not available." };
  }

  const region = provider === "glm-cn" ? "china" : "international";
  const quotaUrl = GLM_QUOTA_URLS[region];

  try {
    const response = await proxyAwareFetch(
      quotaUrl,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      },
      proxyOptions,
    );

    if (!response.ok) {
      return { message: `GLM quota API error (${response.status}).` };
    }

    const json = await response.json();

    // Coding-plan endpoint returns 200 with code 500 when no plan exists.
    if (json?.code && json.code !== 0 && json.code !== 200) {
      return { message: json.msg || `GLM quota unavailable (code ${json.code}).` };
    }

    const { plan, quotas } = parseGlmQuotaResponse(json);
    return { plan, quotas };
  } catch (error) {
    return { message: startPlanError || `GLM error: ${error.message}` };
  }
}

// ---------------------------------------------------------------------------
// ZCode Start Plan balance (free lane: zcode.z.ai)
// ---------------------------------------------------------------------------

const ZCODE_BALANCE_URL = "https://zcode.z.ai/api/v1/zcode-plan/billing/balance";
const ZCODE_APP_VERSION = "3.17.1";

function stableDeviceMid(providerSpecificData) {
  const seed = String(providerSpecificData?.userId || "zcode");
  const bytes = createHash("sha256").update(seed).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Parse the ZCode Start Plan billing/balance response into the same
 * { plan, quotas } shape the dashboard expects.
 */
export function parseZcodeStartPlanBalance(json) {
  const data = json?.data && typeof json.data === "object" ? json.data : {};
  const plans = Array.isArray(data.plans) ? data.plans : [];
  const balances = Array.isArray(data.balances) ? data.balances : [];

  // Empty response = nothing known about this account; the caller surfaces a
  // message instead of inventing quota rows.
  if (plans.length === 0 && balances.length === 0) return null;

  const quotas = {};

  // Active plan → one validity row: a hard expiry (recurring:false), so the UI
  // words it "expires in …". used/total stay 0/∞ — the row is about time left,
  // not consumption (remaining 100 keeps the row green while it's valid).
  const activePlan = plans.find((p) => String(p?.status || "").toLowerCase() === "active");
  if (activePlan) {
    const endsAt = Number(activePlan?.ends_at);
    quotas[activePlan?.name || "Plan"] = {
      used: 0,
      total: 0,
      remaining: 100,
      remainingPercentage: 100,
      resetAt: endsAt > 0 ? new Date(endsAt * 1000).toISOString() : null,
      unlimited: false,
      recurring: false,
    };
  }

  // Balance windows recur each period; resetAt is period_end (expires_at is
  // the grant's own shelf life, not the refresh point). Multiple grants can
  // share a show_name — sum their units.
  const grouped = new Map();
  for (const balance of balances) {
    const total = Number(balance?.total_units);
    const used = Number(balance?.used_units);
    if (!Number.isFinite(total) && !Number.isFinite(used)) continue;

    const models = (Array.isArray(balance?.capabilities) ? balance.capabilities : [])
      .map((c) => String(c).trim())
      .filter((c) => c.toLowerCase().startsWith("model:"))
      .map((c) => c.slice(6).trim());
    const name = balance?.show_name || models.join(", ") || "Quota";

    const entry = grouped.get(name) || { total: 0, used: 0, periodEnd: 0 };
    entry.total += Number.isFinite(total) ? total : 0;
    entry.used += Number.isFinite(used) ? used : 0;
    const periodEnd = Number(balance?.period_end);
    if (Number.isFinite(periodEnd) && periodEnd > entry.periodEnd) entry.periodEnd = periodEnd;
    grouped.set(name, entry);
  }

  for (const [name, g] of grouped) {
    const remainingPct = g.total > 0 ? Math.round((Math.max(0, g.total - g.used) / g.total) * 100) : 0;
    quotas[name] = {
      used: g.used,
      total: g.total,
      remaining: remainingPct,
      remainingPercentage: remainingPct,
      resetAt: g.periodEnd > 0 ? new Date(g.periodEnd * 1000).toISOString() : null,
      unlimited: false,
      recurring: true,
    };
  }

  if (Object.keys(quotas).length === 0) return null;

  return { plan: activePlan?.name || "ZCode Start Plan", quotas };
}

async function getZcodeStartPlanUsage(zcodeJwtToken, providerSpecificData, proxyOptions = null) {
  if (!zcodeJwtToken) return { usage: null, error: null };
  const mid = stableDeviceMid(providerSpecificData);
  try {
    const response = await proxyAwareFetch(
      `${ZCODE_BALANCE_URL}?app_version=${ZCODE_APP_VERSION}`,
      {
        headers: {
          Authorization: `Bearer ${zcodeJwtToken}`,
          "X-Device-Mid": mid,
          "X-Platform": "win32-x64",
          "X-ZCode-App-Version": ZCODE_APP_VERSION,
          Accept: "application/json",
        },
      },
      proxyOptions,
    );
    if (!response.ok) return { usage: null, error: `ZCode balance API error (${response.status}).` };
    const json = await response.json();
    if (json?.code && json.code !== 0 && json.code !== 200) {
      return { usage: null, error: json.msg || `ZCode balance unavailable (code ${json.code}).` };
    }
    return { usage: parseZcodeStartPlanBalance(json), error: null };
  } catch (error) {
    return { usage: null, error: `ZCode balance error: ${error.message}` };
  }
}
