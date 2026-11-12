import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/driver.js";
import { getApiKeys } from "@/lib/db/repos/apiKeysRepo.js";

export const dynamic = "force-dynamic";

// GET /api/usage/api-keys - per generated key: request/token/cost aggregates
// and per-model breakdown from usageHistory. Quota columns (tokenLimit etc.)
// don't exist in this schema yet, so the report is activity-only until the
// quota feature lands; the shape mirrors it so the page won't need rework.
export async function GET() {
  try {
    const [db, keys] = await Promise.all([getAdapter(), getApiKeys()]);

    const totalsRaw = db.all(
      `SELECT apiKey, COUNT(*) AS requests,
              COALESCE(SUM(promptTokens), 0) AS promptTokens,
              COALESCE(SUM(completionTokens), 0) AS completionTokens,
              COALESCE(SUM(cost), 0) AS cost,
              MAX(timestamp) AS lastUsed
         FROM usageHistory GROUP BY apiKey`
    );
    const totals = {};
    for (const r of totalsRaw) totals[r.apiKey || ""] = r;

    const modelsRaw = db.all(
      `SELECT apiKey, model, COUNT(*) AS requests,
              COALESCE(SUM(promptTokens + completionTokens), 0) AS tokens,
              COALESCE(SUM(cost), 0) AS cost,
              MAX(timestamp) AS lastUsed
         FROM usageHistory GROUP BY apiKey, model
        ORDER BY requests DESC`
    );
    const modelsByKey = {};
    for (const r of modelsRaw) {
      const k = r.apiKey || "";
      (modelsByKey[k] ??= []).push({
        model: r.model || "unknown",
        requests: r.requests,
        tokens: r.tokens,
        cost: r.cost,
        lastUsed: r.lastUsed,
      });
    }

    const statusRaw = db.all(
      `SELECT apiKey, status, COUNT(*) AS count FROM usageHistory GROUP BY apiKey, status`
    );
    const errorsByKey = {};
    for (const r of statusRaw) {
      const k = r.apiKey || "";
      const row = (errorsByKey[k] ??= { ok: 0, errors: 0 });
      const s = String(r.status || "ok").toLowerCase();
      if (s === "ok" || s === "success") row.ok += r.count;
      else row.errors += r.count;
    }

    const maskKey = (key) => {
      if (!key || typeof key !== "string") return "";
      return key.length <= 12 ? key.slice(0, 4) + "***" : key.slice(0, 8) + "***" + key.slice(-4);
    };
    const nameByKey = {};
    for (const k of keys) nameByKey[k.key] = k.name;

    const result = keys.map((k) => {
      const t = totals[k.key] || {};
      const st = errorsByKey[k.key] || { ok: 0, errors: 0 };
      return {
        id: k.id,
        name: k.name || maskKey(k.key),
        keyMasked: maskKey(k.key),
        isActive: k.isActive,
        createdAt: k.createdAt,
        requests: t.requests || 0,
        promptTokens: t.promptTokens || 0,
        completionTokens: t.completionTokens || 0,
        totalTokens: (t.promptTokens || 0) + (t.completionTokens || 0),
        cost: t.cost || 0,
        lastUsed: t.lastUsed || null,
        okRequests: st.ok,
        errorRequests: st.errors,
        errorRate: st.ok + st.errors > 0 ? st.errors / (st.ok + st.errors) : 0,
        models: (modelsByKey[k.key] || []).slice(0, 8),
      };
    });

    // Orphan usage: history rows for keys no longer registered.
    const known = new Set(keys.map((k) => k.key));
    const orphans = Object.keys(totals).filter((raw) => raw && !known.has(raw));
    if (orphans.length > 0) {
      let requests = 0, promptTokens = 0, completionTokens = 0, cost = 0, lastUsed = null, ok = 0, errors = 0;
      const modelsMap = new Map();
      for (const raw of orphans) {
        const t = totals[raw];
        requests += t.requests || 0;
        promptTokens += t.promptTokens || 0;
        completionTokens += t.completionTokens || 0;
        cost += t.cost || 0;
        if (t.lastUsed && (!lastUsed || t.lastUsed > lastUsed)) lastUsed = t.lastUsed;
        const st = errorsByKey[raw] || { ok: 0, errors: 0 };
        ok += st.ok;
        errors += st.errors;
        for (const m of modelsByKey[raw] || []) {
          const prev = modelsMap.get(m.model) || { model: m.model, requests: 0, tokens: 0, cost: 0, lastUsed: null };
          prev.requests += m.requests;
          prev.tokens += m.tokens;
          prev.cost += m.cost;
          if (!prev.lastUsed || m.lastUsed > prev.lastUsed) prev.lastUsed = m.lastUsed;
          modelsMap.set(m.model, prev);
        }
      }
      result.push({
        id: "deleted",
        name: "Deleted keys",
        keyMasked: "",
        isActive: false,
        createdAt: null,
        requests,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        cost,
        lastUsed,
        okRequests: ok,
        errorRequests: errors,
        errorRate: ok + errors > 0 ? errors / (ok + errors) : 0,
        models: [...modelsMap.values()].sort((a, b) => b.requests - a.requests).slice(0, 8),
      });
    }

    result.sort((a, b) => (b.lastUsed || "").localeCompare(a.lastUsed || "") || (a.name || "").localeCompare(b.name || ""));

    return NextResponse.json({
      keys: result,
      generatedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.log("Error aggregating per-key usage:", error);
    return NextResponse.json({ error: error?.message || "Failed to load per-key usage" }, { status: 500 });
  }
}
