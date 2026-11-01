# v1.0.5 (2026-11-01)

## Features
- **CLI**: the system tray now ships the same brand mark as the dashboard header (Windows `icon.ico` at 16/24/32/48/64, macOS/Linux `icon.png` at 64×64)

## Fixes
- **Branding**: align the web favicon and PWA icons (`/favicon.svg`, `/icons/icon-192.svg`, `/icons/icon-512.svg`, `src/app/favicon.ico`) with the header logo — same palette as `--color-primary` (gray in light, amber in dark) and the route glyph centered in the tile
- **Theme**: warm neutral dark palette to match the light cream theme; remove all gradients in favor of solid brand/neutral surfaces, and fix token-saver icons in dark
- **Profile**: unify settings typography — Space Grotesk headings/titles, mono uppercase captions and helper text, consistent SSO panel, and a SegmentedControl for the theme switcher
- **Profile**: keep the Security icon visible in dark mode, unify backup/password actions as secondary buttons, and use font-display on both buttons
- **Endpoint**: align empty-state title/caption and item title typography with the dashboard
- **CLI Tools**: consistent light/dark theming and fonts, plus self-hosted CJK/Arabic/Devanagari font subsets

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

