"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Card from "@/shared/components/Card";
import Button from "@/shared/components/Button";
import Toggle from "@/shared/components/Toggle";
import Select from "@/shared/components/Select";
import ModelSelectModal from "@/shared/components/ModelSelectModal";
import { ConfirmModal } from "@/shared/components/Modal";
import { translate } from "@/i18n/runtime";
import { nodePrefixById, displayBacking } from "@/shared/utils/friendlyBacking";
import { InjectionTester } from "./InjectExtras";

const API = "/api/prompt-injection";

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

function entryText(entry) {
  if (!entry) return "";
  if (entry.mode === "chat") return (entry.turns || []).map((t) => t.content).join("\n");
  return entry.content || "";
}

function nextRole(turns) {
  if (!turns.length) return "user";
  return turns[turns.length - 1].role === "user" ? "assistant" : "user";
}

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[13px] text-text-main placeholder:text-text-muted focus:outline-none focus:border-text-subtle transition-colors";
const MONO_KICKER = "text-[11px] text-text-subtle";

// ─── shared editor ──────────────────────────────────────────────────────
function InjectEditor({ initial, onSave, onClear, saving, clearLabel, compact = false }) {
  const [mode, setMode] = useState(initial?.mode || "single");
  const [content, setContent] = useState(initial?.content || "");
  const [turns, setTurns] = useState(
    initial?.mode === "chat" && initial.turns?.length
      ? initial.turns
      : [
          { role: "user", content: "" },
          { role: "assistant", content: "" },
        ]
  );
  const [position, setPosition] = useState(initial?.position || "append");
  const [enabled, setEnabled] = useState(initial?.enabled !== false);

  useEffect(() => {
    setMode(initial?.mode || "single");
    setContent(initial?.content || "");
    if (initial?.mode === "chat" && initial.turns?.length) setTurns(initial.turns);
    setPosition(initial?.position || "append");
    setEnabled(initial?.enabled !== false);
  }, [initial]);

  const setTurn = (i, value) =>
    setTurns((ts) => ts.map((t, j) => (j === i ? { ...t, content: value } : t)));
  const removeTurn = (i) => setTurns((ts) => ts.filter((_, j) => j !== i));
  const addTurn = () => setTurns((ts) => [...ts, { role: nextRole(ts), content: "" }]);

  const text = mode === "chat" ? turns.map((t) => t.content).join("\n") : content;

  const save = () => {
    const isEmpty = mode === "chat" ? turns.every((t) => !t.content.trim()) : !content.trim();
    const payload =
      mode === "chat"
        ? {
            mode: "chat",
            turns: turns.filter((t) => t.content.trim()).map((t) => ({ role: t.role, content: t.content.trim() })),
            position,
            enabled,
          }
        : { mode: "single", content: content.trim(), position, enabled };
    onSave(payload, isEmpty);
  };

  const modeTab = (value, label) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      className={`shrink-0 rounded-full px-3 py-1 font-display text-xs font-medium transition-colors ${
        mode === value ? "bg-surface text-text-main" : "text-text-muted hover:text-text-main"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1 rounded-full bg-surface-2 p-1">
          {modeTab("single", "System prompt")}
          {modeTab("chat", "Chat script")}
        </div>

        {mode === "single" && (
          <div className="flex items-center gap-2">
            <span className={MONO_KICKER}>Position</span>
            <Select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              options={[
                { value: "prepend", label: "Prepend" },
                { value: "append", label: "Append" },
              ]}
              className="w-32"
              selectClassName="!py-1.5 !text-xs !rounded-lg"
            />
          </div>
        )}

        <Toggle checked={enabled} onChange={setEnabled} size="sm" label="Enabled" />

        <div className="ml-auto flex items-center gap-2">
          <span className={`${MONO_KICKER} tabular-nums`}>{estimateTokens(text)} tok</span>
        </div>
      </div>

      {mode === "chat" ? (
        <div className="space-y-2">
          {turns.map((t, i) => (
            <div key={i} className="group flex items-start gap-2">
              <span
                className={`mt-1.5 inline-flex h-6 w-20 shrink-0 items-center justify-center gap-1.5 rounded-full font-display text-[11px] font-medium ${
                  t.role === "user"
                    ? "bg-primary/10 text-primary"
                    : "bg-surface-2 text-text-muted"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    t.role === "user" ? "bg-primary" : "bg-text-subtle/60"
                  }`}
                  aria-hidden="true"
                />
                {t.role}
              </span>
              <textarea
                value={t.content}
                onChange={(e) => setTurn(i, e.target.value)}
                rows={2}
                placeholder={t.role === "user" ? "User turn…" : "Assistant turn…"}
                className={`${INPUT_CLASS} resize-y ${compact ? "!py-1.5" : ""}`}
              />
              <button
                type="button"
                onClick={() => removeTurn(i)}
                className="mt-1.5 shrink-0 rounded-md p-0.5 text-text-subtle opacity-0 transition-all hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                title="Remove turn"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addTurn}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-xs font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text-main"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add {nextRole(turns)} turn
          </button>
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={compact ? 3 : 5}
          placeholder="System prompt text…"
          className={`${INPUT_CLASS} resize-y font-mono text-[13px] leading-relaxed`}
        />
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" variant="primary" icon="check" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {onClear && (
          <Button size="sm" variant="outline" icon="delete" onClick={onClear}>
            {clearLabel || "Clear"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── custom dropdown (matches providers' StatusFilterDropdown) ───────────
function InjSelect({ label, value, onChange, options = [], placeholder = "Select…" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="flex flex-col gap-1.5" ref={ref}>
      {label && (
        <label className="font-display text-sm font-medium text-text-main">{label}</label>
      )}
      <div className="relative w-full">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 text-left text-sm text-text-main outline-none transition-colors hover:border-text-subtle focus-visible:ring-2 focus-visible:ring-text-subtle/60"
        >
          <span className="flex-1 truncate font-display">{selected?.label || placeholder}</span>
          <span className={`material-symbols-outlined text-[16px] text-text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`}>
            expand_more
          </span>
        </button>

        {open && (
          <div
            role="listbox"
            className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-[var(--shadow-elevated)]"
          >
            {options.length === 0 ? (
              <div className="px-3 py-2 font-display text-sm text-text-muted">No options.</div>
            ) : (
              options.map((option) => {
                const active = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      active ? "bg-surface-2 text-text-main" : "text-text-muted hover:text-text-main"
                    }`}
                  >
                    <span className="flex-1 truncate font-display">{option.label}</span>
                    {active && (
                      <span className="material-symbols-outlined text-[18px] text-text-main">check</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── section shell ──────────────────────────────────────────────────────
function SectionCard({ title, subtitle, icon, children }) {
  return (
    <Card padding="sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <span className="material-symbols-outlined text-[20px] text-primary">{icon}</span>
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-sm font-semibold text-text-main">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[11px] uppercase tracking-wider text-text-subtle">{subtitle}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

// ─── page ───────────────────────────────────────────────────────────────
export default function PromptInjectionClient() {
  const [data, setData] = useState(null);
  const [keys, setKeys] = useState([]);
  const [models, setModels] = useState([]);
  const [status, setStatus] = useState("Loading…");
  const [error, setError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const [nodePrefixes, setNodePrefixes] = useState({});

  // selection state
  const [keySel, setKeySel] = useState("");

  // variant state
  const [variantName, setVariantName] = useState("");
  const [variantModel, setVariantModel] = useState("");
  const [activeVariant, setActiveVariant] = useState(null); // entry for selected variant
  const [showModelSelect, setShowModelSelect] = useState(false);

  // saving flags
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [injRes, keysRes, modelsRes, nodesRes] = await Promise.all([
        fetch(API, { cache: "no-store" }),
        fetch("/api/keys", { cache: "no-store" }),
        fetch("/api/models", { cache: "no-store" }),
        fetch("/api/provider-nodes", { cache: "no-store" }),
      ]);
      const inj = await injRes.json();
      const kd = await keysRes.json();
      const md = await modelsRes.json();
      const nd = await nodesRes.json().catch(() => ({ nodes: [] }));
      setNodePrefixes(nodePrefixById(nd?.nodes || []));
      setData({
        global: inj.global || null,
        userPrompts: inj.userPrompts || {},
        prompts: inj.prompts || {},
        keyModelPrompts: inj.keyModelPrompts || {},
        variants: inj.variants || {},
        templates: inj.templates || [],
      });
      setKeys(Array.isArray(kd.keys) ? kd.keys : []);
      const modelList = Array.isArray(md.models) ? md.models : [];
      setModels(
        modelList.map((m) => ({
          value: m.fullModel || m.routedModel || m.id || String(m.model || ""),
          label: m.name || m.fullModel || m.id || String(m.model || ""),
        }))
      );
      setError(null);
      setStatus("Ready");
    } catch (e) {
      setError("Failed to load prompt injection data.");
      setStatus("Error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveInjection = async (payload, whenEmpty, coordinate) => {
    setSaving(true);
    try {
      const res = await fetch(API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, ...coordinate }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Failed to save.");
        return;
      }
      setError(null);
      await load();
    } catch {
      setError("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const clearInjection = async (coordinate) => {
    setSaving(true);
    try {
      const qs = Object.entries(coordinate)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("&");
      await fetch(`${API}?${qs}`, { method: "DELETE" });
      setError(null);
      await load();
    } catch {
      setError("Failed to delete.");
    } finally {
      setSaving(false);
    }
  };

  const clearGlobal = async () => {
    setSaving(true);
    try {
      await fetch(API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ global: null }),
      });
      setError(null);
      await load();
    } catch {
      setError("Failed to delete global injection.");
    } finally {
      setSaving(false);
    }
  };

  const saveVariant = async (payload, whenEmpty) => {
    if (!variantName.trim() || !variantModel) {
      setError("Variant needs a custom name and a backing model.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant: { name: variantName.trim(), model: variantModel, ...payload },
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Failed to save variant.");
        return;
      }
      setError(null);
      await load();
      setVariantName("");
      setVariantModel("");
      setActiveVariant(null);
    } catch {
      setError("Failed to save variant.");
    } finally {
      setSaving(false);
    }
  };

  const deleteVariant = (name = variantName) => {
    const target = String(name || "").trim();
    if (!target) return;
    setPendingDelete(target);
  };

  const confirmDeleteVariant = async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    setSaving(true);
    try {
      await fetch(`${API}?variant=${encodeURIComponent(target)}`, { method: "DELETE" });
      setError(null);
      if (target === variantName) {
        setVariantName("");
        setVariantModel("");
        setActiveVariant(null);
      }
      await load();
    } catch {
      setError("Failed to delete variant.");
    } finally {
      setSaving(false);
    }
  };

  const selectVariant = (name) => {
    const v = data?.variants?.[name];
    setVariantName(name);
    setVariantModel(v?.model || "");
    setActiveVariant(v || null);
  };

  const globalEntry = data?.global || null;

  const selectedKeyEntry = keySel && data?.userPrompts?.[keySel] ? data.userPrompts[keySel] : null;

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text-main">Prompt Injection</h1>
        <p className="text-xs text-text-subtle">
          Inject a system prompt or a scripted chat - globally, per API key, or per variant.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-xs text-danger">
          <span className="material-symbols-outlined text-[15px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Row 1: Global — full width */}
      <SectionCard title="Global" icon="public" subtitle="Applied to every chat request.">
        <InjectEditor
          initial={globalEntry}
          onSave={(p, empty) => saveInjection(p, empty, { global: p })}
          onClear={clearGlobal}
          saving={saving}
          clearLabel="Hapus"
        />
      </SectionCard>

      {/* Row 2: Per API key + Variants — matched heights */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <SectionCard
          title="Per API Key"
          icon="vpn_key"
          subtitle="Persona for anyone holding that key."
        >
          <InjSelect
            label="API Key"
            value={keySel}
            onChange={setKeySel}
            placeholder={translate("Select API key…")}
            options={keys.map((k) => ({ value: k.id, label: k.name || k.id.slice(0, 8) }))}
          />
          {keySel ? (
            <div className="mt-4">
              <InjectEditor
                key={keySel}
                initial={selectedKeyEntry}
                onSave={(p, empty) => saveInjection(p, empty, { keyId: keySel })}
                onClear={() => clearInjection({ keyId: keySel })}
                saving={saving}
                clearLabel="Delete"
                compact
              />
            </div>
          ) : (
            <p className="mt-3 text-xs text-text-subtle">
              Select a key to edit the prompt injected into its requests.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Variants"
          icon="badge"
          subtitle="Custom name → backing model + prompt."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] text-text-subtle">
                Custom name
              </label>
              <input
                value={variantName}
                onChange={(e) => setVariantName(e.target.value)}
                placeholder="e.g. dahlunce"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-text-subtle">
                Backing model
              </label>
              <button
                type="button"
                onClick={() => setShowModelSelect(true)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm text-text-main transition-colors hover:border-text-subtle cursor-pointer"
              >
                <span className={`truncate ${variantModel ? "" : "text-text-muted"}`}>
                  {variantModel || "Select model…"}
                </span>
                <span className="material-symbols-outlined text-[18px] shrink-0 text-text-muted">
                  {variantModel ? "edit" : "add"}
                </span>
              </button>
            </div>
          </div>
          {variantName.trim() && variantModel ? (
            <div className="mt-4">
              <InjectEditor
                key={variantName}
                initial={activeVariant}
                onSave={(p, empty) => saveVariant(p, empty)}
                onClear={() => deleteVariant()}
                saving={saving}
                clearLabel="Delete variant"
                compact
              />
            </div>
          ) : null}

          <div className="mt-4 border-t border-border-subtle pt-3">
            {Object.keys(data?.variants || {}).length === 0 ? (
              <p className="text-xs text-text-subtle">
                No variants yet - pick a name and a backing model above.
              </p>
            ) : (
              <div className="space-y-1">
                {Object.entries(data?.variants || {})
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([name, v]) => {
                    const active = name === variantName;
                    return (
                      <div
                        key={name}
                        className={`group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors ${
                          active ? "bg-surface-2" : "hover:bg-surface-2/60"
                        }`}
                      >
                        <span
                          className={`size-1.5 shrink-0 rounded-full ${active ? "bg-primary" : "bg-text-subtle/40"}`}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-sm font-medium text-text-main">{name}</p>
                          <p className="truncate font-mono text-[11px] text-text-subtle">
                            {displayBacking(v?.model || "", nodePrefixes)}
                          </p>
                        </div>
                        <Button size="xs" className="font-display" variant={active ? "primary" : "ghost"} onClick={() => selectVariant(name)}>
                          {active ? "Editing" : "Select"}
                        </Button>
                        <Button size="xs" className="font-display" variant="ghost" icon="delete" onClick={() => deleteVariant(name)}>
                          Delete
                        </Button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Row 3: Injection tester — full width */}
      <SectionCard
        title="Injection tester"
        icon="science"
        subtitle="Send a real request through the router and read the verdict — the injection is applied."
      >
        <InjectionTester />
      </SectionCard>

      {/* Status */}
      <p className="text-center text-[11px] text-text-subtle">
        {status} · {keys.length} key · {models.length} model
      </p>

      {/* Model picker — same popup as "Add Model to Combo" */}
      <ModelSelectModal
        isOpen={showModelSelect}
        onClose={() => setShowModelSelect(false)}
        onSelect={(m) => {
          const v = m?.value || m?.name || m;
          setVariantModel(v);
          setShowModelSelect(false);
        }}
        title={translate("Select backing model")}
        closeOnSelect
        selectedModel={variantModel}
        variants={data?.variants || {}}
      />

      {/* Delete variant confirmation */}
      <ConfirmModal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDeleteVariant}
        title="Delete Variant"
        message={`Delete variant "${pendingDelete}" and its prompt?`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
