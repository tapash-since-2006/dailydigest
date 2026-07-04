export interface User {
  id: number
  email: string
  createdAt: string
}

export interface DigestSummary {
  id: number
  date: string
  provider_used: string
  fallback_level: number
  created_at: string
  readingTimeMinutes: number
  summary: string
}

export interface DigestFull {
  id: number
  date: string
  dateHuman: string
  html: string
  markdown: string
  providerUsed: string
  fallbackLevel: number
  createdAt: string
  readingTimeMinutes: number
  summary: string
  marketData: Record<string, { price: string; change: string; positive: boolean }>
}

export interface GenerateResponse {
  date: string
  dateHuman: string
  providerUsed: string
  fallbackLevel: number
  generationDurationMs: number
  digestId: number
  attempts: ProviderAttempt[]
  readingTimeMinutes: number
  summary: string
}

export interface ProviderAttempt {
  provider: string
  level: number
  success: boolean
  latencyMs: number
  error?: string
  tokensUsed?: number
}

export interface ProviderStat {
  provider: string
  total: string
  successes: string
  avg_latency_ms: number
}

export interface ProviderLog {
  id: number
  digest_date: string
  provider: string
  fallback_level: number
  success: boolean
  latency_ms: number
  error_message: string | null
  tokens_used: number | null
  created_at: string
}

export interface SearchResult {
  date: string
  dateHuman: string
  excerpt: string
}

export interface CronStatus {
  nextRun: string
  lastRun: string | null
  enabled: boolean
}

export interface BookmarkEntry {
  date: string
  created_at: string
  provider_used: string
  fallback_level: number
}

export interface HistoryEntry {
  date: string
  viewed_at: string
}

export interface RatingData {
  thumbs_up: string
  thumbs_down: string
  total: string
}

export interface CostStat {
  provider: string
  totalTokens: number
  successfulCalls: number
  totalCalls: number
  estimatedCostUsd: number
}

export interface CostData {
  perProvider: CostStat[]
  totalCostUsd: number
  perDay: { date: string; tokens: string; successes: string }[]
  note: string
}

export interface CompareData {
  date1: string
  date2: string
  date1Provider: string
  date2Provider: string
  onlyInDate1: number
  onlyInDate2: number
  inBoth: number
  newStoriesInDate2: string[]
  droppedFromDate1: string[]
  continuingStories: string[]
}
