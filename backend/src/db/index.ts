/**
 * db/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * PostgreSQL client (via pg), schema, and all query helpers.
 *
 * Tables:
 *   digests         — one row per date; stores markdown + html + metadata
 *   provider_logs   — one row per provider attempt; used for observability
 *   article_seen    — deduplication fingerprints across runs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Pool, PoolClient } from "pg";
import { KEYS } from "../config";
import { log } from "../utils";
import {
  DigestRecord,
  ProviderLogRecord,
  ProviderAttempt,
  ProviderName,
  FallbackLevel,
} from "../types";

// ── Pool singleton ────────────────────────────────────────────────────────────

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: KEYS.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    _pool.on("error", (err) => {
      log("ERROR", `PostgreSQL pool error: ${err.message}`);
    });
  }
  return _pool;
}

export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}

// ── Schema migration ──────────────────────────────────────────────────────────

export async function runMigrations(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    log("DB", "Running migrations...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS digests (
        id                     SERIAL PRIMARY KEY,
        date                   DATE        NOT NULL UNIQUE,
        markdown               TEXT        NOT NULL,
        html                   TEXT        NOT NULL,
        provider_used          VARCHAR(64) NOT NULL,
        fallback_level         NUMERIC(3,1) NOT NULL,
        generation_duration_ms INTEGER     NOT NULL DEFAULT 0,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS provider_logs (
        id              SERIAL PRIMARY KEY,
        digest_date     DATE        NOT NULL,
        provider        VARCHAR(64) NOT NULL,
        fallback_level  NUMERIC(3,1) NOT NULL,
        success         BOOLEAN     NOT NULL,
        latency_ms      INTEGER     NOT NULL,
        error_message   TEXT,
        tokens_used     INTEGER,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS article_seen (
        id           SERIAL PRIMARY KEY,
        fingerprint  VARCHAR(128) NOT NULL UNIQUE,
        title        TEXT        NOT NULL,
        section      VARCHAR(32),
        first_seen   DATE        NOT NULL DEFAULT CURRENT_DATE,
        last_seen    DATE        NOT NULL DEFAULT CURRENT_DATE
      );
    `);

    // Indices for common query patterns
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_digests_date
        ON digests (date DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_provider_logs_date
        ON provider_logs (digest_date DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_provider_logs_provider
        ON provider_logs (provider, success);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_article_seen_fp
        ON article_seen (fingerprint);
    `);

    log("DB", "Migrations complete.");
  } finally {
    client.release();
  }
}

// ── Digest queries ────────────────────────────────────────────────────────────

export async function getDigestByDate(
  date: string,
): Promise<DigestRecord | null> {
  const pool = getPool();
  const result = await pool.query<DigestRecord>(
    `SELECT * FROM digests WHERE date = $1 LIMIT 1`,
    [date],
  );
  return result.rows[0] ?? null;
}

export async function getDigestList(
  limit = 30,
  offset = 0,
): Promise<Pick<DigestRecord, "id" | "date" | "provider_used" | "fallback_level" | "created_at">[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, date, provider_used, fallback_level, created_at
     FROM digests
     ORDER BY date DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  return result.rows;
}

export async function upsertDigest(params: {
  date: string;
  markdown: string;
  html: string;
  providerUsed: ProviderName;
  fallbackLevel: FallbackLevel;
  generationDurationMs: number;
}): Promise<DigestRecord> {
  const pool = getPool();
  const result = await pool.query<DigestRecord>(
    `INSERT INTO digests
       (date, markdown, html, provider_used, fallback_level, generation_duration_ms, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (date) DO UPDATE SET
       markdown               = EXCLUDED.markdown,
       html                   = EXCLUDED.html,
       provider_used          = EXCLUDED.provider_used,
       fallback_level         = EXCLUDED.fallback_level,
       generation_duration_ms = EXCLUDED.generation_duration_ms,
       updated_at             = NOW()
     RETURNING *`,
    [
      params.date,
      params.markdown,
      params.html,
      params.providerUsed,
      params.fallbackLevel,
      params.generationDurationMs,
    ],
  );
  return result.rows[0];
}

// ── Provider log queries ──────────────────────────────────────────────────────

export async function insertProviderAttempts(
  digestDate: string,
  attempts: ProviderAttempt[],
): Promise<void> {
  if (attempts.length === 0) return;

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const attempt of attempts) {
      await client.query(
        `INSERT INTO provider_logs
           (digest_date, provider, fallback_level, success, latency_ms, error_message, tokens_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          digestDate,
          attempt.provider,
          attempt.level,
          attempt.success,
          attempt.latencyMs,
          attempt.error ?? null,
          attempt.tokensUsed ?? null,
        ],
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getProviderStats(): Promise<
  { provider: string; total: number; successes: number; avg_latency_ms: number }[]
> {
  const pool = getPool();
  const result = await pool.query(`
    SELECT
      provider,
      COUNT(*)                          AS total,
      SUM(CASE WHEN success THEN 1 ELSE 0 END) AS successes,
      AVG(latency_ms)::INTEGER          AS avg_latency_ms
    FROM provider_logs
    GROUP BY provider
    ORDER BY successes DESC
  `);
  return result.rows;
}

export async function getProviderLogsByDate(
  date: string,
): Promise<ProviderLogRecord[]> {
  const pool = getPool();
  const result = await pool.query<ProviderLogRecord>(
    `SELECT * FROM provider_logs WHERE digest_date = $1 ORDER BY created_at`,
    [date],
  );
  return result.rows;
}

// ── Article deduplication ─────────────────────────────────────────────────────

export async function markArticlesSeen(
  articles: { fingerprint: string; title: string; section?: string }[],
): Promise<void> {
  if (articles.length === 0) return;
  const pool = getPool();

  for (const art of articles) {
    await pool.query(
      `INSERT INTO article_seen (fingerprint, title, section)
       VALUES ($1, $2, $3)
       ON CONFLICT (fingerprint) DO UPDATE SET last_seen = CURRENT_DATE`,
      [art.fingerprint, art.title, art.section ?? null],
    ).catch(() => {
      // Non-fatal — dedup is best-effort
    });
  }
}

export async function filterUnseenArticles(
  fingerprints: string[],
): Promise<Set<string>> {
  if (fingerprints.length === 0) return new Set();
  const pool = getPool();
  const result = await pool.query(
    `SELECT fingerprint FROM article_seen WHERE fingerprint = ANY($1)`,
    [fingerprints],
  );
  return new Set(result.rows.map((r) => r.fingerprint as string));
}
