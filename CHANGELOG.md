# v1.4.0 (2026-11-13)

## Features
- **dashboard**: merged single-page usage for API-key sessions + harden scope
- **auth**: restrict API-key dashboard sessions to their own usage
- **auth**: dashboard login via API key

## Fixes
- **usage**: scope api-key listing to the session's own key

# v1.3.3 (2026-11-13)

## Features
- **providers**: add DeepAI Free + LLMTR (port from 9router)

## Fixes
- **open-sse**: reclassify inline <think> reasoning into reasoning_content

## Changes
- 1.3.2
- Add API key usage dashboard page

# v1.3.1 (2026-11-12)

## Features
- **usage**: GLM quota from ZCode plan balance with hard plan expiry

# v1.3.0 (2026-11-09)

## Features
- **dashboard**: dark-only CDS redesign, system tokens, and page relayouts

# v1.2.2 (2026-11-07)

## Fixes
- **zcode**: ensure free JWT-only accounts stay on Start Plan lane

# v1.2.1 (2026-11-07)

## Fixes
- **usage**: allow Start Plan fallback when apiKey is omitted

# v1.2.0 (2026-11-07)

## Features
- **usage**: fall back to ZCode Start Plan balance when coding-plan quota unavailable

# v1.1.2 (2026-11-07)

## Fixes
- **zcode**: rewrite HTTP 200 business errors to real status codes for account fallback
- **stream**: frame a JSON body as SSE instead of emitting a bare [DONE]

# v1.1.1 (2026-11-06)

## Fixes
- **providers**: rescue a paid GLM 429/1113 onto the ZCode start-plan lane

# v1.1.0 (2026-11-06)

## Features
- **providers**: serve GLM-5.3 free tokens through the ZCode Start Plan lane

## Fixes
- **tests**: repair the regression gate's path matching and the key-access mocks
- **dashboard**: tighten endpoint layout, nav scroll, and dark-mode provider icons

# v1.0.8 (2026-11-02)

## Fixes
- **model-select**: fetch prompt-injection variants so Injected Model section shows in every picker
- **docker**: publish images under the keyzakyy Docker Hub namespace
- **ci**: install optional deps so the Next build resolves native/external modules

# v1.0.7 (2026-11-01)

## Fixes
- **ci**: bump checkout/setup-node actions to v6 (Node 20 deprecation)

# v1.0.6 (2026-11-01)

## Features
- **Usage**: redesigned Request Details tab — 8-tile metric strip (latency split per stage, tokens, cost), PXPIPE card, and payload tabs (Request / Translated / Raw / Response) with copy-to-JSON blocks replacing the old accordions; redacted payloads now render as an explanatory card instead of `{"redacted": true}`
- **Usage**: filter toolbar moved into the table header — sticky mono-uppercase header, status dots, `tabular-nums` alignment, compact `TTFT/Total` latency, chevron row targets, and an explicit empty state
- **Providers**: model import now reports its outcome (imported/skipped/failed) in a modal instead of a native browser `alert()`
- **CLI**: the system tray now ships the same brand mark as the dashboard header (Windows `icon.ico` at 16/24/32/48/64, macOS/Linux `icon.png` at 64×64)

## Fixes
- **Branding**: align the web favicon and PWA icons (`/favicon.svg`, `/icons/icon-192.svg`, `/icons/icon-512.svg`, `src/app/favicon.ico`) with the header logo — same palette as `--color-primary` (gray in light, amber in dark) and the route glyph centered in the tile
- **Theme**: warm neutral dark palette to match the light cream theme; remove all gradients in favor of solid brand/neutral surfaces, and fix token-saver icons in dark
- **Profile**: unify settings typography — Space Grotesk headings/titles, mono uppercase captions and helper text, consistent SSO panel, and a SegmentedControl for the theme switcher
- **Profile**: keep the Security icon visible in dark mode, unify backup/password actions as secondary buttons, and use font-display on both buttons
- **Endpoint**: align empty-state title/caption and item title typography with the dashboard
- **CLI Tools**: consistent light/dark theming and fonts, plus self-hosted CJK/Arabic/Devanagari font subsets
- **Login**: route glyph in the brand tile, and an idle glow/sweep on the "KeyRouter Proxy" wordmark
- **Navigation**: table pagination counter and rows-per-page menu (opens upward, sized to its content)

# v1.0.5 (2026-10-31)

The `1.0.5` tarball on npm was built before the branding and usage work above; this release supersedes it.

# v1.0.4 (2026-10-31)

## Features
- **Nav**: add a Settings entry to the system nav group

# v1.0.3 (2026-10-31)

## Features
- **Header**: add an "Update available" button that polls `/api/version` and opens a copy-install-command modal with a shutdown action

## Fixes
- **CLI**: `killAllAppProcesses()` now resolves the process tree (WMI `ParentProcessId` on Windows, `ps -eo pid,ppid,cmd` on Linux/macOS) and only kills KeyRouter's own `next-server`, so KeyRouter and 9Router can run side by side
- **Header**: drive the version label from `package.json` instead of a hardcoded value

# v1.0.2 (2026-10-31)

## Features
- **Rebrand**: ship the launcher tray and the web PWA icons under the KeyRouter brand
- **Updater**: move the launcher's status endpoint to port `20132` so app and CLI keep their port tables separate

## Fixes
- **Ports**: default app port moves from `20128` to `20131` to coexist with a running 9Router instance
- **Docs**: drop `keyrouter.com` references (website not live yet) and point remote access at localhost/Tailscale
- **Endpoint Proxy**: keep upstream provider identity headers instead of rewriting them

# v1.0.0 (2026-10-31)

First release under the KeyRouter name (fork of 9Router, published to npm as `keyrouter` from `keyzakyy-dev/keyrouter`).

## Features
- **Rebrand**: dashboard, CLI, docs, and i18n READMEs rebranded from 9Router to KeyRouter
- **Docs**: rewrite the README around the KeyRouter release and refresh the screenshots

## Fixes
- **CLI**: relicense the launcher under the same license as the app and expose the KeyRouter package name in its build

