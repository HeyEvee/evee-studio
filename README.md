# Evee Studio

*Viral TikTok Shop scripts for your products, with coaching.* A sister app to Hey Evee, built as an installable web app (PWA).

- **Today:** log yesterday’s best sellers from screenshots (several at once; Evee reads them and you check) or by typing (product, units sold, optional sales $). Evee tracks them over time and tells you what to post today: products on a streak, new winners, sudden jumps, and products going quiet. One tap writes scripts for any of them.
- **Create:** enter product, price, who it's for and an optional note. Evee picks the 3 best frameworks from the built-in library and writes 3 ready-to-film scripts (hook, time-coded beats, CTA, caption, hashtags) plus coaching: which to film first, the angle that matters, what to test, filming tips and one thing to watch out for.
- **Break down a script** (in Create): paste a draft, a transcript of a video that's selling, or a description. Evee rates the Hook, Pain point, Solution and CTA, explains what's working, and writes a stronger version.
- **Saved:** scripts you keep, marked To film / Filmed / Posted. On Posted scripts, log views, orders, clicks and sales. **What's working for you** ranks frameworks by orders per 1,000 views, and Evee leans on each person's winners when she writes (while still testing others).
- **Frameworks:** the 21 built-in viral frameworks with beats, best uses and Evee's tip. Pick one to write with it.
- **You:** name, your voice (how you come across, phrases you say, words to avoid), sign out.

Private beta: invite-only, free.

## How it's built

| Piece | What it does |
| --- | --- |
| Next.js 14 on Vercel | The app, login and API |
| Supabase Auth | Email + 8-digit code sign-in, invite-only |
| Supabase Postgres | `docs` (each person's private data: profile, products, sales days, saved scripts), `ai_calls` (daily limits) |
| Anthropic Claude (`lib/claude.ts`) | Writes every script and the coaching |
| `/api/evee` | The only way the app reaches the AI. Prompts live on the server (`lib/studio.ts`). The key never reaches the phone. |

Key files: `lib/playbook.ts` (Evee's conversion playbook: Hook → Pain point → Solution → CTA, persuasion principles, pitfalls), `lib/library.ts` (the 21 frameworks: add one here), `lib/studio.ts` (everything Evee is told), `app/margo/app.js` (the screens), `supabase/schema.sql` (database). The "What to post today" suggestions are simple rules in `app.js` (`recommendations()`), so they're instant and free.

## Setup (one time)

### 1. Supabase
1. Create a project at supabase.com.
2. **SQL Editor → New query**: paste all of `supabase/schema.sql`, click **Run**. This creates the tables, the private `virals` storage bucket and all access rules.
3. **Authentication → Sign In / Providers → Email**: keep Email on, turn **off** "Allow new users to sign up".
4. **Authentication → Emails → Magic Link**: replace the body so it shows the code:
   ```html
   <h2>Your Evee Studio code</h2>
   <p>Enter this code to sign in:</p>
   <p style="font-size:28px;letter-spacing:6px"><b>{{ .Token }}</b></p>
   <p>It expires in an hour. If you didn't ask for it, ignore this email.</p>
   ```
5. **Authentication → URL Configuration**: Site URL = `https://studio.heyevee.com` (or your Vercel URL until the domain is set).
6. **Project Settings → API**: copy the Project URL and the anon (publishable) key.

### 2. Vercel
1. **Add New → Project →** import this GitHub repo (Next.js is detected).
2. **Environment Variables** (all environments):
   - The Supabase URL and publishable key are already in `.env.production`, so you only add the two secret keys below.
   - `ANTHROPIC_API_KEY`: console.anthropic.com → API Keys
   - optional: `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`), `AI_DAILY_LIMIT` (default `60` per tester per 24h)
4. **Deploy.** Every push to `main` redeploys.

### 3. studio.heyevee.com
Vercel project → **Settings → Domains → Add** `studio.heyevee.com`, then add the DNS record Vercel shows (usually a CNAME `studio` → `cname.vercel-dns.com`) wherever heyevee.com's DNS lives.

### 4. Invite testers
Supabase → **Authentication → Users → Invite user**. Invite yourself first.

### 5. On your phone
iPhone: Safari → Share → **Add to Home Screen**. Android: Chrome → ⋮ → **Install app**.

## Running costs
- Vercel Hobby and Supabase Free cover a small beta.
- Each "Write my scripts" and each "New version" is one Claude request. `AI_DAILY_LIMIT` caps each person per 24 hours. Logging sales and the "What to post today" suggestions cost nothing.

## Later
- **Automatic sales:** TikTok Shop Partner Center API, once approved, replaces typing in best sellers.
- **Hey Evee bundle / one login:** move both apps onto shared accounts; include Evee Studio in Lifetime VIP or as an add-on.
- **App Store / Play Store:** wrap with Capacitor, or rebuild screens in Expo on the same backend.
