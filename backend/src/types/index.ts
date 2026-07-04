/**
 * types/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared types used across the entire backend.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Market Data ───────────────────────────────────────────────────────────────

export interface QuoteResult {
  price: string;
  change: string;
}

export interface MarketMover {
  symbol: string;
  name: string;
  change: string;
  price: string;
}

export interface MarketData {
  indices: Record<string, QuoteResult>;
  crypto: Record<string, QuoteResult>;
  forex: Record<string, QuoteResult>;
  commodities: Record<string, QuoteResult>;
  usMovers: { gainers: MarketMover[]; losers: MarketMover[] };
  indiaMovers: { gainers: MarketMover[]; losers: MarketMover[] };
}

// ── News / Content ────────────────────────────────────────────────────────────

export interface NewsItem {
  title: string;
  url?: string;
  source?: string;
  publishedAt?: string;
}

export interface PreFetchedData {
  market: MarketData;
  hn: string[];
  globalNews: string[];
  indiaNews: string[];
  techNews: string[];
  startupsNews: string[];
  investingNews: string[];
  careerNews: string[];
  pfNews: string[];
}

// ── Digest Generation ─────────────────────────────────────────────────────────

export type FallbackLevel = 1 | 2 | 2.5 | 3 | 4 | 5;

export type ProviderName =
  | "gemini" | "openai-search" | "openrouter-search" | "deepseek-search"
  | "xai-search" | "claude"
  | "openai" | "groq" | "mistral" | "fireworks" | "moonshot"
  | "minimax" | "zai" | "openrouter-free" | "github-models"
  | "ollama" | "direct-assembly" | "data-template" | "blank-template";

export interface ProviderAttempt {
  provider: ProviderName;
  level: FallbackLevel;
  success: boolean;
  latencyMs: number;
  error?: string;
  tokensUsed?: number;
}

export interface GenerationResult {
  markdown: string;
  html: string;
  providerUsed: ProviderName;
  fallbackLevel: FallbackLevel;
  attempts: ProviderAttempt[];
  generationDurationMs: number;
  date: string;          // YYYY-MM-DD
  dateHuman: string;     // May 22, 2026
}

// ── Database Records ──────────────────────────────────────────────────────────

export interface DigestRecord {
  id: number;
  date: string;
  markdown: string;
  html: string;
  provider_used: ProviderName;
  fallback_level: number;
  generation_duration_ms: number;
  created_at: Date;
  updated_at: Date;
}

export interface ProviderLogRecord {
  id: number;
  digest_date: string;
  provider: ProviderName;
  fallback_level: number;
  success: boolean;
  latency_ms: number;
  error_message?: string;
  tokens_used?: number;
  created_at: Date;
}

// ── API Response Shapes ───────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface GenerateDigestRequest {
  date?: string;       // YYYY-MM-DD — defaults to today
  force?: boolean;     // regenerate even if digest already exists
  testMode?: boolean;  // validate all providers without saving
}

export interface GenerateDigestResponse {
  date: string;
  dateHuman: string;
  providerUsed: ProviderName;
  fallbackLevel: FallbackLevel;
  generationDurationMs: number;
  attempts: ProviderAttempt[];
  digestId: number;
}

export interface GetDigestResponse {
  date: string;
  dateHuman: string;
  html: string;
  providerUsed: ProviderName;
  fallbackLevel: FallbackLevel;
  createdAt: string;
}

// ── RSS / Feed ────────────────────────────────────────────────────────────────

export interface FeedItem {
  title: string;
  link?: string;
  pubDate?: string;
  contentSnippet?: string;
}
