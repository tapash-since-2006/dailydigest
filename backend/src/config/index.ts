/**
 * config/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all env vars, model names, and base URLs.
 * Change model names via environment variables — never touch this file.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import dotenv from "dotenv";
dotenv.config();

function env(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

// ── Timezone ──────────────────────────────────────────────────────────────────
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30

export function nowIST(): Date {
  return new Date(
    Date.now() + IST_OFFSET_MS - new Date().getTimezoneOffset() * 60000,
  );
}

// ── AI Provider Models ────────────────────────────────────────────────────────

// Level 1 — search-capable models (ranked by quality)
export const MODELS = {
  GEMINI: env("GEMINI_MODEL", "gemini-1.5-flash-8b"),
  OPENAI_SEARCH: env("OPENAI_SEARCH_MODEL", "gpt-4.1"),
  OPENROUTER_SEARCH: env(
    "OPENROUTER_SEARCH_MODEL",
    "meta-llama/llama-3.1-8b-instruct:free",
  ),
  DEEPSEEK: env("DEEPSEEK_MODEL", "deepseek-chat"),
  XAI: env("XAI_MODEL", "grok-3-mini-fast"),
  CLAUDE: env("CLAUDE_MODEL", "claude-haiku-4-5-20251001"),
  CLAUDE_SEARCH_TOOL: env("CLAUDE_SEARCH_TOOL", "web_search_20250305"),

  // Level 2 — standard models (no search)
  OPENAI: env("OPENAI_MODEL", "gpt-4.1-mini"),
  OPENROUTER_FREE: env(
    "OPENROUTER_FREE_MODEL",
    "meta-llama/llama-3.1-8b-instruct:free",
  ),
  GROQ: env("GROQ_MODEL", "llama-3.3-70b-versatile"),
  MISTRAL: env("MISTRAL_MODEL", "mistral-small-latest"),
  FIREWORKS: env(
    "FIREWORKS_MODEL",
    "accounts/fireworks/models/llama-v3p1-70b-instruct",
  ),
  MOONSHOT: env("MOONSHOT_MODEL", "moonshot-v1-8k"),
  MINIMAX: env("MINIMAX_MODEL", "MiniMax-Text-01"),
  ZAI: env("ZAI_MODEL", "glm-4-flash"),
  GITHUB: env("GITHUB_MODEL", "openai/gpt-4o-mini"),
  GITHUB_FALLBACKS: env(
    "GITHUB_MODEL_FALLBACKS",
    "meta/Llama-3.3-70B-Instruct,microsoft/Phi-4-mini-instruct",
  ),
} as const;

// ── Provider Base URLs ────────────────────────────────────────────────────────
export const BASE_URLS = {
  OPENAI: env("OPENAI_BASE_URL", "https://api.openai.com/v1"),
  OPENROUTER: env("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
  DEEPSEEK: env("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
  XAI: env("XAI_BASE_URL", "https://api.x.ai/v1"),
  GROQ: env("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
  MISTRAL: env("MISTRAL_BASE_URL", "https://api.mistral.ai/v1"),
  FIREWORKS: env("FIREWORKS_BASE_URL", "https://api.fireworks.ai/inference/v1"),
  MOONSHOT: env("MOONSHOT_BASE_URL", "https://api.moonshot.ai/v1"),
  MINIMAX: env("MINIMAX_BASE_URL", "https://api.minimax.io/v1"),
  ZAI: env("ZAI_BASE_URL", "https://api.z.ai/api/paas/v4"),
  GITHUB: env("GITHUB_MODELS_BASE_URL", "https://models.github.ai/inference"),
  TWELVEDATA: env("TWELVEDATA_BASE_URL", "https://api.twelvedata.com"),
} as const;

// ── API Keys ──────────────────────────────────────────────────────────────────
export const KEYS = {
  ANTHROPIC: process.env.ANTHROPIC_API_KEY || "",
  OPENAI: process.env.OPENAI_API_KEY || "",
  GEMINI: process.env.GEMINI_API_KEY || "",
  OPENROUTER: process.env.OPENROUTER_API_KEY || "",
  DEEPSEEK: process.env.DEEPSEEK_API_KEY || "",
  XAI: process.env.XAI_API_KEY || "",
  GROQ: process.env.GROQ_API_KEY || "",
  MISTRAL: process.env.MISTRAL_API_KEY || "",
  FIREWORKS: process.env.FIREWORKS_API_KEY || "",
  MOONSHOT: process.env.MOONSHOT_AI_API_KEY || "",
  MINIMAX: process.env.MINIMAX_API_KEY || "",
  ZAI: process.env.ZAI_API_KEY || "",
  GITHUB: process.env.GH_MODELS_PAT || process.env.GITHUB_TOKEN || "",

  // News & Search
  TAVILY: process.env.TAVILY_API_KEY || "",
  EXA: process.env.EXA_API_KEY || "",
  NEWS_API: process.env.NEWS_API_KEY || "",
  GNEWS: process.env.GNEWS_API_KEY || "",
  CURRENTS: process.env.CURRENTS_API_KEY || "",
  NYTIMES: process.env.NYTIMES_API_KEY || "",
  MEDIASTACK: process.env.MEDIASTACK_API_KEY || "",
  NEWSDATAIO: process.env.NEWSDATAIO_API_KEY || "",
  WORLDNEWSAPI: process.env.WORLDNEWSAPI_API_KEY || "",
  NEWSCATCHER: process.env.NEWSCATCHERAPI_API_KEY || "",
  WEBSEARCHAI: process.env.WEBSEARCHAPIAI_API_KEY || "",

  // Market Data
  FINNHUB: process.env.FINNHUB_API_KEY || "",
  ALPHAVANTAGE: process.env.ALPHAVANTAGE_API_KEY || "",
  TWELVEDATA: process.env.TWELVEDATA_API_KEY || "",
  MASSIVE: process.env.MASSIVE_API_KEY || "",

  // Database
  DATABASE_URL:
    process.env.DATABASE_URL || "postgresql://localhost:5432/daily_digest",
} as const;

// ── Server ────────────────────────────────────────────────────────────────────
export const SERVER = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
} as const;

// ── Validation ────────────────────────────────────────────────────────────────
export const REQUIRED_SECTIONS = [
  "## Global News",
  "## India",
  "## AI & Tech",
  "## Investing & Predictions",
] as const;

export const PLACEHOLDER_PATTERNS = [
  "[DRAFT",
  "[verify]",
  "[Headline]",
  "[price]",
] as const;

export const HN_META_PREFIXES = [
  "ask hn:",
  "show hn:",
  "tell hn:",
  "launch hn:",
] as const;

export const JUNK_TITLE_FRAGMENTS = [
  "latest news today",
  "breaking news",
  "top headlines",
  "live updates",
  "live news",
  "top news stories",
  "news today",
  "today's news",
  "today news",
  "latest updates",
  "all news",
  "news live",
  "samachar",
  "ताजा समाचार",
  "horoscope",
  "horoscopes today",
  "mock draft",
  "full broadcast",
] as const;
