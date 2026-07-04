# Daily Digest Engine

> AI-powered automated daily briefing platform — newspaper editorial UI, 6-level AI fallback chain, provider observability, JWT auth, email delivery, and more.

```
digest/
├── backend/    — Node.js + Express + TypeScript + PostgreSQL
└── frontend/   — React + Vite + TypeScript + Tailwind CSS
```

---

## Prerequisites

Make sure these are installed before starting:

- **Node.js** v18 or higher — [nodejs.org](https://nodejs.org)
- **PostgreSQL** — running locally (pgAdmin app or native install)
- A code editor like **VS Code**

---

## Step 1 — Set up the database

Open **pgAdmin** (or any PostgreSQL client) and run:

```sql
CREATE DATABASE daily_digest;
```

That's it. The migration script creates all tables automatically.

---

## Step 2 — Set up the backend

Open a terminal and navigate into the backend folder:

```bash
cd digest/backend
```

Install dependencies:

```bash
npm install
```

Create your environment file:

```bash
# Windows
copy .env.example .env

# Mac / Linux
cp .env.example .env
```

Open `.env` in VS Code and fill in your values:

```env
# Required
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/daily_digest
JWT_SECRET=any-long-random-string-like-this-abc123xyz789

# At least one AI key (Groq is free and fast)
GROQ_API_KEY=your_groq_key_here

# At least one news key (Tavily is free)
TAVILY_API_KEY=your_tavily_key_here

# Optional but recommended
GEMINI_API_KEY=
NEWS_API_KEY=
FINNHUB_API_KEY=
RESEND_API_KEY=    # only needed for email delivery
```

Run database migrations (creates all tables):

```bash
npm run db:migrate
```

You should see:
```
✓ Migrations applied successfully.
```

Start the backend server:

```bash
npm run dev
```

You should see:
```
[INFO  ] Server on port 3000 [development]
[CRON  ] Scheduler started — next run at 07:00 IST
```

**Backend is now running at `http://localhost:3000`**

---

## Step 3 — Set up the frontend

Open a **new terminal** (keep the backend running) and navigate to the frontend:

```bash
cd digest/frontend
```

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in 300ms
  ➜  Local:   http://localhost:5173/
```

**Frontend is now running at `http://localhost:5173`**

---

## Step 4 — First use

1. Open your browser and go to **`http://localhost:5173`**
2. Click **Sign In** → **Register** to create an account
3. After registering you'll be redirected to the homepage
4. Click **Today's Digest** in the navbar
5. Click **Generate** — this triggers the full pipeline:
   - Fetches market data from Yahoo Finance, NSE, Finnhub
   - Fetches news from 40+ RSS feeds, Hacker News, Tavily
   - Runs the AI fallback chain (Groq → other providers → direct assembly)
   - Saves to PostgreSQL
   - Returns the digest

Generation takes **10–30 seconds** depending on which AI provider succeeds.

---

## Where to get API keys

All free tiers — you only need the ones you want to use:

| Key | Where to get | Free tier |
|-----|-------------|-----------|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) | Very generous |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) | Free |
| `TAVILY_API_KEY` | [tavily.com](https://tavily.com) | 1000/month |
| `NEWS_API_KEY` | [newsapi.org](https://newsapi.org) | 100/day |
| `FINNHUB_API_KEY` | [finnhub.io](https://finnhub.io) | Free tier |
| `RESEND_API_KEY` | [resend.com](https://resend.com) | 3000/month |

**Minimum to run:** `DATABASE_URL` + `JWT_SECRET` + one AI key + one news key.

---

## Pages

| URL | What it does | Auth required |
|-----|-------------|---------------|
| `/` | Homepage — hero, archive, market ticker | No |
| `/digest/:date` | Read a digest, generate, bookmark, rate | Generate requires login |
| `/search` | Full-text search across all digests | No |
| `/compare` | Compare stories between two dates | No |
| `/dashboard` | Provider charts, cost tracker, logs | Yes |
| `/bookmarks` | Your saved digests | Yes |
| `/settings` | Email delivery, cron schedule, provider status | Yes |
| `/login` | Sign in | No |
| `/register` | Create account | No |

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `G` | Jump to today's digest |
| `/` | Focus search bar |

Click **Shortcuts** in the navbar to see the panel.

---

## Auto-generation

The backend automatically generates a digest every day at **07:00 IST** via a cron job — no manual trigger needed once the server is running. You can see the countdown to the next run on the Settings page.

---

## API endpoints (for Postman / testing)

```
GET    /health
POST   /api/auth/register          { email, password }
POST   /api/auth/login             { email, password }
GET    /api/digest/:date
GET    /api/digests
POST   /api/generate-digest        { date, force }     ← requires auth header
GET    /api/search?q=keyword
GET    /api/digest/compare?date1=&date2=
GET    /api/stats/providers
GET    /api/stats/providers/:date
GET    /api/stats/costs
GET    /api/feed.rss
POST   /api/bookmarks/:date        ← requires auth
DELETE /api/bookmarks/:date        ← requires auth
GET    /api/bookmarks              ← requires auth
POST   /api/ratings/:date          { rating: 1 | -1 }  ← requires auth
GET    /api/ratings/:date
GET    /api/settings/email
POST   /api/settings/email         { email, enabled }
POST   /api/settings/email/test
GET    /api/cron/status
```

For protected endpoints, add this header:
```
Authorization: Bearer <token from login response>
```

---

## Tech stack

**Backend:** TypeScript · Node.js · Express · PostgreSQL · node-cron · bcryptjs · jsonwebtoken · axios · rss-parser · marked

**Frontend:** React 18 · Vite · TypeScript · Tailwind CSS · Recharts · React Router · date-fns · Lucide React

---

## Common issues

**`Migration failed: password must be a string`**
→ Your `.env` file isn't being loaded. Make sure it's in `digest/backend/` (same folder as `package.json`), not inside `src/`. Also make sure there are no quotes around values.

**`Cannot find module` on npm run dev**
→ Run `npm install` first.

**Digest generation returns `direct-assembly` (Level 3)**
→ Your AI API keys aren't working. Check they're set correctly in `.env` with no spaces or quotes. Restart the server after editing `.env`.

**Frontend shows blank page**
→ Make sure the backend is running on port 3000 before starting the frontend. The Vite proxy needs the backend alive.
