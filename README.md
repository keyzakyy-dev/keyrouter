<div align="center">

<img src="./images/keyrouter.png" alt="KeyRouter dashboard" width="820"/>

# KeyRouter

**One endpoint. Every AI you already pay for. Zero wasted tokens.**

[![npm](https://img.shields.io/npm/v/keyrouter.svg)](https://www.npmjs.com/package/keyrouter)
[![Downloads](https://img.shields.io/npm/dm/keyrouter.svg)](https://www.npmjs.com/package/keyrouter)
[![Docker Pulls](https://img.shields.io/docker/pulls/keyzakyy/keyrouter.svg?logo=docker&label=docker%20pulls)](https://hub.docker.com/r/keyzakyy/keyrouter)
[![Publish](https://github.com/keyzakyy-dev/keyrouter/actions/workflows/publish-cli.yml/badge.svg)](https://github.com/keyzakyy-dev/keyrouter/actions/workflows/publish-cli.yml)
[![License](https://img.shields.io/npm/l/keyrouter.svg)](LICENSE)
[![Stars](https://img.shields.io/github/stars/keyzakyy-dev/keyrouter?style=social)](https://github.com/keyzakyy-dev/keyrouter)

**[⚡ Quick Start](#-quick-start)** · **[🎯 Which install path?](#-which-install-path-do-i-need)** · **[🔌 Connect a tool](#-connect-a-tool-in-3-lines)** · **[✨ Features](#-features)** · **[🛠 CLI](#-cli)** · **[❓ FAQ](#-faq)**

</div>

---

## 📌 At a glance

| | |
| --- | --- |
| **What it is** | A self-hosted router that sits between your AI coding tools and 40+ providers (100+ models) |
| **Install** | `npm i -g keyrouter` — no account, no signup, no cloud lock-in |
| **Endpoint** | `http://localhost:20131/v1` — speaks OpenAI **and** Claude API |
| **Runs on** | Node.js ≥ 22.23 (24 LTS recommended) · Linux · macOS · Windows · Docker `amd64`/`arm64` |
| **Data** | 100% local in `~/.keyrouter` (SQLite) — keys, logs, usage never leave your machine |
| **Cost for the router itself** | Free, MIT-licensed. You keep paying (or not paying — free tiers work) your providers |

> [!TIP]
> **60-second try:** `npx keyrouter` → dashboard opens → **Providers → Kiro AI** (free Claude, no login) → point Claude Code at `http://localhost:20131/v1`. That's it — you're routing.

```bash
# 1. route-all-the-things in one line
npx keyrouter

# 2. wire the CLI tools on this machine to it (backs up configs once as *.bak-keyrouter)
npx keyrouter connect http://localhost:20131 --tools claude,codex,cline

# 3. see what it changed
keyrouter show claude
```

---

## 🚀 Quick Start

### Option 1 · npm (desktop, recommended)

```bash
npm install -g keyrouter
keyrouter
# → dashboard at http://localhost:20131 (default password: 123456 — change it)
```

Or skip the install entirely: `npx keyrouter`

### Option 2 · Docker (server / VPS)

```bash
docker run -d --name keyrouter \
  -p 20131:20131 \
  -v "$HOME/.keyrouter:/app/data" \
  -e DATA_DIR=/app/data \
  keyzakyy/keyrouter:latest
```

Images for `amd64` + `arm64` on [Docker Hub](https://hub.docker.com/r/keyzakyy/keyrouter) and [GHCR](https://github.com/keyzakyy-dev/keyrouter/pkgs/container/keyrouter). Version pinning, tags, and upgrades: [`DOCKER.md`](DOCKER.md).

### Option 3 · from source

```bash
git clone https://github.com/keyzakyy-dev/keyrouter.git
cd keyrouter && cp .env.example .env
npm install && npm run build
npm run start
```

Full contributor setup (tests, lint, dev server on `:20127`): [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 🤔 Which install path do I need?

| You are… | Use | Why |
| --- | --- | --- |
| Coding on a laptop/desktop | **npm** (Option 1) | Auto-updates itself, tray icon, zero config |
| Deploying on a VPS/homelab | **Docker** (Option 2) | Persistent volume, restart policy, arm64 OK |
| Hacking on the router itself | **source** (Option 3) | Dev server, hot reload, tests |
| Just testing once | `npx keyrouter` | Nothing installed, throwaway |

---

## 🔌 Connect a tool in 3 lines

Every tool that speaks the OpenAI or Claude API works out of the box:

```text
Endpoint : http://localhost:20131/v1
API Key  : (copy from the dashboard → API Keys)
Model    : kr/claude-sonnet-4.5
```

Or let KeyRouter write the configs for you — it backs up each tool's file once as `*.bak-keyrouter`:

```bash
npx keyrouter connect http://localhost:20131                       # pick tools interactively
npx keyrouter connect http://localhost:20131 --tools claude,codex  # choose in advance
npx keyrouter connect --reset --tools claude,codex                 # undo
```

<details>
<summary><b>Supported tools for <code>keyrouter connect</code></b> (click to expand)</summary>

`claude` · `codex` · `opencode` · `droid` · `crush` · `kilo` · `cline` · `pi` · `omp` · `all`

Cursor and other GUI tools: paste the endpoint + key manually per the table above.
</details>

---

## 🧠 Why KeyRouter?

**The problem you already have:**

- Subscription quotas expire monthly, even unused.
- Rate limits hit mid-task; you wait or switch manually.
- `git diff` / `grep` / `ls` output burns input tokens on *every* turn.
- Every provider = another key, endpoint and config to babysit.

**KeyRouter's answers:**

| | |
| --- | --- |
| 🔥 **RTK Token Saver** | Compresses tool output before it reaches the model — **20–40% fewer input tokens** per request |
| 🪜 **3-tier fallback** | Subscription → cheap (GLM, MiniMax) → free (Kiro, OpenCode Free), automatically, mid-request |
| 📊 **Quota tracking** | Know what's left on every subscription; drain it before it resets |
| 👥 **Multi-account** | Several accounts per provider, load-spread |
| 🔁 **Auto token refresh** | OAuth stays alive in the background; no re-login marathons |
| 🎛 **Custom combos** | Unlimited `kr/*` model mixes with your own routing strategy |

---

## 🗺 How it works

```text
┌──────────────────┐
│   Your CLI tool  │   Claude Code, Codex, Cursor, Cline, Droid, Crush…
└────────┬─────────┘
         │  http://localhost:20131/v1
         ▼
┌─────────────────────────────────────────────┐
│              KeyRouter (router)             │
│  1. Auth your API key (+ per-key limits)    │
│  2. RTK Token Saver compresses tool output  │
│  3. Translate format: OpenAI ↔ Claude ↔     │
│     Gemini ↔ Kiro ↔ Vertex ↔ Cursor         │
│  4. Log, meter and fall back as needed      │
└────────┬────────────────────────────────────┘
         │
         ├─→ Tier 1: subscription (Claude, Codex, Copilot)
         ├─→ Tier 2: cheap (GLM, MiniMax, …)
         └─→ Tier 3: free (Kiro, OpenCode Free, Vertex, …)
```

Deep dive (executors, streaming, OAuth flows, DB schema): [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Full docs site: [`gitbook/content/en/`](gitbook/content/en/index.md).

---

## ✨ Features

| Area | What it does | Why it matters |
| --- | --- | --- |
| **RTK Token Saver** | Compresses `git diff`, `grep`, `ls` and friends in-place | 20–40% cheaper requests, fail-open (never breaks your call) |
| **Format translation** | OpenAI ↔ Claude ↔ Gemini ↔ Kiro ↔ Vertex ↔ Cursor | One endpoint into any CLI tool |
| **Usage analytics** | Tokens, cost, latency per request — filterable, exportable | See exactly where money goes |
| **Per-key limits** | Token budgets + request rate per API key (HTTP 429) | Share with a team or resell safely |
| **Prompt injection** | System prompts / chat scripts per key, model or global | Router-level personas, no tool config needed |
| **Proxy pools** | Health checks, rotation, dead-pool cleanup | Keeps big key fleets alive |
| **Request log** | Live console with per-request detail and redaction | Debug any call in seconds |
| **Update button** | In-dashboard "update available" with copy-install command | No surprise versions |

---

## 🛠 CLI

```bash
keyrouter                    # start with defaults
keyrouter --port 8080        # custom port
keyrouter --no-browser       # don't open the dashboard
keyrouter --skip-update      # skip the auto-update check
keyrouter show claude        # inspect a tool's config (try --json)
keyrouter connect --help     # remote-connect options
keyrouter --help             # everything else
```

---

## ⚙️ Environment & Data

<details>
<summary><b>Environment variables</b> (click to expand — defaults are fine for local use)</summary>

| Variable | Required | Description |
| --- | --- | --- |
| `JWT_SECRET` | Yes | Long random secret for session signing |
| `INITIAL_PASSWORD` | Yes | First dashboard password — change after login |
| `DATA_DIR` | Yes | Data directory (default `~/.keyrouter`) |
| `PORT` | No | Server port (default `20131`) |
| `API_KEY_SECRET` | No | Secret for API keys issued by the endpoint proxy |
| `MACHINE_ID_SALT` | No | Salt for machine identity |
| `CLOUD_URL` | No | Cloud sync endpoint — off unless you set it |
| `BASE_URL` | No | Public base URL of this instance |
| `HTTP_PROXY` / `HTTPS_PROXY` | No | Outbound proxy for upstream calls |

Full list + examples: [`.env.example`](.env.example)
</details>

<details>
<summary><b>Where my data lives?</b> (click to expand)</summary>

- **macOS / Linux:** `~/.keyrouter/db/data.sqlite`
- **Windows:** `%APPDATA%/keyrouter/db/data.sqlite`
- **Docker:** `/app/data/db/data.sqlite` — mount `$HOME/.keyrouter` to persist it
- Everything (keys, logs, usage, settings) is in that one SQLite file. Back it up = back up KeyRouter.
</details>

<details>
<summary><b>How updates work</b> (click to expand)</summary>

The CLI and web assets update via [`src/lib/updater/`](src/lib/updater) — when a new version exists, the dashboard shows an **Update available** button with a copy-install command; nothing auto-installs without your click. Docker users: pull the new tag and recreate the container (data stays in the mounted volume).
</details>

---

## 🩹 Troubleshooting

| Symptom | Fix |
| --- | --- |
| Port `20131` already in use | `keyrouter --port 8080` (and update the endpoint in your tools) |
| `401` from KeyRouter | Key mismatch — re-copy the API key from the dashboard |
| Tool can't connect after upgrade | `npx keyrouter connect --reset --tools <tools>` then reconnect |
| OAuth token expired mid-use | Shouldn't happen (auto-refresh); force reconnect the provider in **Providers** |
| Docker: data gone after recreate | You didn't mount `-v "$HOME/.keyrouter:/app/data"` — data lives in the volume, not the image |

More: [`gitbook/content/en/troubleshooting.md`](gitbook/content/en/troubleshooting.md) · [Discussions](https://github.com/keyzakyy-dev/keyrouter/discussions)

---

## ❓ FAQ

<details>
<summary><b>Do my API keys / prompts leave my machine?</b></summary>

No. KeyRouter is fully self-contained — requests go from your tools to your local (or your own VPS's) KeyRouter process straight to the provider. No telemetry, no middleman. The only network calls are the ones you configure: providers, optional proxy pools, and the optional `CLOUD_URL` sync (off by default).
</details>

<details>
<summary><b>Is <code>kr/&lt;model&gt;</code> special syntax?</b></summary>

Yes — `kr/` prefixes a **combo**: a KeyRouter-defined model mix with its own fallback strategy (e.g. `kr/claude-sonnet-4.5` → falls back to a cheaper Claude, then a subscription Codex, then a free tier). Build your own in the dashboard → **Combos**.
</details>

<details>
<summary><b>Can I run it on a shared server and keep it private?</b></summary>

Yes — that's exactly what per-key limits + `INITIAL_PASSWORD` + `BASE_URL` + HTTPS (put it behind nginx/Caddy) are for. Authentication is session-based for the dashboard and API-key-based for `/v1`.
</details>

<details>
<summary><b>Does it really work with free providers?</b></summary>

Yes — **Kiro AI** (free Claude) and **OpenCode Free** work without any login, as Tier-3 fallback or standalone. The dashboard marks every provider free/paid/subscription so the router picks in the right order.
</details>

---

## 🗺 Roadmap

- [x] `keyrouter connect` one-shot tool config
- [x] Per-key token budgets & rate limits
- [x] Trusted publishing (releases are provenance-signed from CI)
- [ ] Cloud sync dashboard for multi-instance deployments (`CLOUD_URL`)
- [ ] Request replay / diff between two providers for the same payload

---

## 🤝 Contributing

```bash
npm install
npm run dev                                  # hot-reload dev server on :20127
npm run build                                # production standalone build
npm run cli:pack                             # build the publishable CLI tarball
npm run release:dry                          # preview the next version bump (no writes)
node tests/__baseline__/verify-no-regression.mjs   # regression check vs baseline

# lint the files you touched (repo-wide eslint has pre-existing failures):
npx eslint path/to/changed-file.js
```

The test suite is intentionally not all-green on a bare checkout (~938 pass / ~64 known-fail, tracked in `tests/__baseline__/known-fails.txt`) — use `verify-no-regression.mjs` to judge *your* change, not the raw count. Unit tests for the embeddings endpoint live in `tests/` (own `package.json`). Full conventions: [`CLAUDE.md`](CLAUDE.md) & [`AGENTS.md`](AGENTS.md).

Please read [`gitbook/content/en/faq.md`](gitbook/content/en/faq.md) for common questions before opening an issue, and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) before touching routing, fallback, OAuth or DB code. PRs that touch auth, keys, headers or SSRF surfaces will get extra scrutiny.

For bugs → [Issues](https://github.com/keyzakyy-dev/keyrouter/issues) · Questions → [Discussions](https://github.com/keyzakyy-dev/keyrouter/discussions)

---

## 📚 Documentation

| Doc | What's in it |
| --- | --- |
| [`DOCKER.md`](DOCKER.md) | Docker & docker-compose, image tags, verified digests, publishing |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Executors, streaming pipeline, OAuth, DB schema, env matrix |
| [`gitbook/content/en/index.md`](gitbook/content/en/index.md) | Full documentation site (EN, plus JA / ZH / ES / PT / FA) |
| [`CHANGELOG.md`](CHANGELOG.md) | Every release, auto-generated from commits |
| npm | <https://www.npmjs.com/package/keyrouter> |

---

## 🙏 Acknowledgments

KeyRouter is a derivative and rebrand of [9Router](https://github.com/decolua/9router) by [decolua](https://github.com/decolua), released under the MIT license. The original copyright notice and license terms are preserved in [LICENSE](LICENSE).

The token-saving pipeline builds on ideas from [RTK](https://github.com/rtk-ai/rtk) (Rust token saver) and [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) (the Go implementation that inspired this JavaScript port). Many thanks to their authors.

---

## 📄 License

MIT — see [LICENSE](LICENSE).
