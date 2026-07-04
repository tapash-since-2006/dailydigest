/**
 * routes/digest.ts
 * All digest-related API routes with reading time + summary extraction.
 * Bugs fixed: date conversion, auth only on protected routes.
 */
import dotenv from "dotenv";
dotenv.config();

import { Router, Request, Response } from "express";
import { log, getISTDateISO } from "../utils";
import { fetchMarketData } from "../fetchers/market";
import { prefetchAllNews } from "../fetchers/news";
import { runFallbackChain } from "../fallback/chain";
import {
  getDigestByDate,
  getDigestList,
  upsertDigest,
  insertProviderAttempts,
  getProviderStats,
  getProviderLogsByDate,
} from "../db";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function calculateReadingTime(markdown: string): number {
  const plainText = markdown
    .replace(/^---[\s\S]*?---/m, "")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/\[SRC:[^\]]+\]/g, "")
    .replace(/[-*]\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = plainText.split(" ").filter(Boolean).length;
  return Math.ceil(wordCount / 200);
}

function extractSummary(markdown: string): string {
  const match = markdown.match(/summary:\s*["']?([^"'\n]+)["']?/);
  return match ? match[1].trim() : "";
}

function extractMarketData(
  markdown: string,
): Record<string, { price: string; change: string; positive: boolean }> {
  const markets: Record<
    string,
    { price: string; change: string; positive: boolean }
  > = {};
  const lines = markdown.split("\n");
  for (const line of lines) {
    const match = line.match(
      /[-*]?\s*\*{0,2}([^:*\n]+?)\*{0,2}:\s*([\d,\.]+)\s*\(([+-][\d\.]+%)\)/,
    );
    if (match) {
      const name = match[1]
        .trim()
        .replace(/^\*+|\*+$/g, "")
        .trim();
      const price = match[2].trim();
      const change = match[3].trim();
      if (name && price && change) {
        markets[name] = { price, change, positive: change.startsWith("+") };
      }
    }
  }
  return markets;
}

function safeDate(d: any): string {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/digest/compare
router.get("/api/digest/compare", async (req: Request, res: Response) => {
  const { date1, date2 } = req.query as { date1: string; date2: string };
  if (!date1 || !date2) {
    return res
      .status(400)
      .json({ success: false, error: "date1 and date2 are required" });
  }
  try {
    const [d1, d2] = await Promise.all([
      getDigestByDate(date1),
      getDigestByDate(date2),
    ]);
    if (!d1)
      return res
        .status(404)
        .json({ success: false, error: `No digest for ${date1}` });
    if (!d2)
      return res
        .status(404)
        .json({ success: false, error: `No digest for ${date2}` });

    function extractHeadlines(markdown: string): string[] {
      return markdown
        .split("\n")
        .filter((l) => l.match(/^-\s+\*\*/))
        .map((l) =>
          l
            .replace(/^-\s+\*\*/, "")
            .replace(/\*\*.*$/, "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean);
    }

    const h1 = new Set(extractHeadlines(d1.markdown));
    const h2 = new Set(extractHeadlines(d2.markdown));
    const onlyIn1 = [...h1].filter((h) => !h2.has(h));
    const onlyIn2 = [...h2].filter((h) => !h1.has(h));
    const inBoth = [...h1].filter((h) => h2.has(h));

    return res.json({
      success: true,
      data: {
        date1,
        date2,
        date1Provider: d1.provider_used,
        date2Provider: d2.provider_used,
        onlyInDate1: onlyIn1.length,
        onlyInDate2: onlyIn2.length,
        inBoth: inBoth.length,
        newStoriesInDate2: onlyIn2,
        droppedFromDate1: onlyIn1,
        continuingStories: inBoth,
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: (err as Error).message });
  }
});

// GET /api/digest/:date  — PUBLIC
router.get(
  "/api/digest/:date",
  async (req: Request<{ date: string }>, res: Response) => {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res
        .status(400)
        .json({ success: false, error: "date must be YYYY-MM-DD" });
    }
    try {
      const digest = await getDigestByDate(date);
      if (!digest)
        return res
          .status(404)
          .json({ success: false, error: `No digest found for ${date}` });

      const cleanDate = safeDate(digest.date);

      return res.json({
        success: true,
        data: {
          id: digest.id,
          date: cleanDate,
          // Fixed dateHuman string formatting directly pinned to UTC
          dateHuman: new Date(`${cleanDate}T00:00:00Z`).toLocaleDateString(
            "en-US",
            {
              timeZone: "UTC",
              month: "long",
              day: "2-digit",
              year: "numeric",
            },
          ),
          html: digest.html,
          markdown: digest.markdown,
          providerUsed: digest.provider_used,
          fallbackLevel: digest.fallback_level,
          createdAt: digest.created_at.toISOString(),
          readingTimeMinutes: calculateReadingTime(digest.markdown),
          summary: extractSummary(digest.markdown),
          marketData: extractMarketData(digest.markdown),
        },
      });
    } catch (err) {
      return res
        .status(500)
        .json({ success: false, error: (err as Error).message });
    }
  },
);

// GET /api/digests  — PUBLIC
router.get("/api/digests", async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "30"), 10), 100);
  const offset = parseInt(String(req.query.offset ?? "0"), 10);
  try {
    const digests = await getDigestList(limit, offset);
    const enriched = await Promise.all(
      digests.map(async (d: any) => {
        const dateStr = safeDate(d.date);
        const full = await getDigestByDate(dateStr).catch(() => null);
        return {
          ...d,
          date: dateStr,
          readingTimeMinutes: full ? calculateReadingTime(full.markdown) : 5,
          summary: full ? extractSummary(full.markdown) : "",
        };
      }),
    );
    return res.json({ success: true, data: enriched, limit, offset });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: (err as Error).message });
  }
});

// POST /api/generate-digest  — PROTECTED
router.post(
  "/api/generate-digest",
  authMiddleware,
  async (req: Request, res: Response) => {
    const { date, force = false, testMode = false } = req.body ?? {};
    const targetDate = date ?? getISTDateISO();
    log("API", `POST /generate-digest — date=${targetDate}, force=${force}`);

    if (!force && !testMode) {
      const existing = await getDigestByDate(targetDate).catch(() => null);
      if (existing) {
        return res.status(409).json({
          success: false,
          error: `Digest for ${targetDate} already exists. Use force=true to regenerate.`,
        });
      }
    }

    try {
      const market = await fetchMarketData();
      const news = await prefetchAllNews(market);
      const result = await runFallbackChain({ market, ...news });

      if (testMode)
        return res.json({ success: true, data: { ...result, digestId: -1 } });

      const saved = await upsertDigest({
        date: targetDate, // Uses strict target date
        markdown: result.markdown,
        html: result.html,
        providerUsed: result.providerUsed,
        fallbackLevel: result.fallbackLevel,
        generationDurationMs: result.generationDurationMs,
      });

      await insertProviderAttempts(targetDate, result.attempts);

      return res.status(201).json({
        success: true,
        data: {
          date: targetDate,
          // Fixed dateHuman string formatting directly pinned to UTC
          dateHuman: new Date(`${targetDate}T00:00:00Z`).toLocaleDateString(
            "en-US",
            {
              timeZone: "UTC",
              month: "long",
              day: "2-digit",
              year: "numeric",
            },
          ),
          providerUsed: result.providerUsed,
          fallbackLevel: result.fallbackLevel,
          generationDurationMs: result.generationDurationMs,
          attempts: result.attempts,
          digestId: saved.id,
          readingTimeMinutes: calculateReadingTime(result.markdown),
          summary: extractSummary(result.markdown),
        },
      });
    } catch (err) {
      return res
        .status(500)
        .json({ success: false, error: (err as Error).message });
    }
  },
);

// GET /api/stats/providers  — PUBLIC
router.get("/api/stats/providers", async (_req, res) => {
  try {
    const stats = await getProviderStats();
    return res.json({ success: true, data: stats });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, error: (err as Error).message });
  }
});

// GET /api/stats/providers/:date  — PUBLIC
router.get(
  "/api/stats/providers/:date",
  async (req: Request<{ date: string }>, res: Response) => {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res
        .status(400)
        .json({ success: false, error: "date must be YYYY-MM-DD" });
    }
    try {
      const logs = await getProviderLogsByDate(date);
      return res.json({ success: true, data: logs });
    } catch (err) {
      return res
        .status(500)
        .json({ success: false, error: (err as Error).message });
    }
  },
);

// GET /health
router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "daily-digest-api",
  });
});

export default router;
