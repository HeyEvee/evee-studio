# Margo

A back office for TikTok Shop affiliates, built as an installable web app (PWA).

- **Today:** upload yesterday's TikTok Shop screenshots and get a daily brief: best sellers, what to retarget, and problem → solution video ideas.
- **Studio:** turn any product into ready-to-film concepts, hooks and shot-by-shot scripts using the 80/20 framework library.
- **Scripts:** saved scripts with search, filters, status, editing and export.
- **Results:** log real video numbers, compare like with like, and get suggested experiments.
- **You:** creator profile, framework library, past briefs.

Private beta: invite-only, free.

## How it's built

| Piece | What it does |
| --- | --- |
| Next.js 14 (App Router) on Vercel | The app, the login and the API |
| Supabase Auth | Email + 6-digit code sign-in. Invite-only (signups off). |
| Supabase Postgres (`docs`, `ai_calls`) | Each tester's data, locked to them with row-level security |
| `/api/ai` | The only way the app reaches Claude. Prompts live on the server (`lib/prompts.ts`); the phone can only ask for fixed jobs. |
| Anthropic API | Reads screenshots and writes briefs and scripts. The key stays on the server. |
| `public/manifest.webmanifest`, `public/sw.js` | Add to Home Screen, app icon, offline page |

Key files:

- `lib/library.ts`: frameworks, formats, categories, metrics. **Add a framework here** and it shows up everywhere.
- `lib/prompts.ts`: everything Margo is told.
- `app/margo/app.js`: the app screens.
- `app/api/ai/route.ts`: input checks, daily limit, Claude call.
- `supabase/schema.sql`: the database.

## Setup (one time)

### 1. Supabase
1. Create a project at supabase.com.
2. **SQL Editor → New query**: paste all of `supabase/schema.sql` and click **Run**.
3. **Authentication → Sign In / Providers → Email**: keep Email on. Turn **off** "Allow new users to sign up" so only invited people can get in.
4. **Authentication → Emails → Magic Link** template: replace the body so it shows the code (the app signs in with the code, which works inside the iPhone home-screen app):
   ```html
   <h2>Your Margo code</h2>
   <p>Enter this code in Margo to sign in:</p>
   <p style="font-size:28px;letter-spacing:6px"><b>{{ .Token }}</b></p>
   <p>It expires in an hour. If you didn't ask for it, ignore this email.</p>
   ```
5. **Authentication → URL Configuration**: set **Site URL** to your Vercel URL once you have it.
6. **Project Settings → API**: copy the Project URL and the anon (publishable) key.

### 2. Vercel
1. **Add New → Project →** import this GitHub repo. Framework: Next.js (auto-detected).
2. **Environment Variables** (all environments):
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon / publishable key
   - `ANTHROPIC_API_KEY`: from console.anthropic.com → API Keys (secret, server only)
   - `ANTHROPIC_MODEL` (optional): defaults to `claude-sonnet-5-5`
   - `AI_DAILY_LIMIT` (optional): requests per tester per 24 hours, default `60`
3. **Deploy.** Every push to `main` redeploys automatically.

### 3. Invite testers
Supabase → **Authentication → Users → Invite user** → their email. They open the Vercel URL, enter that email, get a 6-digit code, and they're in. Invite yourself first.

### 4. Put it on your phone
- **iPhone:** open the URL in Safari → Share → **Add to Home Screen**.
- **Android:** open it in Chrome → ⋮ → **Install app**.

## Local development
```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev                  # http://localhost:3000
```

## Costs to expect
- Vercel Hobby and Supabase Free cover a small beta.
- Anthropic usage is pay-as-you-go per request. Screenshot briefs and full scripts are the biggest requests. `AI_DAILY_LIMIT` caps each tester.

## Later
- **App Store / Play Store:** wrap this app with Capacitor, or rebuild the screens in Expo and keep the same Supabase + `/api/ai` backend.
- **Paid plans:** add Stripe Checkout + a webhook that marks the tester's plan in Supabase.
- **Automatic data:** TikTok Shop Partner Center API, once approved, replaces screenshot uploads.
