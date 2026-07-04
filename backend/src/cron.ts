/**
 * cron.ts — Auto-generates digest at 07:00 IST daily
 */
import cron from 'node-cron'
import { log, getISTDateISO } from './utils'
import { fetchMarketData } from './fetchers/market'
import { prefetchAllNews } from './fetchers/news'
import { runFallbackChain } from './fallback/chain'
import { upsertDigest, insertProviderAttempts, getDigestByDate } from './db'
import { sendDigestEmail } from './routes/email'

let lastRun: string | null = null

function getNextRunTime(): string {
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 3600000 - now.getTimezoneOffset() * 60000)
  const next = new Date(ist)
  next.setHours(7, 0, 0, 0)
  if (next <= ist) next.setDate(next.getDate() + 1)
  return new Date(next.getTime() - 5.5 * 3600000 + now.getTimezoneOffset() * 60000).toISOString()
}

export function getCronInfo() {
  return { nextRun: getNextRunTime(), lastRun, enabled: true }
}

export function startCron(): void {
  cron.schedule('30 1 * * *', async () => {
    const date = getISTDateISO()
    log('INFO', `[CRON] Auto-generation for ${date}`)
    try {
      const existing = await getDigestByDate(date).catch(() => null)
      if (existing) { log('INFO', `[CRON] Already exists — skipping`); lastRun = new Date().toISOString(); return }
      const market = await fetchMarketData()
      const news = await prefetchAllNews(market)
      const result = await runFallbackChain({ market, ...news })
      const saved = await upsertDigest({
        date: result.date, markdown: result.markdown, html: result.html,
        providerUsed: result.providerUsed, fallbackLevel: result.fallbackLevel,
        generationDurationMs: result.generationDurationMs,
      })
      await insertProviderAttempts(result.date, result.attempts)
      await sendDigestEmail(result.html, result.dateHuman)
      log('INFO', `[CRON] ✓ Saved id=${saved.id}, provider=${result.providerUsed}`)
    } catch (err) {
      log('ERROR', `[CRON] Failed: ${(err as Error).message}`)
    }
    lastRun = new Date().toISOString()
  }, { timezone: 'Asia/Kolkata' })

  log('INFO', `[CRON] Scheduler started — next run at 07:00 IST`)
}
