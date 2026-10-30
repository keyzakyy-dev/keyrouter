# KeyRouter — Agent Skills

Drop-in skills for any AI agent (Claude, Cursor, ChatGPT, custom SDK). Just **copy a link** below and paste it to your AI — it will fetch the skill and use KeyRouter for you.

> Tip: start with the **keyrouter** entry skill — it covers setup and links to all capability skills.

## Skills

| Capability | Copy link below and paste to your AI |
|---|---|
| **Entry / Setup** (start here) | https://raw.githubusercontent.com/decolua/keyrouter/refs/heads/master/skills/keyrouter/SKILL.md |
| Chat / code-gen | https://raw.githubusercontent.com/decolua/keyrouter/refs/heads/master/skills/keyrouter-chat/SKILL.md |
| Image generation | https://raw.githubusercontent.com/decolua/keyrouter/refs/heads/master/skills/keyrouter-image/SKILL.md |
| Video generation (xAI Grok Imagine) | https://raw.githubusercontent.com/decolua/keyrouter/refs/heads/master/skills/keyrouter-video/SKILL.md |
| Text-to-speech | https://raw.githubusercontent.com/decolua/keyrouter/refs/heads/master/skills/keyrouter-tts/SKILL.md |
| Speech-to-text | https://raw.githubusercontent.com/decolua/keyrouter/refs/heads/master/skills/keyrouter-stt/SKILL.md |
| Embeddings | https://raw.githubusercontent.com/decolua/keyrouter/refs/heads/master/skills/keyrouter-embeddings/SKILL.md |
| Web search | https://raw.githubusercontent.com/decolua/keyrouter/refs/heads/master/skills/keyrouter-web-search/SKILL.md |
| Web fetch (URL → markdown) | https://raw.githubusercontent.com/decolua/keyrouter/refs/heads/master/skills/keyrouter-web-fetch/SKILL.md |

## How to use

Paste to your AI (Claude, Cursor, ChatGPT, …):

```
Read this skill and use it: https://raw.githubusercontent.com/decolua/keyrouter/refs/heads/master/skills/keyrouter/SKILL.md
```

Then ask normally — *"generate an image of a cat"*, *"transcribe this URL"*, etc.

## Configure your shell once

```bash
export NINEROUTER_URL="http://localhost:20128"   # local default, or your VPS / tunnel URL
export NINEROUTER_KEY="sk-..."                   # from Dashboard → Keys (only if requireApiKey=true)
```

Verify: `curl $NINEROUTER_URL/api/health` → `{"ok":true}`.

## Links

- Source: https://github.com/decolua/keyrouter
- Dashboard: https://keyrouter.com
