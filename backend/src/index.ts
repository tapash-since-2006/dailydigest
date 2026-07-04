import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import { SERVER } from './config'
import { log } from './utils'
import { runMigrations, closePool } from './db'
import digestRouter from './routes/digest'
import searchRouter from './routes/search'
import emailRouter from './routes/email'
import authRouter from './routes/auth'
import featuresRouter from './routes/features'
import { startCron, getCronInfo } from './cron'

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use((req, _res, next) => {
  log('API', `${req.method} ${req.path}`)
  next()
})

app.get('/api/cron/status', (_req, res) => {
  res.json({ success: true, data: getCronInfo() })
})

app.use('/', authRouter)
app.use('/', digestRouter)
app.use('/', searchRouter)
app.use('/', emailRouter)
app.use('/', featuresRouter)

app.use((_req, res) => res.status(404).json({ success: false, error: 'Route not found' }))
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log('ERROR', `Unhandled: ${err.message}`)
  res.status(500).json({ success: false, error: 'Internal server error' })
})

async function start(): Promise<void> {
  try {
    await runMigrations()
    startCron()
    app.listen(SERVER.PORT, () => {
      log('INFO', `Server on port ${SERVER.PORT} [${SERVER.NODE_ENV}]`)
      log('INFO', `RSS Feed: http://localhost:${SERVER.PORT}/api/feed.rss`)
    })
  } catch (err) {
    log('ERROR', `Boot failed: ${(err as Error).message}`)
    process.exit(1)
  }
}

process.on('SIGTERM', async () => { await closePool(); process.exit(0) })
process.on('SIGINT',  async () => { await closePool(); process.exit(0) })

start()
