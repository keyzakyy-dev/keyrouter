<div align="center">
  <img src="./images/keyrouter.png" alt="KeyRouter Dashboard" width="800"/>

  # KeyRouter — FREE AI Router & Token Saver

  **Never stop coding. Save 20–40% tokens with RTK + auto-fallback to FREE & cheap AI models.**

  Connect all your AI coding tools (Claude Code, Cursor, Codex, Gemini, OpenCode, Cline, OpenClaw…) to 40+ providers and 100+ models from a single, self-hosted endpoint.

  [![npm](https://img.shields.io/npm/v/keyrouter.svg)](https://www.npmjs.com/package/keyrouter)
  [![Downloads](https://img.shields.io/npm/dm/keyrouter.svg)](https://www.npmjs.com/package/keyrouter)
  [![License](https://img.shields.io/npm/l/keyrouter.svg)](https://github.com/keyzakyy-dev/keyrouter/blob/main/LICENSE)
  [![Stars](https://img.shields.io/github/stars/keyzakyy-dev/keyrouter?style=social)](https://github.com/keyzakyy-dev/keyrouter)

  [🚀 Quick Start](#-quick-start) • [💡 Features](#-key-features) • [📖 Setup](#-setup-guide) • [🌐 Website](https://keyrouter.com)

</div>

---

## ⚡ Quick Start

### Option 1 — npm (recommended for desktop)

```bash
npm install -g keyrouter
keyrouter
```

Or run directly without installing:

```bash
npx keyrouter
```

The dashboard opens at `http://localhost:20128`.

### Option 2 — Docker (server / VPS)

```bash
docker run -d --name keyrouter \
  -p 20128:20128 \
  -v "$HOME/.keyrouter:/app/data" \
  -e DATA_DIR=/app/data \
  keyzakyy-dev/keyrouter:latest
```

### Option 3 — from source

```bash
git clone https://github.com/keyzakyy-dev/keyrouter.git
cd keyrouter
cp .env.example .env
npm install
npm run build
npm run start
```

---

## 🤔 Why KeyRouter?

**Stop wasting money, tokens and hitting limits:**

- ❌ Subscription quota expires unused every month
- ❌ Rate limits stop you mid-coding
- ❌ Tool outputs (`git diff`, `grep`, `ls`…) burn tokens fast
- ❌ Expensive APIs ($20–50/month per provider)
- ❌ Manual switching between providers

**KeyRouter solves this:**

- ✅ **RTK Token Saver** — auto-compress tool results, save 20–40% input tokens per request
- ✅ **Maximize subscriptions** — track quota, use every bit before reset
- ✅ **Auto fallback** — subscription → cheap → free, zero downtime
- ✅ **Multi-account** — round-robin between accounts per provider
- ✅ **Universal** — works with Claude Code, Codex, Cursor, Cline, any OpenAI/Claude-compatible CLI

---

## 🔄 How It Works

```
┌─────────────┐
│  Your CLI   │  (Claude Code, Codex, OpenClaw, Cursor, Cline…)
│   Tool      │
└──────┬──────┘
       │ http://localhost:20128/v1
       ↓
┌─────────────────────────────────────────────┐
│          KeyRouter (Smart Router)           │
│  • RTK Token Saver (cut tool_result tokens) │
│  • Format translation (OpenAI ↔ Claude)     │
│  • Quota tracking                           │
│  • Auto token refresh                       │
└──────┬──────────────────────────────────────┘
       │
       ├─→ [Tier 1: SUBSCRIPTION] Claude Code, Codex, GitHub Copilot
       │   ↓ quota exhausted
       ├─→ [Tier 2: CHEAP] GLM, MiniMax
       │   ↓ budget limit
       └─→ [Tier 3: FREE] Kiro, OpenCode Free, Vertex

Result: never stop coding, minimal cost, +20–40% token savings via RTK.
```

### Use in your CLI tool

```
Claude Code / Codex / OpenClaw / Cursor / Cline settings:
  Endpoint: http://localhost:20128/v1
  API Key:  [copy from dashboard]
  Model:    kr/claude-sonnet-4.5
```

---

## 💡 Key Features

| Feature | What it does | Why it matters |
| --- | --- | --- |
| 🚀 **RTK Token Saver** | Compress tool outputs (`git diff`, `grep`, `ls`, `tree`…) before sending to the LLM | Save 20–40% input tokens per request |
| 🎯 **Smart 3-tier fallback** | Auto-route: subscription → cheap → free | Never stop coding, zero downtime |
| 🔄 **Format translation** | OpenAI ↔ Claude ↔ Gemini ↔ Cursor ↔ Kiro ↔ Vertex | Works with any CLI tool |
| 👥 **Multi-account support** | Multiple accounts per provider | Load balancing + redundancy |
| 🔄 **Auto token refresh** | OAuth tokens refresh automatically | No manual re-login needed |
| 🎨 **Custom combos** | Create unlimited model combinations | Tailor fallback to your needs |
| 📝 **Request logging** | Live request log (console log) with details | Troubleshoot issues easily |
| 📊 **Usage analytics** | Track tokens, cost, trends over time | Optimize spending |
| 🔑 **Per-key quotas & limits** | Token budget + request rate limits per API key | Resell access safely with HTTP 429 |
| 🧩 **Prompt injection** | Inject system prompts / chat scripts per global, key, or model | Add personas at the router level |
| 🕸️ **Proxy pools** | Server-side health checks, rotation, dead-pool cleanup | Keep a large key fleet healthy |
| 🌐 **Deploy anywhere** | Localhost, VPS, Docker, Kubernetes | Flexible deployment options |

---

## 📖 Setup Guide

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `JWT_SECRET` | ✅ | Long random secret for session signing |
| `INITIAL_PASSWORD` | ✅ | Initial dashboard password (change after first login) |
| `DATA_DIR` | ✅ | Data directory (default `~/.keyrouter`) |
| `PORT` | – | Server port (default `20128`) |
| `API_KEY_SECRET` | – | Secret for endpoint proxy API keys |
| `MACHINE_ID_SALT` | – | Salt for machine identity |
| `CLOUD_URL` | – | Cloud sync endpoint (default `https://keyrouter.com`) |
| `BASE_URL` | – | Public base URL of this instance |
| `HTTP_PROXY` / `HTTPS_PROXY` | – | Optional outbound proxy for upstream calls |

See [`.env.example`](.env.example) for the full list.

### Data location

- **macOS/Linux:** `~/.keyrouter/db/data.sqlite`
- **Windows:** `%APPDATA%/keyrouter/db/data.sqlite`
- **Docker:** `/app/data/db/data.sqlite` (mount `$HOME/.keyrouter` to persist)

---

## 🛠️ Development

```bash
npm install
npm run dev            # Next.js dev server on port 20127
npm run build          # production build
npm run start          # production start on port 20127
npm run cli:pack       # build the global CLI package (npm pack)
npm run cli:publish    # build + publish the CLI to npm
```

Stack: **Next.js 16 / React 19 / Tailwind CSS 4 / SQLite** (sql.js + better-sqlite3).

---

## Docker

Full Docker guide (image tags, sidecar Headroom, CI publishing): see [`DOCKER.md`](DOCKER.md).

---

## 🙏 Acknowledgments

Built on the shoulders of giants:

- **[9Router](https://github.com/decolua/9router)** by **[decolua](https://github.com/decolua)** — this project is a derivative/rebrand of 9Router (MIT). The original copyright notice and license are preserved in [LICENSE](LICENSE).
- **[CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI)** — original Go implementation that inspired this JavaScript port.
- **[RTK](https://github.com/rtk-ai/rtk)** — Rust token-saver. KeyRouter ports its compression pipeline to JS → −20–40% input tokens on every request.
- **[Caveman](https://github.com/JuliusBrussee/caveman)** — viral *"why use many token when few token do trick"*. KeyRouter adapts its prompt → −65% output tokens.
- **[Ponytail](https://github.com/DietrichGebert/ponytail)** — *"lazy senior dev"* skill. KeyRouter injects its YAGNI-first ladder → fewer tokens, less code, shorter diffs.

Huge thanks to these authors — without their work, KeyRouter's token-saving features wouldn't exist. ⭐ them on GitHub!

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
