/**
 * providers/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * All AI provider callers.
 *
 * Every function returns { text: string; tokensUsed?: number } | null.
 * Never throws — always returns null on any failure.
 *
 * OpenAI-compatible providers share one generic caller to avoid repetition.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios from "axios";
import { KEYS, MODELS, BASE_URLS } from "../config";
import { log } from "../utils";

export interface ProviderResult {
  text: string;
  tokensUsed?: number;
}

// ── Generic OpenAI-compatible caller ─────────────────────────────────────────

async function openAICompatible(params: {
  apiKey: string;
  baseUrl: string;
  model: string;
  prompt: string;
  maxTokens?: number;
  timeoutMs?: number;
  extraBody?: Record<string, unknown>;
}): Promise<ProviderResult | null> {
  if (!params.apiKey) return null;

  const { apiKey, baseUrl, model, prompt, maxTokens = 8192, timeoutMs = 600_000, extraBody = {} } = params;

  try {
    const { data } = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
        ...extraBody,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/daily-digest",
          "X-Title": "Daily Digest",
        },
        timeout: timeoutMs,
      },
    );

    const text = data?.choices?.[0]?.message?.content ?? "";
    const tokensUsed = data?.usage?.total_tokens;
    return text ? { text, tokensUsed } : null;
  } catch (err) {
    log("WARN", `  OpenAI-compat (${model}) failed: ${(err as Error).message}`);
    return null;
  }
}

// ── Level 1 — Search-capable providers ───────────────────────────────────────

/** Gemini with Google Search grounding */
export async function callGemini(prompt: string, useSearch = false): Promise<ProviderResult | null> {
  if (!KEYS.GEMINI) return null;

  log("AI", `  [Gemini] model=${MODELS.GEMINI} search=${useSearch}`);

  try {
    const body: Record<string, unknown> = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8192, temperature: 0.7 },
    };

    if (useSearch) {
      // Use google_search (newer API) with googleSearch as fallback
      body.tools = [{ google_search: {} }];
    }

    const { data } = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.GEMINI}:generateContent`,
      body,
      {
        params: { key: KEYS.GEMINI },
        headers: { "Content-Type": "application/json" },
        timeout: 120_000,
      },
    );

    // Extract text from all parts (handles multi-part responses)
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p: any) => p.text ?? "").join("").trim();

    if (!text) {
      log("WARN", `  Gemini returned empty. Candidates: ${data?.candidates?.length ?? 0}`);
    }
    return text ? { text } : null;
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message ?? err.message;
    log("WARN", `  Gemini failed: ${msg}`);
    return null;
  }
}

/** Claude with web_search tool */
export async function callClaude(prompt: string, useSearch = false): Promise<ProviderResult | null> {
  if (!KEYS.ANTHROPIC) return null;

  try {
    const body: Record<string, unknown> = {
      model: MODELS.CLAUDE,
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    };

    if (useSearch) {
      body.tools = [{ type: MODELS.CLAUDE_SEARCH_TOOL, name: "web_search" }];
    }

    const { data } = await axios.post(
      "https://api.anthropic.com/v1/messages",
      body,
      {
        headers: {
          "x-api-key": KEYS.ANTHROPIC,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        timeout: 600_000,
      },
    );

    // Extract text from content blocks (may include tool_use blocks if search was triggered)
    const text = (data?.content ?? [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");

    const tokensUsed = (data?.usage?.input_tokens ?? 0) + (data?.usage?.output_tokens ?? 0);
    return text ? { text, tokensUsed } : null;
  } catch (err) {
    log("WARN", `  Claude failed: ${(err as Error).message}`);
    return null;
  }
}

/** OpenAI search-preview model */
export async function callOpenAISearch(prompt: string): Promise<ProviderResult | null> {
  return openAICompatible({
    apiKey: KEYS.OPENAI,
    baseUrl: BASE_URLS.OPENAI,
    model: MODELS.OPENAI_SEARCH,
    prompt,
  });
}

/** OpenRouter search model (Perplexity / GPT-OSS) */
export async function callOpenRouterSearch(prompt: string): Promise<ProviderResult | null> {
  return openAICompatible({
    apiKey: KEYS.OPENROUTER,
    baseUrl: BASE_URLS.OPENROUTER,
    model: MODELS.OPENROUTER_SEARCH,
    prompt,
  });
}

/** DeepSeek (Level 1 search-capable slot) */
export async function callDeepSeekSearch(prompt: string): Promise<ProviderResult | null> {
  return openAICompatible({
    apiKey: KEYS.DEEPSEEK,
    baseUrl: BASE_URLS.DEEPSEEK,
    model: MODELS.DEEPSEEK,
    prompt,
  });
}

/** xAI / Grok */
export async function callXAI(prompt: string): Promise<ProviderResult | null> {
  return openAICompatible({
    apiKey: KEYS.XAI,
    baseUrl: BASE_URLS.XAI,
    model: MODELS.XAI,
    prompt,
  });
}

// ── Level 2 — Standard providers (no search) ─────────────────────────────────

export async function callOpenAI(prompt: string): Promise<ProviderResult | null> {
  return openAICompatible({
    apiKey: KEYS.OPENAI,
    baseUrl: BASE_URLS.OPENAI,
    model: MODELS.OPENAI,
    prompt,
  });
}

export async function callGroq(prompt: string): Promise<ProviderResult | null> {
  return openAICompatible({
    apiKey: KEYS.GROQ,
    baseUrl: BASE_URLS.GROQ,
    model: MODELS.GROQ,
    prompt,
  });
}

export async function callMistral(prompt: string): Promise<ProviderResult | null> {
  return openAICompatible({
    apiKey: KEYS.MISTRAL,
    baseUrl: BASE_URLS.MISTRAL,
    model: MODELS.MISTRAL,
    prompt,
  });
}

export async function callFireworks(prompt: string): Promise<ProviderResult | null> {
  return openAICompatible({
    apiKey: KEYS.FIREWORKS,
    baseUrl: BASE_URLS.FIREWORKS,
    model: MODELS.FIREWORKS,
    prompt,
  });
}

export async function callMoonshot(prompt: string): Promise<ProviderResult | null> {
  return openAICompatible({
    apiKey: KEYS.MOONSHOT,
    baseUrl: BASE_URLS.MOONSHOT,
    model: MODELS.MOONSHOT,
    prompt,
  });
}

export async function callMiniMax(prompt: string): Promise<ProviderResult | null> {
  return openAICompatible({
    apiKey: KEYS.MINIMAX,
    baseUrl: BASE_URLS.MINIMAX,
    model: MODELS.MINIMAX,
    prompt,
  });
}

export async function callZAI(prompt: string): Promise<ProviderResult | null> {
  return openAICompatible({
    apiKey: KEYS.ZAI,
    baseUrl: BASE_URLS.ZAI,
    model: MODELS.ZAI,
    prompt,
  });
}

export async function callOpenRouterFree(prompt: string): Promise<ProviderResult | null> {
  return openAICompatible({
    apiKey: KEYS.OPENROUTER,
    baseUrl: BASE_URLS.OPENROUTER,
    model: MODELS.OPENROUTER_FREE,
    prompt,
  });
}

/** GitHub Models — tries primary then each fallback model */
export async function callGitHubModels(prompt: string): Promise<ProviderResult | null> {
  if (!KEYS.GITHUB) return null;

  const fallbacks = MODELS.GITHUB_FALLBACKS.split(",").map((m) => m.trim());
  const models = [MODELS.GITHUB, ...fallbacks];

  for (const model of models) {
    const result = await openAICompatible({
      apiKey: KEYS.GITHUB,
      baseUrl: BASE_URLS.GITHUB,
      model,
      prompt,
      timeoutMs: 120_000,
    });
    if (result) {
      log("AI", `  GitHub Models: ${model} succeeded`);
      return result;
    }
  }
  return null;
}

/** Ollama (local, Level 2.5) */
export async function callOllama(prompt: string): Promise<ProviderResult | null> {
  try {
    const { data } = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "qwen2.5:7b",
        prompt,
        stream: false,
        options: { num_predict: 4096 },
      },
      { timeout: 300_000 },
    );
    const text = data?.response ?? "";
    return text ? { text } : null;
  } catch (err) {
    log("WARN", `  Ollama failed: ${(err as Error).message}`);
    return null;
  }
}
