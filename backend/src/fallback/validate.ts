/**
 * fallback/validate.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Normalises AI output and validates that it meets minimum quality standards
 * before being accepted. Mirrors the Python _normalize() and _validate().
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { marked } from "marked";
import { REQUIRED_SECTIONS, PLACEHOLDER_PATTERNS } from "../config";
import { getISTDateHuman } from "../utils";
import { MarketData } from "../types";

// ── Heading normalisation map ─────────────────────────────────────────────────

const HEADING_FIXES: [string, string][] = [
  ["## World News\n",               "## Global News\n"],
  ["## International News\n",       "## Global News\n"],
  ["## Global\n",                   "## Global News\n"],
  ["## Tech\n",                     "## AI & Tech\n"],
  ["## Technology\n",               "## AI & Tech\n"],
  ["## AI and Tech\n",              "## AI & Tech\n"],
  ["## AI/Tech\n",                  "## AI & Tech\n"],
  ["## Investing\n",                "## Investing & Predictions\n"],
  ["## Markets & Investing\n",      "## Investing & Predictions\n"],
  ["## Market Outlook\n",           "## Investing & Predictions\n"],
  ["## Startups\n",                 "## Startups & Funding\n"],
  ["## Career\n",                   "## Career & Opportunities\n"],
  ["## Personal Finance & Savings\n","## Personal Finance\n"],
];

// ── Normalize ─────────────────────────────────────────────────────────────────

export function normalize(text: string): string {
  if (typeof text !== "string") return "";

  text = text.trim();

  // Strip <think>...</think> reasoning tokens (DeepSeek, Phi-4-reasoning)
  text = text.replace(/<think>[\s\S]*?<\/think>\s*/g, "");

  // Strip markdown code fences
  if (text.startsWith("```")) {
    const lines = text.split("\n");
    lines.shift(); // remove opening fence
    if (lines.at(-1)?.trim().startsWith("```")) lines.pop();
    text = lines.join("\n").trim();
  }

  // Remove trailing ``` that leaked from AI output
  text = text.replace(/\n```\s*$/, "").replace(/\n```\s*\n/g, "\n");

  // Strip preamble before YAML front matter
  const idx = text.indexOf("---");
  if (idx > 0) text = text.slice(idx);

  // Normalise heading variants
  for (const [wrong, right] of HEADING_FIXES) {
    text = text.split(wrong).join(right);
  }

  return text.trim();
}

// ── Validate ──────────────────────────────────────────────────────────────────

export function validate(text: string): boolean {
  const norm = normalize(text);

  if (norm.length < 300) return false;
  if (!norm.startsWith("---")) return false;

  // All 4 mandatory sections must be present
  if (!REQUIRED_SECTIONS.every((s) => norm.includes(s))) return false;

  // Must not still contain placeholder markers
  if (PLACEHOLDER_PATTERNS.some((p) => norm.includes(p))) return false;

  // At least 2 real headline bullets
  if ((norm.match(/- \*\*/g) ?? []).length < 2) return false;

  return true;
}

// ── Inject author into YAML front matter ──────────────────────────────────────

export function injectAuthor(text: string, author: string): string {
  if (!author || !text.startsWith("---")) return text;
  const end = text.indexOf("\n---", 3);
  if (end === -1 || text.includes("author:")) return text;
  return text.slice(0, end) + `\nauthor: "${author}"` + text.slice(end);
}

// ── Market injection ──────────────────────────────────────────────────────────

export function buildMarketsSection(market: MarketData): string {
  const fmt = (q: { price: string; change: string } | undefined) =>
    q ? `${q.price} (${q.change})` : "N/A";

  const indices = market.indices;
  const crypto  = market.crypto;
  const forex   = market.forex;
  const commod  = market.commodities;

  const lines: string[] = [
    "## Markets",
    "",
    "**Global Indices**",
    `- S&P 500: ${fmt(indices["^GSPC"])}`,
    `- NASDAQ: ${fmt(indices["^IXIC"])}`,
    `- Dow Jones: ${fmt(indices["^DJI"])}`,
    `- Nikkei 225: ${fmt(indices["^N225"])}`,
    `- FTSE 100: ${fmt(indices["^FTSE"])}`,
    `- DAX: ${fmt(indices["^GDAXI"])}`,
    "",
    "**India**",
    `- Nifty 50: ${fmt(indices["^NSEI"])}`,
    `- Sensex: ${fmt(indices["^BSESN"])}`,
    "",
    "**Crypto & Forex**",
    `- Bitcoin: ${fmt(crypto["BTC-USD"])}`,
    `- USD/INR: ${fmt(forex["USDINR=X"])}`,
    "",
    "**Commodities**",
    `- Gold: ${fmt(commod["GC=F"])}`,
    `- Silver: ${fmt(commod["SI=F"])}`,
    `- Brent Crude: ${fmt(commod["BZ=F"])}`,
  ];

  // US movers
  if (market.usMovers.gainers.length || market.usMovers.losers.length) {
    lines.push("", "**US Top Movers**");
    if (market.usMovers.gainers.length) {
      lines.push("Gainers: " + market.usMovers.gainers.map((m) => `${m.symbol} ${m.change}`).join(" | "));
    }
    if (market.usMovers.losers.length) {
      lines.push("Losers: " + market.usMovers.losers.map((m) => `${m.symbol} ${m.change}`).join(" | "));
    }
  }

  return lines.join("\n");
}

// ── Further reading injection ─────────────────────────────────────────────────

export function injectFurtherReading(
  markdown: string,
  links: { title: string; url: string }[],
): string {
  if (!links.length) return markdown;
  const section = [
    "",
    "---",
    "",
    "## Further Reading",
    "",
    ...links.map((l) => `- [${l.title}](${l.url})`),
  ].join("\n");
  return markdown.trimEnd() + section;
}

// ── Markdown → HTML ───────────────────────────────────────────────────────────

export function markdownToHtml(markdown: string): string {
  // Strip YAML front matter before converting
  let body = markdown;
  if (body.startsWith("---")) {
    const end = body.indexOf("\n---", 3);
    if (end !== -1) body = body.slice(end + 4).trimStart();
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Daily Digest — ${getISTDateHuman()}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 860px; margin: 2rem auto; padding: 0 1rem; line-height: 1.7; color: #1a1a1a; background: #fff; }
    h2 { margin-top: 2rem; border-bottom: 2px solid #e5e7eb; padding-bottom: .4rem; }
    ul { padding-left: 1.5rem; }
    li { margin-bottom: .75rem; }
    a { color: #2563eb; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
    @media (prefers-color-scheme: dark) {
      body { background: #111; color: #e5e7eb; }
      a { color: #60a5fa; }
      hr { border-color: #374151; }
    }
  </style>
</head>
<body>
${marked(body)}
</body>
</html>`;
}
