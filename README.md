# Evee Studio

*Today's viral TikTok Shop videos, broken down for your products.* A sister app to Hey Evee, built as an installable web app (PWA). Planned home: **studio.heyevee.com**.

- **Today's Virals:** a shared feed of TikTok Shop videos testers dropped in today, highest sales first, with est. commission, views and category filters.
- **Insights:** Evee watches and listens to each video once, then shows the hook word for word, the second-by-second flow, the framework, why it probably worked, and a fill-in-the-blank "Steal the structure."
- **Use this on my product:** 3 ready-to-film scripts that reuse a viral's structure for your product, in your words, with full shot-by-shot scripts, filming checklist and caption.
- **Drop a Video:** paste a TikTok link + the saved video file. Evee breaks it down and adds it to the feed for everyone.
- **My Scripts:** saved scripts, status, results tracking and suggested experiments.
- **You:** creator profile, daily sales brief from screenshots, framework library, sign out.

Private beta: invite-only, free.

## How it's built

| Piece | What it does |
| --- | --- |
| Next.js 14 on Vercel | The app, login and API |
| Supabase Auth | Email + 6-digit code sign-in, invite-only |
| Supabase Postgres | `docs` (each tester's private data), `virals` (the shared feed), `ai_calls` (daily limits) |
| Supabase Storage (`virals` bucket) | Dropped videos (deleted after Evee watches them) and their cover frames |
| Google Gemini (`lib/gemini.ts`) | Watches **and listens** to each video: exact words, tone, music, on-screen text, shots, timing |
| Anthropic Claude (`lib/claude.ts`) | Turns Gemini's notes into the framework, and writes every script |
| `/api/viral`, `/api/ai` | The only way the app reaches the AI. Prompts live on the server (`lib/prompts.ts`). Keys never reach the phone. |

Key files: `lib/library.ts` (frameworks, formats, categories, metrics: add a framework here), `lib/prompts.ts` (everything Evee is told), `app/margo/app.js` (the screens), `supabase/schema.sql` (database + storage).

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
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: from Supabase
   - `ANTHROPIC_API_KEY`: console.anthropic.com → API Keys
   - `GEMINI_API_KEY`: aistudio.google.com → Get API key (use a paid-tier project for the beta)
   - optional: `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`), `GEMINI_MODEL` (default `gemini-3.8-flash`), `AI_DAILY_LIMIT` (default `60` per tester per 24h)
3. **Settings → Functions**: make sure Fluid Compute is on so video breakdowns can run up to 5 minutes.
4. **Deploy.** Every push to `main` redeploys.

### 3. studio.heyevee.com
Vercel project → **Settings → Domains → Add** `studio.heyevee.com`, then add the DNS record Vercel shows (usually a CNAME `studio` → `cname.vercel-dns.com`) wherever heyevee.com's DNS lives.

### 4. Invite testers
Supabase → **Authentication → Users → Invite user**. Invite yourself first.

### 5. On your phone
iPhone: Safari → Share → **Add to Home Screen**. Android: Chrome → ⋮ → **Install app**.

## Running costs
- Vercel Hobby and Supabase Free cover a small beta (Supabase Free: 1 GB storage; videos are deleted after analysis).
- Each dropped video = one Gemini watch + one Claude breakdown. It's analyzed once and shared with everyone.
- Each "Use this on my product" and full script = one Claude request. `AI_DAILY_LIMIT` caps each tester.

## Later
- **Automatic daily feed:** plug a TikTok Shop data provider (e.g. EchoTik) into the feed, after confirming it has a daily top-videos ranking, video file access, and allows display in a paid app.
- **Hey Evee bundle / one login:** move both apps onto shared accounts; include Evee Studio in Lifetime VIP or as an add-on.
- **App Store / Play Store:** wrap with Capacitor, or rebuild screens in Expo on the same backend.
