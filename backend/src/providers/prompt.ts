/**
 * providers/prompt.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds the rich data prompt that is sent to every AI provider.
 * Market data is intentionally excluded from the prompt — it is injected
 * into the HTML separately by the pipeline after AI generation.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getISTDateHuman, getISTDateFront } from "../utils";
import { PreFetchedData } from "../types";

const DATE_HUMAN = getISTDateHuman();
const DATE_FRONT = getISTDateFront();

// ── Output format spec (embedded, no external file dep) ───────────────────────

function buildFormatSpec(): string {
  return `
Output ONLY markdown — no preamble, no explanation, no code fences.
DO NOT generate a ## Markets section — it is injected separately by the script.

STRUCTURE RULES:
1. Start with YAML front matter (title, date, summary)
2. Include 5-7 sections (## heading + bullet points) — NO Markets section
3. Sections separated by --- (horizontal rule)
4. Each MANDATORY section: 7-10 bullet points. Optional: 3-5. Format: - **Bold headline** — 1-2 sentence summary.
5. ## Global News, ## India, ## AI & Tech, and ## Investing & Predictions are MANDATORY.
6. ALWAYS include optional sections if pre-fetched data is available.
7. Do NOT include a ## Further Reading section (appended automatically).
8. If you lack data for a story, SKIP IT. Never fabricate.

SUMMARY RULES (CRITICAL):
- Every bullet MUST have a 1-2 sentence summary after the — dash.
- The summary must be informative enough that the reader understands the story WITHOUT clicking.
- Don't restate the headline — add context (who, what, why), numbers, impact, what changed.
- BAD: "- **India Crisis** — Reports say there is a crisis."
- GOOD: "- **India Fertilizer Crisis** — India imports 90% of its potash; the government is fast-tracking 6 domestic plants under Make in India to reduce dependence on Russia and Belarus."
- NEVER write "accessed via search", "source: X", or mention how you found it.

SOURCE LINKS (optional):
- Some items include [SRC:url] — append [**&#8599;**](url) at the END of that bullet.
- Do NOT invent URLs. If no [SRC:...] tag, omit the link entirely.

MANDATORY (7-10 items each):
- ## Global News
- ## India
- ## AI & Tech
- ## Investing & Predictions

ALSO INCLUDE (3-5 items each, only if pre-fetched data is available):
- ## Startups & Funding
- ## Career & Opportunities
- ## Personal Finance

OPTIONAL (if space allows):
- ## Learning & Growth
- ## Insight of the Day

FORMAT:
---
title: "Daily Digest — ${DATE_HUMAN}"
date: ${DATE_FRONT}
summary: "One punchy sentence covering 2-3 top stories"
---

## [Section Name]

- **Headline** — 1-2 sentence summary with context. [**&#8599;**](url)

---

(repeat for 5-7 sections)`;
}

// ── Section formatter ─────────────────────────────────────────────────────────

function formatSection(
  items: string[],
  label: string,
  canSearch: boolean,
): string {
  if (items.length > 0) {
    return items.slice(0, 15).map((item) => `  - ${item}`).join("\n");
  }
  const hint = canSearch
    ? `search for today's ${label} stories`
    : "use general knowledge";
  return `  [no pre-fetched data — ${hint}]`;
}

// ── Main prompt builder ───────────────────────────────────────────────────────

export function buildPrompt(
  data: Omit<PreFetchedData, "market">,
  options: { searchHint?: boolean } = {},
): string {
  const { searchHint = false } = options;

  const supplement = searchHint
    ? "\n\nYou have live web search — use it to supplement any section with REAL, verifiable today's news. Only include items you can confirm via search. Prefer the pre-fetched data below."
    : "\n\nUse ONLY the pre-fetched data below. If a section has no pre-fetched data, SKIP it rather than guessing.";

  // Blend tech + HN for tech section
  const techCombined = [
    ...data.techNews.slice(0, 10),
    ...data.hn.slice(0, 5).map((h) => `**${h}**`),
  ];

  const hnLines = data.hn.slice(0, 10).map((h) => `  - ${h}`).join("\n") || "  [fetch failed]";

  return `You are a smart personal daily briefing writer. Your reader is a software engineer \
based in India who actively invests globally (Indian mutual funds, US stocks, UCITS, \
global equities), follows AI/startups/tech, and wants to stay informed about career \
opportunities, market moves, and emerging sectors without missing anything important.

Today is ${DATE_HUMAN}.

NOTE: The Markets section (prices, indices) is handled separately — do NOT generate \
any market data or prices. Focus ONLY on news and insights.${supplement}

ACCURACY RULES (CRITICAL):
1. Use ONLY the headlines from the pre-fetched data. You may rephrase for brevity but NEVER invent.
2. If a section's data says "[no pre-fetched data]", SKIP THE SECTION ENTIRELY.
3. If a section would have fewer than 2 real items, skip it completely.
4. Prefer major sources (Reuters, AP, BBC, Bloomberg, TechCrunch, Economic Times).
5. NEVER fabricate numbers (funding amounts, percentages, price targets).
6. NEVER pad with quotes, "Quote of the day", generic tips, or filler.

GLOBAL NEWS (verified headlines):
${formatSection(data.globalNews, "global", searchHint)}

INDIA NEWS (verified headlines):
${formatSection(data.indiaNews, "India", searchHint)}

TECH / AI (verified headlines):
${formatSection(techCombined, "tech/AI", searchHint)}

STARTUPS & FUNDING (verified headlines):
${formatSection(data.startupsNews, "startups/funding", searchHint)}

INVESTING & PREDICTIONS (verified headlines):
${formatSection(data.investingNews, "investing/markets", searchHint)}

CAREER & OPPORTUNITIES (verified headlines):
${formatSection(data.careerNews, "career/jobs", searchHint)}

PERSONAL FINANCE (verified headlines):
${formatSection(data.pfNews, "personal finance", searchHint)}

HACKER NEWS (developer community — real titles):
${hnLines}

${buildFormatSpec()}`;
}
