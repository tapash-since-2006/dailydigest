/**
 * middleware/auth.ts
 * JWT authentication middleware.
 * Attach to any route that requires login.
 */
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'daily-digest-secret-change-in-production'

export interface AuthRequest extends Request {
  userId?: number
  userEmail?: string
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' })
    return
  }

  const token = header.slice(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string }
    req.userId = decoded.userId
    req.userEmail = decoded.email
    next()
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' })
  }
}

export function generateToken(userId: number, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '30d' })
}
