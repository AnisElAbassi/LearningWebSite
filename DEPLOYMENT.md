# PixelGate Operations Dashboard — Deployment Guide

## Current Infrastructure (pixelgate.gg)

| Layer | Provider |
|-------|----------|
| Website hosting | **Vercel** |
| Framework | Next.js |
| Domain registrar | Namecheap |
| DNS | Google Cloud DNS |

This operations dashboard can be deployed on the **same Vercel account** for the frontend, with a separate backend service.

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│  PostgreSQL   │
│   (React)    │     │  (Express)   │     │  (Database)   │
│   Vercel     │     │   Render     │     │    Neon       │
└─────────────┘     └──────────────┘     └──────────────┘
```

---

## Step 1: Database (Neon — Free Managed PostgreSQL)

1. Go to **https://neon.tech** → Sign up (free)
2. Create a new project: `pixelgate-ops`
3. Copy the **connection string** — it looks like:
   ```
   postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Save this — you'll need it for the backend.

---

## Step 2: Backend (Render — Free Tier)

1. Go to **https://render.com** → Sign up
2. Click **New → Web Service**
3. Connect your GitHub repo (or upload manually)
4. Configure:
   - **Name:** `pixelgate-ops-api`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `node src/index.js`
   - **Instance Type:** Free

5. **Environment Variables** (add these in Render dashboard):

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | Your Neon connection string from Step 1 |
   | `JWT_SECRET` | Generate one: run `openssl rand -hex 32` in terminal |
   | `JWT_EXPIRES_IN` | `24h` |
   | `CORS_ORIGIN` | `https://ops.pixelgate.gg` (or your Vercel URL — set after Step 3) |
   | `PORT` | `10000` (Render's default) |

6. Click **Deploy** → Wait for build to complete

7. **After first deploy**, go to Render Shell and run:
   ```bash
   npx prisma migrate deploy
   node prisma/seed.js
   ```
   This creates all database tables and the admin user.

8. Note your backend URL: `https://pixelgate-ops-api.onrender.com`

---

## Step 3: Frontend (Vercel — Same Account as pixelgate.gg)

1. Go to **https://vercel.com** → Same account that hosts pixelgate.gg
2. Click **Add New → Project**
3. Import the GitHub repo
4. Configure:
   - **Framework Preset:** Create React App
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`

5. **Environment Variables:**

   | Variable | Value |
   |----------|-------|
   | `REACT_APP_API_URL` | `https://pixelgate-ops-api.onrender.com/api` |

6. Click **Deploy**

7. **(Optional) Custom domain** — In Vercel project settings → Domains:
   - Add `ops.pixelgate.gg`
   - In Namecheap DNS, add a CNAME record:
     - **Host:** `ops`
     - **Value:** `cname.vercel-dns.com`
   - Then update `CORS_ORIGIN` in Render to `https://ops.pixelgate.gg`

---

## Step 4: Verify

1. Open your frontend URL (e.g. `https://ops.pixelgate.gg`)
2. Login with:
   - **Email:** `admin@nexushq.io`
   - **Password:** `admin123`
3. **Change the admin password immediately** after first login

---

## Post-Deployment Checklist

- [ ] Database migrated (`npx prisma migrate deploy`)
- [ ] Database seeded (`node prisma/seed.js`)
- [ ] Admin password changed
- [ ] `CORS_ORIGIN` updated to match actual frontend URL
- [ ] `JWT_SECRET` is a strong random value (not the default)
- [ ] Custom domain configured (optional)

---

## File Structure

```
backend/
  src/
    index.js          ← Express server entry point
    routes/           ← 18 API route files
    middleware/        ← Auth + permissions
  prisma/
    schema.prisma     ← Database schema (30+ tables)
    seed.js           ← Initial data (roles, permissions, admin user, lookups)
  package.json
  .env                ← Local env (DO NOT deploy this file — use platform env vars)

frontend/
  src/
    App.js            ← React router
    pages/            ← 17 page components
    components/       ← Shared UI components
    hooks/            ← useApi, useI18n (language/currency)
    store/            ← Redux state
    utils/            ← API client, translations (EN/FR/AR)
  package.json
  tailwind.config.js
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, Framer Motion, FullCalendar, Chart.js, Redux Toolkit |
| Backend | Node.js, Express, Prisma ORM |
| Database | PostgreSQL |
| Auth | JWT with role-based permissions (Admin, Operations, Sales, Technician) |
| Languages | English, French, Arabic (RTL supported) |
| Currencies | EUR, USD, GBP, MAD, AED, SAR, TND, CHF, CAD |

---

## Costs

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Neon (PostgreSQL) | Free tier | $0 |
| Render (Backend) | Free tier | $0 |
| Vercel (Frontend) | Free / Pro (if on team) | $0 |
| **Total** | | **$0** |

> Note: Render free tier spins down after 15 minutes of inactivity. First request after sleep takes ~30 seconds. Upgrade to $7/month Starter plan to keep it always on.

---

## Support

For questions about this codebase, contact the developer who built it.
