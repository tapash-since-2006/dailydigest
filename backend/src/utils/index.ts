/**
 * utils/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Logging (timestamped, tag-based) and retry with exponential back-off.
 * Mirrors the Python _log() and _retry() helpers exactly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { nowIST } from "../config";

// ── Logging ───────────────────────────────────────────────────────────────────

type LogTag =
  | "INFO"
  | "WARN"
  | "ERROR"
  | "DATA"
  | "AI"
  | "FETCH"
  | "DB"
  | "API"
  | "VALID";

export function log(tag: LogTag, msg: string): void {
  const now = nowIST();
  const ts = now.toTimeString().slice(0, 8); // HH:MM:SS
  const padded = tag.padEnd(6);
  console.log(`${ts} [${padded}] ${msg}`);
}

// ── Retry with exponential back-off ──────────────────────────────────────────

export async function retry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 1500,
): Promise<T> {
  let lastError: Error = new Error("No attempts made");

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < attempts - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        log(
          "WARN",
          `  retry ${attempt + 1}/${attempts} in ${(delay / 1000).toFixed(1)}s — ${lastError.message}`,
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

// ── Sleep ─────────────────────────────────────────────────────────────────────

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Date helpers ──────────────────────────────────────────────────────────────

export function getISTDateISO(): string {
  // Returns YYYY-MM-DD strictly in IST timezone (en-CA guarantees YYYY-MM-DD format)
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function getISTDateHuman(): string {
  // Returns "May 22, 2026"
  const now = nowIST();
  return now.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export function getISTDateFront(): string {
  // Returns "2026-05-22T07:00:00+05:30"
  return `${getISTDateISO()}T07:00:00+05:30`;
}

// ── Junk filter ───────────────────────────────────────────────────────────────

import { JUNK_TITLE_FRAGMENTS, HN_META_PREFIXES } from "../config";

export function isJunkTitle(title: string): boolean {
  const lower = title.toLowerCase();
  if (HN_META_PREFIXES.some((p) => lower.startsWith(p))) return true;
  if (JUNK_TITLE_FRAGMENTS.some((f) => lower.includes(f))) return true;
  return false;
}

// ── Deduplication ─────────────────────────────────────────────────────────────

export function dedupNews(
  globalNews: string[],
  indiaNews: string[],
  techNews: string[],
): [string[], string[], string[]] {
  const seen = new Set<string>();

  function key(item: string): string {
    return item.replace(/\*\*/g, "").toLowerCase().slice(0, 60).trim();
  }

  function dedup(items: string[]): string[] {
    return items.filter((item) => {
      const k = key(item);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  return [dedup(globalNews), dedup(indiaNews), dedup(techNews)];
}

// ── Timer utility ─────────────────────────────────────────────────────────────

export function timer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}

// ── Safe JSON parse ───────────────────────────────────────────────────────────

export function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
