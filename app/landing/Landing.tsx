import Pricing from "./Pricing";
import "./landing.css";

const STEPS = [
  ["Drop your screenshots", "Screenshot your product sales in TikTok Shop’s Creator Center. Evee reads every product, units sold and GMV in seconds. Or type them in."],
  ["See what’s working", "Your top 5–10 sellers for yesterday, 7 days or 30 days, with how many videos you made for each and your GMV per video."],
  ["Retarget with a proven format", "Evee points out your best GMV per video and the products selling with no new videos. Pick a viral framework and see it laid out for your product."],
];

const FAQ = [
  ["Do I need to connect my TikTok account?", "No. You upload screenshots from TikTok Shop’s Creator Center, or type your numbers in. Evee Studio never asks for your TikTok login."],
  ["Which screenshots do I upload?", "In TikTok Shop, open Creator Center → Analytics and screenshot your product list for the day, showing units sold and GMV. You can add several screenshots at once."],
  ["How long does it take each day?", "About a minute. Tap “Drop yesterday’s stats”, pick your screenshots, check the numbers and save."],
  ["What does “founding member” mean?", "The first 50 subscribers pay $7 a month for as long as they stay subscribed, even after the regular price applies to everyone else."],
  ["Can I cancel anytime?", "Yes. In the app, tap You → Manage subscription. If you cancel during your free trial, you won’t be charged."],
  ["Is my data private?", "Yes. Your sales, products and notes are only visible to you."],
];

export default function Landing({ foundingLeft, notice }: { foundingLeft: number | null; notice?: string | null }) {
  return (
    <div className="lp">
      <header className="lp-nav">
        <a href="/" className="brand">Evee <span>Studio</span></a>
        <nav><a href="#pricing">Pricing</a><a href="/login" className="lp-signin">Sign in</a></nav>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <p className="lp-eyebrow">For TikTok Shop affiliates · By Hey Evee</p>
            <h1>Know what’s selling. Post more of it.</h1>
            <p className="lp-sub">Evee Studio is your daily TikTok Shop planner. Drop yesterday’s sales screenshots and see your top sellers, how many videos you made for each, and your GMV per video, so you know exactly what to retarget today.</p>
            <div className="lp-ctas">
              <a className="lp-btn" href="#pricing">Start your 7-day free trial</a>
              <a className="lp-btn ghost" href="#how">See how it works</a>
            </div>
            <p className="lp-fine">No TikTok login needed. Made for your phone.</p>
          </div>
          <figure className="lp-phone"><img src="/landing/home.webp" width={390} height={844} alt="Evee Studio home: GMV for the last 7 days, units sold, videos posted and GMV per video" fetchPriority="high" /></figure>
        </section>

        <section className="lp-how" id="how" aria-labelledby="how-h">
          <p className="lp-eyebrow">How it works</p>
          <h2 id="how-h">A minute a day. A clear plan for today.</h2>
          <ol className="lp-steps">{STEPS.map(([t, d], i) => <li key={t}><span className="lp-num">{i + 1}</span><h3>{t}</h3><p>{d}</p></li>)}</ol>
        </section>

        <section className="lp-feature">
          <figure className="lp-phone small"><img src="/landing/product.webp" width={390} height={844} loading="lazy" alt="A product page with daily GMV bars and dots on the days a video was posted" /></figure>
          <div>
            <p className="lp-eyebrow">Every product, day by day</p>
            <h2>See which videos actually moved sales</h2>
            <p className="lp-sub">Tap any product for its GMV, units, videos and GMV per video, plus a daily chart with a dot on every day you posted. Spot the products that sell more when you show up for them.</p>
          </div>
        </section>

        <section className="lp-feature flip">
          <figure className="lp-phone small"><img src="/landing/framework.webp" width={390} height={844} loading="lazy" alt="A framework laid out for a padded bra: three hook ideas, each with what to show, a line to say and on-screen text" /></figure>
          <div>
            <p className="lp-eyebrow">21 viral frameworks</p>
            <h2>Proven formats, shown for your product</h2>
            <p className="lp-sub">Study the structures that sell on TikTok Shop, from Price Shock to Problem → Solution. Tap “See it with my product” and Evee lays it out for your product: three hooks to try, then what to show and what to talk about at every step, in your own words.</p>
          </div>
        </section>

        <section className="lp-extras" aria-label="More in Evee Studio">
          <div><h3>Retarget today</h3><p>Your best GMV per video, products selling with no new videos, and new winners, picked from your own numbers.</p></div>
          <div><h3>A daily affirmation</h3><p>Start each day with a reminder that you’re building something real: abundance, money and confidence.</p></div>
          <div><h3>Yours alone</h3><p>Your sales and products are private to you. Add Evee Studio to your home screen like an app.</p></div>
        </section>

        <Pricing foundingLeft={foundingLeft} notice={notice} />

        <section className="lp-faq" aria-labelledby="faq-h">
          <h2 id="faq-h">Questions</h2>
          {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </section>

        <section className="lp-final">
          <h2>Your best sellers are trying to tell you something.</h2>
          <a className="lp-btn" href="#pricing">Start your free trial</a>
        </section>
      </main>

      <footer className="lp-foot">
        <span>Evee Studio is part of the <a href="https://heyevee.com">Hey Evee</a> family.</span>
        <span>© {new Date().getFullYear()} Elevation Haus LLC</span>
      </footer>
    </div>
  );
}
