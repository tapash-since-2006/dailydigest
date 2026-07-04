/**
 * routes/email.ts
 */
import { Router, Request, Response } from 'express'
import { getPool, getDigestByDate } from '../db'
import { log, getISTDateISO } from '../utils'
import axios from 'axios'

const router = Router()
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''

async function ensureSettingsTable() {
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key   VARCHAR(64) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function getSettings(): Promise<Record<string, string>> {
  await ensureSettingsTable()
  const pool = getPool()
  const result = await pool.query('SELECT key, value FROM settings')
  const map: Record<string, string> = {}
  result.rows.forEach((r: any) => { map[r.key] = r.value })
  return map
}

router.get('/api/settings/email', async (_req, res) => {
  try {
    const map = await getSettings()
    return res.json({ success: true, data: { email: map['email_address'] ?? '', enabled: map['email_enabled'] === 'true' } })
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.post('/api/settings/email', async (req: Request, res: Response) => {
  const { email, enabled } = req.body ?? {}
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'email is required' })
  }
  try {
    await ensureSettingsTable()
    const pool = getPool()
    for (const [key, value] of [['email_address', email], ['email_enabled', enabled ? 'true' : 'false']]) {
      await pool.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, value]
      )
    }
    return res.json({ success: true, message: 'Email settings saved' })
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message })
  }
})

// POST /api/settings/email/test — send test email immediately
router.post('/api/settings/email/test', async (_req, res) => {
  try {
    const map = await getSettings()
    const emailAddr = map['email_address']
    if (!emailAddr) {
      return res.status(400).json({ success: false, error: 'No email address configured. Save your email in settings first.' })
    }
    if (!RESEND_API_KEY) {
      return res.status(400).json({ success: false, error: 'RESEND_API_KEY not configured on server.' })
    }

    const date = getISTDateISO()
    const digest = await getDigestByDate(date).catch(() => null)
    const html = digest?.html ?? `<html><body><h1>Daily Digest Test</h1><p>Test email from Daily Digest Engine. No digest generated yet for ${date}.</p></body></html>`

    await sendEmail(html, `Test — Daily Digest ${date}`, emailAddr)
    return res.json({ success: true, message: `Test email sent to ${emailAddr}` })
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message })
  }
})

export async function sendDigestEmail(html: string, date: string): Promise<void> {
  if (!RESEND_API_KEY) { log('WARN', 'RESEND_API_KEY not set — skipping email'); return }
  const map = await getSettings().catch(() => ({} as Record<string, string>))
  if (map['email_enabled'] !== 'true' || !map['email_address']) return
  await sendEmail(html, `Daily Digest — ${date}`, map['email_address'])
}

async function sendEmail(html: string, subject: string, to: string): Promise<void> {
  await axios.post(
    'https://api.resend.com/emails',
    { from: 'Daily Digest <onboarding@resend.dev>', to: [to], subject, html },
    { headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 15_000 }
  )
  log('INFO', `Email sent to ${to}: ${subject}`)
}

export default router
