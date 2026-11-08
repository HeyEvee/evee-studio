import { FOUNDING_LIMIT, TRIAL_DAYS } from "@/lib/billing";
import { FRAMEWORKS } from "@/lib/library";

const NOTICE: Record<string, string> = {
  "founding-full": "Founding spots just filled up. Monthly and yearly plans are still open.",
  error: "Checkout couldn’t start. Please try again in a minute.",
  unavailable: "Checkout isn’t open yet. Check back soon.",
};

const INCLUDED = ["Daily planner: top sellers, GMV and videos", "Evee reads your sales screenshots", `${FRAMEWORKS.length} viral frameworks, shown for your products`, "Retarget picks and daily affirmations"];

export default function Pricing({ foundingLeft, notice, email }: { foundingLeft: number | null; notice?: string | null; email?: string }) {
  const foundingOpen = foundingLeft !== 0;
  const Plan = ({ id, cta, featured }: { id: string; cta: string; featured?: boolean }) => (
    <form action="/api/checkout" method="post">
      <input type="hidden" name="plan" value={id} />
      {email && <input type="hidden" name="email" value={email} />}
      <button className={`lp-btn ${featured ? "" : "ghost"}`}>{cta}</button>
    </form>
  );
  return (
    <section className="lp-pricing" id="pricing" aria-labelledby="pricing-h">
      <p className="lp-eyebrow">Pricing</p>
      <h2 id="pricing-h">Start free for {TRIAL_DAYS} days</h2>
      <p className="lp-sub">Every plan includes everything. You won’t be charged until your trial ends, and you can cancel anytime.</p>
      {notice && NOTICE[notice] && <p className="lp-notice" role="status">{NOTICE[notice]}</p>}
      <div className="lp-plans">
        <div className={`lp-plan featured${foundingOpen ? "" : " closed"}`}>
          <span className="lp-tag">Founding member</span>
          <p className="lp-price"><b>$7</b><span>/month</span></p>
          <p className="lp-note">Locked in for life while you stay subscribed.</p>
          {foundingLeft != null && (
            <p className="lp-spots">{foundingOpen ? `${foundingLeft} of ${FOUNDING_LIMIT} founding spots left` : "All founding spots are taken"}</p>
          )}
          {foundingOpen ? <Plan id="founding" cta="Claim a founding spot" featured /> : <button className="lp-btn" disabled>Founding is full</button>}
        </div>
        <div className="lp-plan">
          <span className="lp-tag plain">Monthly</span>
          <p className="lp-price"><b>$12</b><span>/month</span></p>
          <p className="lp-note">Pay as you go.</p>
          <Plan id="monthly" cta="Start free trial" />
        </div>
        <div className="lp-plan">
          <span className="lp-tag plain">Yearly</span>
          <p className="lp-price"><b>$99</b><span>/year</span></p>
          <p className="lp-note">About $8.25 a month. Save 31%.</p>
          <Plan id="yearly" cta="Start free trial" />
        </div>
      </div>
      <ul className="lp-included">{INCLUDED.map((x) => <li key={x}>{x}</li>)}</ul>
      <p className="lp-fine">Secure checkout by Stripe. A card is needed to start the trial.</p>
    </section>
  );
}
