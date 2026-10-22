"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Email + 6-digit code (not a magic link), so signing in works inside the
// home-screen app on iPhone, where links open in Safari instead.
export default function Login() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
    setBusy(false);
    if (error) {
      setError(/signups? not allowed|not found|user/i.test(error.message)
        ? "That email isn’t on the Evee Shop beta list yet. Ask for an invite."
        : error.message);
      return;
    }
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) {
      setError("That code didn’t work. Check the latest email from Evee Shop, or send a new code.");
      return;
    }
    window.location.replace("/");
  }

  return (
    <main className="login">
      <div className="mark">Evee <span>Shop</span></div>
      <div>
        <h1>{step === "email" ? "Sign in" : "Check your email"}</h1>
        <p className="date">
          {step === "email"
            ? "Evee Shop is in private beta. Use the email your invite went to."
            : `We sent a 6-digit code to ${email}.`}
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
            <label htmlFor="code">6-digit code</label>
            <input id="code" className="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          </div>
          {error && <p className="err">{error}</p>}
          <button className="btn" disabled={busy || code.length < 6}>{busy ? "Checking…" : "Sign in"}</button>
          <button type="button" className="btn plain" onClick={() => { setStep("email"); setCode(""); setError(""); }}>Use a different email or send a new code</button>
        </form>
      )}
    </main>
  );
}
