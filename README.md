# Mess Auth System

**Dual Mess Subscription Enforcement with Dynamic QR Authorization**
Next.js 14 · Supabase · TypeScript · Vercel

---

## What it does

Students scan a live QR code at the mess entrance. The system checks their subscription, mess assignment, meal slot timing, and duplicate-entry — showing green **AUTHORIZED** or red **DENIED** in under 200ms.

**Three roles:** Student (scan + history), Staff (manual verify + daily summary), Admin (full management)

---

## Step-by-step: Local setup

### 1. Install dependencies

```bash
git clone <your-repo-url>
cd mess-auth
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com) → New Project. Copy:
- Project URL
- anon/public key
- service_role key (keep secret)

Install Supabase CLI:
```bash
npm install -g supabase
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
QR_SIGNING_SECRET=<openssl rand -hex 32>
CRON_SECRET=<openssl rand -hex 32>
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_TIMEZONE=Asia/Kolkata
```

### 4. Run database migrations

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

This creates all 13 tables, 3 views, triggers, stored functions, and seeds 20 demo students.

### 5. Create auth users

```bash
node scripts/create-auth-users.js
```

Creates Supabase Auth accounts for all 23 demo users and links them to the DB.

### 6. Verify everything

```bash
node scripts/db-check.js
```

All checks should pass before you continue.

### 7. Start the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Demo credentials (all use password: `MessAuth@2024`)

| Role | Email |
|------|-------|
| Admin | admin@messsystem.in |
| Staff Block A | staff.a@messsystem.in |
| Staff Block B | staff.b@messsystem.in |
| Student (active) | cs21b001@student.in |
| Student (no sub) | me22b015@student.in |
| Student (blocked) | cs21b078@student.in |

---

## Deploy to Vercel

### 1. Install Vercel CLI and link

```bash
npm install -g vercel
vercel login
vercel link
```

### 2. Set environment variables

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add QR_SIGNING_SECRET production
vercel env add CRON_SECRET production
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add APP_TIMEZONE production
```

Or add them in: **Vercel Dashboard → Project → Settings → Environment Variables**

### 3. Deploy

```bash
vercel --prod
```

### 4. Post-deploy configuration

**In Supabase Dashboard → Authentication → URL Configuration:**
- Set **Site URL** to `https://your-app.vercel.app`
- Add `https://your-app.vercel.app/**` to **Redirect URLs**

**Update NEXT_PUBLIC_APP_URL** in Vercel env to your actual URL, then redeploy:
```bash
vercel --prod
```

**Create users on production** (update `.env.local` to prod keys first):
```bash
node scripts/create-auth-users.js
```

### 5. Set up kiosk displays

Open these URLs on the entrance TVs in full-screen/kiosk mode:

```
https://your-app.vercel.app/kiosk/mess_a
https://your-app.vercel.app/kiosk/mess_b
```

Chrome kiosk mode:
```bash
google-chrome --kiosk --noerrdialogs --disable-infobars https://your-app.vercel.app/kiosk/mess_a
```

---

## Architecture

```
Student phone       Mess entrance TV      Staff phone
     |                     |                   |
     | POST /api/auth/scan  | GET /api/qr/gen   | POST /api/auth/manual
     v                     v                   v
              Next.js 14 App Router (Vercel Edge)
                           |
              Authorization Engine (lib/meal/authorization.ts)
                           |
              Supabase Postgres (RLS + stored procedures)
```

---

## Key files

```
src/
├── lib/
│   ├── meal/authorization.ts   ← 8-step auth pipeline
│   ├── meal/slots.ts           ← Slot helpers + display constants
│   ├── qr/tokens.ts            ← HMAC-SHA256 token sign/verify
│   ├── supabase/server.ts      ← SSR client (cookie-based)
│   ├── supabase/admin.ts       ← Service role client (bypasses RLS)
│   ├── auth/permissions.ts     ← requireAdmin/Staff/Student helpers
│   └── utils/rate-limit.ts     ← Sliding window rate limiter
├── app/
│   ├── kiosk/[messId]/         ← Entrance TV display
│   ├── (student)/              ← Scan, dashboard, history
│   ├── (staff)/                ← Verify, summary, denied
│   └── (admin)/                ← Students, subscriptions, config
├── middleware.ts               ← Role-based route protection
scripts/
├── create-auth-users.js        ← Sync auth users with DB
├── db-check.js                 ← Pre-deploy health check
└── generate-icons.js           ← PWA icon generation
```

---

## Authorization flow (8 steps)

Every QR scan runs through `src/lib/meal/authorization.ts`:

1. Verify HMAC-SHA256 token signature
2. Check token not expired (default 30s TTL)
3. Check token not replayed (DB jti lookup)
4. Check student exists and is not blocked
5. Check student has active subscription for today
6. Check subscription mess matches QR mess
7. Check current time is within an active meal slot
8. Check student hasn't already eaten this meal slot today

Every attempt (pass or fail) is written to `authorization_attempts`.

---

## Cron jobs

Configured in `vercel.json`, secured with `CRON_SECRET`:

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/expire-subscriptions` | Daily midnight | Mark expired subscriptions |
| `/api/cron/cleanup-qr` | Every 15 min | Delete used/expired QR sessions |

---

## Rate limits

| Endpoint | Limit |
|----------|-------|
| `GET /api/qr/generate` | 20/min per IP |
| `POST /api/auth/scan` | 10/min per user |
| `POST /api/auth/manual` | 30/min per IP |

For multi-region deployments, swap the in-memory store for Upstash Redis (see `src/lib/utils/rate-limit.ts`).

---

## Health check

```
GET /api/health
→ {"status":"ok","db":"connected","latency_ms":11}
```

Use with UptimeRobot or Vercel monitoring.

---

## Customisation

**Change meal slot times:** Admin → Meal Timings in the UI, or edit `supabase/migrations/001_initial_schema.sql`

**Change QR TTL:** Admin → QR Config (default: 30s token, 25s refresh)

**Change roll number format:** Edit regex in `src/app/api/auth/manual/route.ts`

**Add a mess:** Insert into `messes`, `meal_slots`, `qr_config`; update `mess_id_enum` in schema; add to `MESS_DISPLAY` in `src/lib/meal/slots.ts`

---

## Production checklist

- [ ] `supabase db push` applied to production
- [ ] `node scripts/create-auth-users.js` run against production
- [ ] `node scripts/db-check.js` all green
- [ ] All env vars set in Vercel (never `.env.local` in production)
- [ ] `NEXT_PUBLIC_APP_URL` is the actual deployed URL
- [ ] Supabase Auth redirect URL includes the deployed domain
- [ ] Kiosk TVs are showing `/kiosk/mess_a` and `/kiosk/mess_b`
- [ ] Default passwords changed from `MessAuth@2024`
- [ ] `QR_SIGNING_SECRET` and `CRON_SECRET` are unique 32-byte secrets
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is not referenced in any client component
