/**
 * routes/features.ts
 * New features:
 * - Bookmarks (save/unsave digests)
 * - Reading History
 * - Digest Ratings (thumbs up/down)
 * - RSS Feed
 * - Provider Cost Tracker
 * - Digest Comparison
 */
import { Router, Request, Response } from 'express'
import { getPool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// ── DB Setup ──────────────────────────────────────────────────────────────────

async function ensureFeatureTables() {
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL,
      digest_date DATE NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, digest_date)
    );

    CREATE TABLE IF NOT EXISTS reading_history (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL,
      digest_date DATE NOT NULL,
      viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_reading_history_user ON reading_history(user_id, digest_date);

    CREATE TABLE IF NOT EXISTS digest_ratings (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL,
      digest_date DATE NOT NULL,
      rating      SMALLINT NOT NULL CHECK (rating IN (1, -1)),
      comment     TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, digest_date)
    );
  `)
}

// ── Bookmarks ─────────────────────────────────────────────────────────────────

// GET /api/bookmarks — get all bookmarks for logged-in user
router.get('/api/bookmarks', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await ensureFeatureTables()
    const pool = getPool()
    const result = await pool.query(
      `SELECT b.digest_date::text as date, b.created_at,
              d.provider_used, d.fallback_level
       FROM bookmarks b
       LEFT JOIN digests d ON d.date = b.digest_date
       WHERE b.user_id = $1
       ORDER BY b.digest_date DESC`,
      [req.userId]
    )
    return res.json({ success: true, data: result.rows })
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message })
  }
})

// GET /api/bookmarks/check/:date — MUST be before /api/bookmarks/:date to avoid Express matching "check" as :date
router.get('/api/bookmarks/check/:date', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { date } = req.params
  try {
    await ensureFeatureTables()
    const pool = getPool()
    const result = await pool.query(
      `SELECT id FROM bookmarks WHERE user_id = $1 AND digest_date = $2`,
      [req.userId, date]
    )
    return res.json({ success: true, data: { bookmarked: result.rows.length > 0 } })
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message })
  }
})

// POST /api/bookmarks/:date — bookmark a digest
router.post('/api/bookmarks/:date', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { date } = req.params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, error: 'date must be YYYY-MM-DD' })
  }
  try {
    await ensureFeatureTables()
    const pool = getPool()
    await pool.query(
      `INSERT INTO bookmarks (user_id, digest_date) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.userId, date]
    )
    return res.json({ success: true, message: 'Bookmarked' })
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message })
  }
})

// DELETE /api/bookmarks/:date — remove bookmark
router.delete('/api/bookmarks/:date', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { date } = req.params
  try {
    await ensureFeatureTables()
    const pool = getPool()
    await pool.query(
      `DELETE FROM bookmarks WHERE user_id = $1 AND digest_date = $2`,
      [req.userId, date]
    )
    return res.json({ success: true, message: 'Bookmark removed' })
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message })
  }
})

// ── Reading History ───────────────────────────────────────────────────────────

// POST /api/history/:date — log a view
router.post('/api/history/:date', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { date } = req.params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, error: 'invalid date' })
  }
  try {
    await ensureFeatureTables()
    const pool = getPool()
    // Only log once per day per user
    const existing = await pool.query(
      `SELECT id FROM reading_history WHERE user_id = $1 AND digest_date = $2 AND viewed_at > NOW() - INTERVAL '12 hours'`,
      [req.userId, date]
    )
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO reading_history (user_id, digest_date) VALUES ($1, $2)`,
        [req.userId, date]
      )
    }
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message })
  }
})

// GET /api/history — get reading history
router.get('/api/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await ensureFeatureTables()
    const pool = getPool()
    const result = await pool.query(
      `SELECT DISTINCT ON (digest_date) digest_date::text as date, viewed_at
       FROM reading_history WHERE user_id = $1
       ORDER BY digest_date DESC, viewed_at DESC LIMIT 30`,
      [req.userId]
    )
    return res.json({ success: true, data: result.rows })
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message })
  }
})

// ── Ratings ───────────────────────────────────────────────────────────────────

// POST /api/ratings/:date — rate a digest
router.post('/api/ratings/:date', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { date } = req.params
  const { rating, comment } = req.body ?? {}
  if (![1, -1].includes(rating)) {
    return res.status(400).json({ success: false, error: 'rating must be 1 (up) or -1 (down)' })
  }
  try {
    await ensureFeatureTables()
    const pool = getPool()
    await pool.query(
      `INSERT INTO digest_ratings (user_id, digest_date, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, digest_date) DO UPDATE SET rating = $3, comment = $4`,
      [req.userId, date, rating, comment ?? null]
    )
    return res.json({ success: true, message: 'Rating saved' })
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message })
  }
})

// GET /api/ratings/:date/mine — MUST be before /:date to avoid conflict
router.get('/api/ratings/:date/mine', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { date } = req.params
  try {
    await ensureFeatureTables()
    const pool = getPool()
    const result = await pool.query(
      `SELECT rating FROM digest_ratings WHERE user_id = $1 AND digest_date = $2`,
      [req.userId, date]
    )
    return res.json({ success: true, data: result.rows[0] ?? null })
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message })
  }
})

// GET /api/ratings/:date — get aggregate rating for a digest
router.get('/api/ratings/:date', async (req: Request, res: Response) => {
  const { date } = req.params
  try {
    await ensureFeatureTables()
    const pool = getPool()
    const result = await pool.query(
      `SELECT
         SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as thumbs_up,
         SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) as thumbs_down,
         COUNT(*) as total
       FROM digest_ratings WHERE digest_date = $1`,
      [date]
    )
    return res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message })
  }
})



// ── RSS Feed ──────────────────────────────────────────────────────────────────

router.get('/api/feed.rss', async (_req, res) => {
  try {
    const pool = getPool()
    const result = await pool.query(
      `SELECT date::text, markdown, created_at FROM digests ORDER BY date DESC LIMIT 20`
    )

    const items = result.rows.map((d: any) => {
      const summaryMatch = d.markdown.match(/summary:\s*["']?([^"'\n]+)["']?/)
      const summary = summaryMatch ? summaryMatch[1].trim() : 'Daily briefing'
      const dateHuman = new Date(d.date).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })
      const pubDate = new Date(d.created_at).toUTCString()

      return `
    <item>
      <title>Daily Digest — ${dateHuman}</title>
      <link>http://localhost:5173/digest/${d.date}</link>
      <description><![CDATA[${summary}]]></description>
      <pubDate>${pubDate}</pubDate>
      <guid>daily-digest-${d.date}</guid>
    </item>`
    }).join('\n')

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The Daily Digest</title>
    <link>http://localhost:5173</link>
    <description>AI-Powered Daily Briefing — Markets, News, Tech, India</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="http://localhost:3000/api/feed.rss" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`

    res.set('Content-Type', 'application/rss+xml; charset=utf-8')
    return res.send(rss)
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message })
  }
})

// ── Provider Cost Tracker ─────────────────────────────────────────────────────

// Cost per 1000 tokens in USD (approximate, update as needed)
const PROVIDER_COSTS: Record<string, { input: number; output: number }> = {
  'gemini':           { input: 0.0001, output: 0.0004 },
  'openai-search':    { input: 0.005,  output: 0.015  },
  'openai':           { input: 0.0004, output: 0.0016 },
  'groq':             { input: 0.0001, output: 0.0001 },
  'claude':           { input: 0.001,  output: 0.005  },
  'mistral':          { input: 0.0002, output: 0.0006 },
  'fireworks':        { input: 0.0009, output: 0.0009 },
  'openrouter-free':  { input: 0,      output: 0      },
  'openrouter-search':{ input: 0.0002, output: 0.0008 },
  'deepseek-search':  { input: 0.00027,output: 0.0011 },
  'xai-search':       { input: 0.0003, output: 0.0005 },
  'github-models':    { input: 0,      output: 0      },
}

router.get('/api/stats/costs', async (_req, res) => {
  try {
    const pool = getPool()

    // Per-provider cost
    const perProvider = await pool.query(`
      SELECT
        provider,
        SUM(tokens_used) as total_tokens,
        COUNT(*) FILTER (WHERE success) as successful_calls,
        COUNT(*) as total_calls
      FROM provider_logs
      WHERE tokens_used IS NOT NULL
      GROUP BY provider
      ORDER BY total_tokens DESC NULLS LAST
    `)

    const withCosts = perProvider.rows.map((row: any) => {
      const costs = PROVIDER_COSTS[row.provider] ?? { input: 0.001, output: 0.003 }
      const tokens = parseInt(row.total_tokens ?? '0')
      // Assume ~40% input, ~60% output split
      const estimatedCost = ((tokens * 0.4 / 1000) * costs.input) + ((tokens * 0.6 / 1000) * costs.output)
      return {
        provider: row.provider,
        totalTokens: tokens,
        successfulCalls: parseInt(row.successful_calls ?? '0'),
        totalCalls: parseInt(row.total_calls ?? '0'),
        estimatedCostUsd: parseFloat(estimatedCost.toFixed(6)),
      }
    })

    // Total cost
    const totalCost = withCosts.reduce((sum: number, r: any) => sum + r.estimatedCostUsd, 0)

    // Per-day cost (last 30 days)
    const perDay = await pool.query(`
      SELECT
        digest_date::text as date,
        SUM(tokens_used) as tokens,
        COUNT(*) FILTER (WHERE success) as successes
      FROM provider_logs
      WHERE digest_date >= CURRENT_DATE - 30
      GROUP BY digest_date
      ORDER BY digest_date ASC
    `)

    return res.json({
      success: true,
      data: {
        perProvider: withCosts,
        totalCostUsd: parseFloat(totalCost.toFixed(6)),
        perDay: perDay.rows,
        note: 'Costs are estimates based on approximate provider pricing. Actual costs may vary.'
      }
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message })
  }
})


export default router
