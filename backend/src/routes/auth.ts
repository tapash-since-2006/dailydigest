/**
 * routes/auth.ts
 * POST /api/auth/register
 * POST /api/auth/login
 */
import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { getPool } from '../db'
import { generateToken } from '../middleware/auth'
import { log } from '../utils'

const router = Router()

// Ensure users table exists
async function ensureUsersTable() {
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      email      VARCHAR(255) UNIQUE NOT NULL,
      password   VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

// POST /api/auth/register
router.post('/api/auth/register', async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {}

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email format' })
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' })
  }

  try {
    await ensureUsersTable()
    const pool = getPool()

    // Check if user already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Email already registered' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, hashedPassword]
    )

    const user = result.rows[0]
    const token = generateToken(user.id, user.email)

    log('INFO', `New user registered: ${email}`)
    return res.status(201).json({
      success: true,
      data: { token, user: { id: user.id, email: user.email, createdAt: user.created_at } }
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message })
  }
})

// POST /api/auth/login
router.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {}

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' })
  }

  try {
    await ensureUsersTable()
    const pool = getPool()

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' })
    }

    const user = result.rows[0]
    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' })
    }

    const token = generateToken(user.id, user.email)
    log('INFO', `User logged in: ${email}`)

    return res.json({
      success: true,
      data: { token, user: { id: user.id, email: user.email, createdAt: user.created_at } }
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message })
  }
})

export default router
