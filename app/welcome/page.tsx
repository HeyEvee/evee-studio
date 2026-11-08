import { provision, stripe } from "@/lib/billing";
import "../landing/landing.css";

export const dynamic = "force-dynamic";

// Stripe sends buyers here after checkout. Makes sure their account exists, then sends them to sign in.
export default async function Welcome({ searchParams }: { searchParams: { session_id?: string } }) {
  let email = "", ok = false;
  const s = stripe();
  if (s && searchParams.session_id?.startsWith("cs_")) {
    try {
      const cs = await s.checkout.sessions.retrieve(searchParams.session_id, { expand: ["subscription"] });
      email = cs.customer_details?.email || cs.customer_email || "";
      if (cs.status === "complete" && email && cs.subscription && typeof cs.subscription !== "string") {
        await provision(email, cs.subscription);
        ok = true;
      }
    } catch (e) {
      console.error("welcome provision error", e);
    }
  }
  return (
    <div className="lp">
      <header className="lp-nav"><a href="/" className="brand">Evee <span>Studio</span></a></header>
      <main>
        <section className="lp-center">
          <p className="lp-eyebrow">{ok ? "Your free trial has started" : "Thank you"}</p>
          <h1 style={{ fontSize: 40 }}>Welcome to Evee Studio.</h1>
          <p className="lp-sub">
            {ok
              ? `Your account is ready${email ? ` for ${email}` : ""}. Sign in with that email and we’ll send you an 8-digit code.`
              : "Your payment went through. Your account is being set up. It usually takes a few seconds. Sign in with the email you used at checkout."}
          </p>
          <a className="lp-btn" href={`/login${email ? `?email=${encodeURIComponent(email)}` : ""}`}>Sign in to Evee Studio</a>
          <p className="lp-fine">Tip: on iPhone, open it in Safari, tap Share, then Add to Home Screen to use it like an app.</p>
        </section>
      </main>
    </div>
  );
}
