/**
 * fallback/chain.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Six-level fallback chain. Levels are tried in strict order.
 * The first provider that returns a valid digest wins.
 *
 * Level 1    Search-capable AI + pre-fetched context
 *            (Gemini, OpenAI-search, OpenRouter-search, DeepSeek, xAI, Claude)
 * Level 2    Standard AI + pre-fetched context (no search)
 *            (OpenAI, Groq, Mistral, Fireworks, Moonshot, MiniMax, ZAI,
 *             OpenRouter-free, GitHub Models)
 * Level 2.5  Local Ollama (qwen2.5:7b)
 * Level 3    Direct assembly — no LLM, just pre-fetched data formatted
 * Level 4    Data-only template — markets + headlines only
 * Level 5    Blank template — pure stdlib, always succeeds
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { log, timer, getISTDateHuman, getISTDateFront, getISTDateISO } from "../utils";
import { buildPrompt } from "../providers/prompt";
import {
  callGemini,
  callOpenAISearch,
  callOpenRouterSearch,
  callDeepSeekSearch,
  callXAI,
  callClaude,
  callOpenAI,
  callGroq,
  callMistral,
  callFireworks,
  callMoonshot,
  callMiniMax,
  callZAI,
  callOpenRouterFree,
  callGitHubModels,
  callOllama,
} from "../providers";
import {
  normalize,
  validate,
  injectAuthor,
  buildMarketsSection,
  injectFurtherReading,
  markdownToHtml,
} from "./validate";
import {
  GenerationResult,
  PreFetchedData,
  ProviderAttempt,
  ProviderName,
  FallbackLevel,
} from "../types";
import { fetchFurtherReading } from "../fetchers/news";

// Author labels for front matter
const AUTHOR_LABELS: Partial<Record<ProviderName, string>> = {
  "gemini":           "Gemini",
  "openai-search":    "OpenAI",
  "openrouter-search":"OpenRouter",
  "deepseek-search":  "DeepSeek",
  "xai-search":       "xAI",
  "claude":           "Claude",
  "openai":           "OpenAI",
  "groq":             "Groq",
  "mistral":          "Mistral",
  "fireworks":        "Fireworks",
  "moonshot":         "Moonshot",
  "minimax":          "MiniMax",
  "zai":              "ZAI",
  "openrouter-free":  "OpenRouter",
  "github-models":    "GitHub Models",
  "ollama":           "Local AI",
};

// ── Try a single provider ─────────────────────────────────────────────────────

async function tryProvider(
  name: ProviderName,
  level: FallbackLevel,
  caller: () => Promise<{ text: string; tokensUsed?: number } | null>,
  attempts: ProviderAttempt[],
): Promise<string | null> {
  const elapsed = timer();
  log("AI", `Trying [Level ${level}] ${name}...`);

  try {
    const result = await caller();
    const latencyMs = elapsed();

    if (!result?.text) {
      log("WARN", `  ${name} returned empty response (${latencyMs}ms)`);
      attempts.push({ provider: name, level, success: false, latencyMs, error: "empty response" });
      return null;
    }

    const normalized = normalize(result.text);
    if (!validate(normalized)) {
      log("WARN", `  ${name} output failed validation (${latencyMs}ms)`);
      attempts.push({ provider: name, level, success: false, latencyMs, error: "validation failed", tokensUsed: result.tokensUsed });
      return null;
    }

    log("AI", `  ✓ ${name} succeeded in ${latencyMs}ms`);
    attempts.push({ provider: name, level, success: true, latencyMs, tokensUsed: result.tokensUsed });
    return normalized;
  } catch (err) {
    const latencyMs = elapsed();
    const error = (err as Error).message;
    log("WARN", `  ${name} threw: ${error} (${latencyMs}ms)`);
    attempts.push({ provider: name, level, success: false, latencyMs, error });
    return null;
  }
}

// ── Level 3: Direct assembly ──────────────────────────────────────────────────

function directAssembly(data: Omit<PreFetchedData, "market">): string {
  const dateHuman = getISTDateHuman();
  const dateFront = getISTDateFront();

  function section(heading: string, items: string[], maxItems = 8): string {
    if (!items.length) return "";
    const bullets = items
      .slice(0, maxItems)
      .map((item) => `- **${item.replace(/\[SRC:[^\]]+\]/g, "").trim()}**`)
      .join("\n");
    return `## ${heading}\n\n${bullets}\n\n---\n`;
  }

  const parts = [
    `---\ntitle: "Daily Digest — ${dateHuman}"\ndate: ${dateFront}\nsummary: "Today's top stories across global news, India, and tech."\n---\n\n`,
    section("Global News", data.globalNews),
    section("India", data.indiaNews),
    section("AI & Tech", [...data.techNews.slice(0, 5), ...data.hn.slice(0, 3)]),
    section("Investing & Predictions", data.investingNews),
    data.startupsNews.length ? section("Startups & Funding", data.startupsNews, 5) : "",
    data.careerNews.length   ? section("Career & Opportunities", data.careerNews, 5) : "",
  ].filter(Boolean);

  return parts.join("\n");
}

// ── Level 4: Data-only template ───────────────────────────────────────────────

function dataOnlyTemplate(data: Omit<PreFetchedData, "market">): string {
  const dateHuman = getISTDateHuman();
  const dateFront = getISTDateFront();

  const topHeadlines = [
    ...data.globalNews.slice(0, 3),
    ...data.indiaNews.slice(0, 2),
    ...data.techNews.slice(0, 2),
  ].map((h) => `- ${h.replace(/\[SRC:[^\]]+\]/g, "").trim()}`).join("\n");

  return `---
title: "Daily Digest — ${dateHuman}"
date: ${dateFront}
summary: "Today's headlines."
---

## Global News

${data.globalNews.slice(0, 5).map((h) => `- **${h.replace(/\[SRC:[^\]]+\]/g, "").trim()}**`).join("\n")}

---

## India

${data.indiaNews.slice(0, 5).map((h) => `- **${h.replace(/\[SRC:[^\]]+\]/g, "").trim()}**`).join("\n")}

---

## AI & Tech

${data.techNews.slice(0, 5).map((h) => `- **${h.replace(/\[SRC:[^\]]+\]/g, "").trim()}**`).join("\n")}

---

## Investing & Predictions

${data.investingNews.slice(0, 5).map((h) => `- **${h.replace(/\[SRC:[^\]]+\]/g, "").trim()}**`).join("\n")}
`;
}

// ── Level 5: Blank template ───────────────────────────────────────────────────

function blankTemplate(): string {
  return `---
title: "Daily Digest — ${getISTDateHuman()}"
date: ${getISTDateFront()}
summary: "Digest generation encountered issues today. Please check back later."
---

## Global News

- **Digest Temporarily Unavailable** — All AI providers and data sources failed today. Please check back later.

---

## India

- **Service Disruption** — Digest generation failed. This is a fallback placeholder.

---

## AI & Tech

- **Scheduled Maintenance** — Digest will resume automatically on the next run.

---

## Investing & Predictions

- **Data Unavailable** — Market commentary could not be generated today.
`;
}

// ── Main fallback chain ───────────────────────────────────────────────────────

export async function runFallbackChain(prefetched: PreFetchedData): Promise<GenerationResult> {
  const { market, ...newsData } = prefetched;
  const totalTimer = timer();
  const attempts: ProviderAttempt[] = [];

  const promptSearch   = buildPrompt(newsData, { searchHint: true });
  const promptStandard = buildPrompt(newsData, { searchHint: false });

  let markdown: string | null = null;
  let providerUsed: ProviderName = "blank-template";
  let fallbackLevel: FallbackLevel = 5;

  // ── Level 1: Search-capable AI ───────────────────────────────────────────

  log("AI", "=== Level 1: Search-capable providers ===");

  const level1Providers: [ProviderName, () => Promise<{ text: string; tokensUsed?: number } | null>][] = [
    ["gemini",            () => callGemini(promptSearch, true)],
    ["openai-search",     () => callOpenAISearch(promptSearch)],
    ["openrouter-search", () => callOpenRouterSearch(promptSearch)],
    ["deepseek-search",   () => callDeepSeekSearch(promptSearch)],
    ["xai-search",        () => callXAI(promptSearch)],
    ["claude",            () => callClaude(promptSearch, true)],
  ];

  for (const [name, caller] of level1Providers) {
    markdown = await tryProvider(name, 1, caller, attempts);
    if (markdown) { providerUsed = name; fallbackLevel = 1; break; }
  }

  // ── Level 2: Standard AI ──────────────────────────────────────────────────

  if (!markdown) {
    log("AI", "=== Level 2: Standard providers ===");

    const level2Providers: [ProviderName, () => Promise<{ text: string; tokensUsed?: number } | null>][] = [
      ["openai",         () => callOpenAI(promptStandard)],
      ["groq",           () => callGroq(promptStandard)],
      ["mistral",        () => callMistral(promptStandard)],
      ["fireworks",      () => callFireworks(promptStandard)],
      ["moonshot",       () => callMoonshot(promptStandard)],
      ["minimax",        () => callMiniMax(promptStandard)],
      ["zai",            () => callZAI(promptStandard)],
      ["openrouter-free",() => callOpenRouterFree(promptStandard)],
      ["github-models",  () => callGitHubModels(promptStandard)],
    ];

    for (const [name, caller] of level2Providers) {
      markdown = await tryProvider(name, 2, caller, attempts);
      if (markdown) { providerUsed = name; fallbackLevel = 2; break; }
    }
  }

  // ── Level 2.5: Local Ollama ───────────────────────────────────────────────

  if (!markdown) {
    log("AI", "=== Level 2.5: Local Ollama ===");
    markdown = await tryProvider("ollama", 2.5, () => callOllama(promptStandard), attempts);
    if (markdown) { providerUsed = "ollama"; fallbackLevel = 2.5; }
  }

  // ── Level 3: Direct assembly (no LLM) ────────────────────────────────────

  if (!markdown) {
    log("AI", "=== Level 3: Direct assembly ===");
    const assembled = directAssembly(newsData);
    if (validate(assembled)) {
      markdown = assembled;
      providerUsed = "direct-assembly";
      fallbackLevel = 3;
      attempts.push({ provider: "direct-assembly", level: 3, success: true, latencyMs: 0 });
      log("AI", "  ✓ Direct assembly succeeded");
    }
  }

  // ── Level 4: Data-only template ───────────────────────────────────────────

  if (!markdown) {
    log("AI", "=== Level 4: Data-only template ===");
    const tmpl = dataOnlyTemplate(newsData);
    if (validate(tmpl)) {
      markdown = tmpl;
      providerUsed = "data-template";
      fallbackLevel = 4;
      attempts.push({ provider: "data-template", level: 4, success: true, latencyMs: 0 });
    }
  }

  // ── Level 5: Blank template (always succeeds) ─────────────────────────────

  if (!markdown) {
    log("AI", "=== Level 5: Blank template ===");
    markdown = blankTemplate();
    providerUsed = "blank-template";
    fallbackLevel = 5;
    attempts.push({ provider: "blank-template", level: 5, success: true, latencyMs: 0 });
  }

  // ── Post-processing ───────────────────────────────────────────────────────

  log("AI", `Generation complete. Provider: ${providerUsed}, Level: ${fallbackLevel}`);

  // Inject author into front matter
  const author = AUTHOR_LABELS[providerUsed] ?? "";
  markdown = injectAuthor(markdown, author);

  // Inject real market data section (never AI-generated)
  const marketsSection = buildMarketsSection(market);
  // Insert markets after the front matter block
  const fmEnd = markdown.indexOf("\n---", 3);
  if (fmEnd !== -1) {
    const afterFm = markdown.slice(fmEnd + 4).trimStart();
    markdown = markdown.slice(0, fmEnd + 4) + "\n\n" + marketsSection + "\n\n---\n\n" + afterFm;
  }

  // Append further reading links
  let furtherLinks: { title: string; url: string }[] = [];
  try {
    furtherLinks = await fetchFurtherReading();
  } catch {
    // Non-fatal
  }
  markdown = injectFurtherReading(markdown, furtherLinks);

  // Convert to HTML
  const html = markdownToHtml(markdown);

  return {
    markdown,
    html,
    providerUsed,
    fallbackLevel,
    attempts,
    generationDurationMs: totalTimer(),
    date: getISTDateISO(),
    dateHuman: getISTDateHuman(),
  };
}
