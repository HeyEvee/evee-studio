# Evee Studio

*Your TikTok Shop success planner.* A sister app to Hey Evee, built as an installable web app (PWA).

- **Home:** greets you with your top 5–10 best sellers for Yesterday, 7 days or 30 days: GMV, units, videos posted, GMV per video and the change vs the period before. "Retarget today" picks out the best return per video, sellers with no new videos, and products on a streak.
- **Log sales:** from TikTok Shop screenshots (several at once; Evee reads them and you check) or by typing product, units, GMV and videos.
- **Products:** every product ranked for the period, searchable. Tap one for its daily chart, video count and + / − for videos posted today or yesterday.
- **Frameworks:** 25 proven viral video structures (including Rage Bait and Split Screen) plus the conversion formula (Hook → Pain point → Solution → CTA) to study and copy **See it with my product** walks one framework through beat by beat for a product (hook, what to show, an example line). Uses the cheaper fast model (`ANTHROPIC_FAST_MODEL`, default `claude-haiku-5-5`, falls back to the main model) and saves each walkthrough so reopening it is free.
- **You:** name, sign out.

**Landing page and subscriptions:** signed-out visitors see the landing page at `/` with pricing (Founding $7/mo for the first 50, $12/mo, $99/yr, all with a 7-day free trial). Checkout is Stripe; after paying, `/welcome` and the Stripe webhook create the account and store the subscription status on it. Canceled subscribers see a "subscription ended" screen; people invited by hand (beta testers) always get in. "Manage subscription" (You) opens Stripe's billing portal.

### Stripe setup
1. Vercel env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, then redeploy. Prices are created in Stripe automatically on first checkout (lookup keys `evee_studio_founding_monthly`, `evee_studio_monthly`, `evee_studio_yearly`).
2. Stripe → Developers → Webhooks → endpoint `https://<your domain>/api/stripe/webhook` with events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
3. Stripe → Settings → Billing → Customer portal: save it once (allow cancel, update payment method, switch between the Evee Studio prices).

## How it's built

| Piece | What it does |
| --- | --- |
| Next.js 14 on Vercel | The app, login and API |
| Supabase Auth | Email + 8-digit code sign-in, invite-only |
| Supabase Postgres | `docs` (each person's private data: profile, products, sales days, video counts), `ai_calls` (daily limits) |
| Anthropic Claude (`lib/claude.ts`) | Reads sales screenshots; framework walkthroughs |
| `/api/evee` | The only way the app reaches the AI. Prompts live on the server (`lib/studio.ts`, the screenshot-reading prompt). The key never reaches the phone. |

Key files: `lib/playbook.ts` (Evee's conversion playbook: Hook → Pain point → Solution → CTA, persuasion principles, pitfalls), `lib/library.ts` (the frameworks: add one here), `lib/studio.ts` (everything Evee is told), `app/margo/app.js` (the screens), `supabase/schema.sql` (database). The "What to post today" suggestions are simple rules in `app.js` (`recommendations()`), so they're instant and free.

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
- Each screenshot read is one Claude request (a few cents at most). `AI_DAILY_LIMIT` caps each person per 24 hours. Typing sales, the planner and the frameworks cost nothing.

## Later
- **Automatic sales:** TikTok Shop Partner Center API, once approved, replaces typing in best sellers.
- **Hey Evee bundle / one login:** move both apps onto shared accounts; include Evee Studio in Lifetime VIP or as an add-on.
- **App Store / Play Store:** wrap with Capacitor, or rebuild screens in Expo on the same backend.
