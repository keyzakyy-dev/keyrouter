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
 * GLM Coding Plan usage (international + China regions)
 */
export async function getGlmUsage(apiKey, provider, proxyOptions = null, providerSpecificData = null) {
  if (!apiKey) {
    return { message: "GLM API key not available." };
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
      if (response.status === 401) {
        // API key invalid — try Start Plan balance if we have a JWT.
        return await startPlanFallback(providerSpecificData, proxyOptions)
          || { message: "GLM API key invalid or expired." };
      }
      return { message: `GLM quota API error (${response.status}).` };
    }

    const json = await response.json();

    // Coding-plan endpoint returns 200 with code 500 when no plan exists.
    if (json?.code && json.code !== 0 && json.code !== 200) {
      return await startPlanFallback(providerSpecificData, proxyOptions)
        || { message: json.msg || `GLM quota unavailable (code ${json.code}).` };
    }

    const { plan, quotas } = parseGlmQuotaResponse(json);
    return { plan, quotas };
  } catch (error) {
    return await startPlanFallback(providerSpecificData, proxyOptions)
      || { message: `GLM error: ${error.message}` };
  }
}

// ---------------------------------------------------------------------------
// ZCode Start Plan balance (free lane: zcode.z.ai)
// ---------------------------------------------------------------------------

const ZCODE_BALANCE_URL = "https://zcode.z.ai/api/v1/zcode-plan/billing/balance";
const ZCODE_APP_VERSION = "3.16.3";

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
  const quotas = {};

  const activePlan = plans.find((p) => String(p?.status || "").toLowerCase() === "active") || plans[0];
  if (!activePlan && balances.length === 0) return { plan: "No Plan", quotas: {} };

  for (const balance of balances) {
    const total = Number(balance?.total_units);
    const used = Number(balance?.used_units);
    if (!Number.isFinite(total) && !Number.isFinite(used)) continue;

    const models = (Array.isArray(balance?.capabilities) ? balance.capabilities : [])
      .map((c) => String(c).trim())
      .filter((c) => c.toLowerCase().startsWith("model:"))
      .map((c) => c.slice(6).trim());
    const name = balance?.show_name || models.join(", ") || "Quota";

    const remaining = Number.isFinite(total) && Number.isFinite(used)
      ? Math.max(0, total - used) : 0;
    const remainingPct = total > 0 ? Math.round((remaining / total) * 100) : 0;

    const expiresAt = Number(balance?.expires_at);

    quotas[name] = {
      used: Number.isFinite(used) ? used : 0,
      total: Number.isFinite(total) ? total : 0,
      remaining,
      remainingPercentage: remainingPct,
      resetAt: Number.isFinite(expiresAt) && expiresAt > 0
        ? new Date(expiresAt * 1000).toISOString() : null,
      unlimited: false,
    };
  }

  const planName = activePlan?.name || "ZCode Start Plan";
  return { plan: planName, quotas };
}

async function getZcodeStartPlanUsage(zcodeJwtToken, providerSpecificData, proxyOptions = null) {
  if (!zcodeJwtToken) return null;
  const mid = stableDeviceMid(providerSpecificData);
  try {
    const response = await proxyAwareFetch(
      `${ZCODE_BALANCE_URL}?app_version=${ZCODE_APP_VERSION}`,
      {
        headers: {
          Authorization: `Bearer ${zcodeJwtToken}`,
          "X-Device-Mid": mid,
          Accept: "application/json",
        },
      },
      proxyOptions,
    );
    if (!response.ok) return null;
    const json = await response.json();
    if (json?.code && json.code !== 0) return null;
    return parseZcodeStartPlanBalance(json);
  } catch {
    return null;
  }
}

/** Try the Start Plan balance when the coding-plan endpoint fails. */
async function startPlanFallback(providerSpecificData, proxyOptions) {
  const jwt = providerSpecificData?.zcodeJwtToken;
  if (!jwt) return null;
  return getZcodeStartPlanUsage(jwt, providerSpecificData, proxyOptions);
}
