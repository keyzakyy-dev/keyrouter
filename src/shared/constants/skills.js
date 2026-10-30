// Agent Skills metadata — single source of truth for /dashboard/skills page.
// Each skill = 1 raw GitHub URL the user copies and pastes to any AI agent.

const REPO = "keyzakyy-dev/keyrouter";
const BRANCH = "master";
const SKILL_PATH = "skills";

export const SKILLS_REPO_URL = `https://github.com/${REPO}`;
export const SKILLS_RAW_BASE = `https://raw.githubusercontent.com/${REPO}/refs/heads/${BRANCH}/${SKILL_PATH}`;
export const SKILLS_BLOB_BASE = `https://github.com/${REPO}/blob/${BRANCH}/${SKILL_PATH}`;

export const SKILLS = [
  {
    id: "keyrouter",
    name: "KeyRouter",
    description: "Setup guide + index of all capabilities. Start here.",
    endpoint: null,
    icon: "hub",
    isEntry: true,
  },
  {
    id: "keyrouter-chat",
    name: "Chat",
    description: "Chat & code generation via OpenAI or Anthropic formats, with streaming.",
    endpoint: "/v1/chat/completions",
    icon: "chat",
  },
  {
    id: "keyrouter-image",
    name: "Image Generation",
    description: "Text-to-image via DALL‑E, Imagen, FLUX, MiniMax, SD WebUI.",
    endpoint: "/v1/images/generations",
    icon: "image",
  },
  {
    id: "keyrouter-tts",
    name: "Text-to-Speech",
    description: "Speech synthesis via OpenAI, ElevenLabs, Edge, Google, or Deepgram.",
    endpoint: "/v1/audio/speech",
    icon: "record_voice_over",
  },
  {
    id: "keyrouter-stt",
    name: "Speech-to-Text",
    description: "Transcription via Whisper, Groq, Gemini, Deepgram, or AssemblyAI.",
    endpoint: "/v1/audio/transcriptions",
    icon: "mic",
  },
  {
    id: "keyrouter-embeddings",
    name: "Embeddings",
    description: "Embeddings for RAG & semantic search via OpenAI, Gemini, or Mistral.",
    endpoint: "/v1/embeddings",
    icon: "scatter_plot",
  },
  {
    id: "keyrouter-web-search",
    name: "Web Search",
    description: "Web & X search via Tavily, Exa, Brave, Serper, SearXNG, or PSE.",
    endpoint: "/v1/search",
    icon: "search",
  },
  {
    id: "keyrouter-web-fetch",
    name: "Web Fetch",
    description: "URL → markdown / text / HTML via Firecrawl, Jina, Tavily, or Exa.",
    endpoint: "/v1/web/fetch",
    icon: "language",
  },
];

export function getSkillRawUrl(id) {
  return `${SKILLS_RAW_BASE}/${id}/SKILL.md`;
}

export function getSkillBlobUrl(id) {
  return `${SKILLS_BLOB_BASE}/${id}/SKILL.md`;
}
