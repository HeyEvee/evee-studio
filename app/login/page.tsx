"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Email + 8-digit code (not a magic link), so signing in works inside the
// home-screen app on iPhone, where links open in Safari instead.
export default function Login() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();
  const DOWN = "Evee can’t reach the sign-in service right now. Try again in a minute.";
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.has("down")) setError(DOWN);
    if (q.get("email")) setEmail(q.get("email")!);
  }, []);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false } });
    setBusy(false);
    if (error) {
      const m = error.message || "";
      setError(
        /fetch|network|timed? ?out|load failed|50[234]|540/i.test(m) || (error as any).status >= 500
          ? DOWN
          : /signups? not allowed/i.test(m)
          ? "We couldn’t find an Evee Studio account for that email. Use the email from checkout, or start a free trial on the home page."
          : /not authorized/i.test(m)
            ? "Sign-in emails aren’t set up yet (custom email sender is off in Supabase)."
            : /rate limit|security purposes/i.test(m)
              ? "Too many codes requested. Wait a minute and try again."
              : `Couldn’t send the code: ${m}`
      );
      return;
    }
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) {
      setError("That code didn’t work. Check the latest email from Evee Studio, or send a new code.");
      return;
    }
    window.location.replace("/");
  }

  return (
    <main className="login">
      <div><a href="/" className="mark" style={{ textDecoration: "none", color: "inherit", display: "block" }}>Evee <span>Studio</span></a><p className="date">Your TikTok Shop success planner.</p></div>
      <div>
        <h1>{step === "email" ? "Sign in" : "Check your email"}</h1>
        <p className="date">
          {step === "email"
            ? "Use the email you subscribed or were invited with."
            : `We sent an 8-digit code to ${email}.`}
        </p>
      </div>
      {step === "email" ? (
        <form onSubmit={sendCode}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="text" inputMode="email" autoComplete="email" autoCapitalize="none" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          {error && <p className="err">{error}</p>}
          <button className="btn" disabled={busy || !email.includes("@")}>{busy ? "Sending…" : "Send my code"}</button>
        </form>
      ) : (
        <form onSubmit={verify}>
          <div className="field">
            <label htmlFor="code">8-digit code</label>
            <input id="code" className="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          </div>
          {error && <p className="err">{error}</p>}
          <button className="btn" disabled={busy || code.length < 8}>{busy ? "Checking…" : "Sign in"}</button>
          <button type="button" className="btn plain" onClick={() => { setStep("email"); setCode(""); setError(""); }}>Use a different email or send a new code</button>
        </form>
      )}
      <p className="date" style={{ textAlign: "center" }}>New here? <a href="/#pricing" style={{ color: "var(--accent)", fontWeight: 600 }}>Start a 7-day free trial</a></p>
      <p className="date" style={{ textAlign: "center", fontSize: 13 }}><a href="/terms" style={{ color: "inherit" }}>Terms</a> · <a href="/privacy" style={{ color: "inherit" }}>Privacy</a></p>
    </main>
  );
}
