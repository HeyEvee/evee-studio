import Legal, { CONTACT } from "../landing/Legal";

export const metadata = { title: "Terms of Service · Evee Studio" };

export default function Terms() {
  return (
    <Legal title="Terms of Service">
      <p>These terms are an agreement between you and Elevation Haus LLC (“we”, “us”), the company behind Evee Studio and Hey Evee. By creating an account, starting a free trial or using Evee Studio, you agree to them. If you don’t agree, please don’t use Evee Studio.</p>

      <h2>1. What Evee Studio is</h2>
      <p>Evee Studio is a planning tool for TikTok Shop affiliate creators. You add your own sales numbers (by uploading screenshots or typing them in), and the app organizes them, suggests what to post, and shares video frameworks, lessons and challenges. Evee Studio is not made by, endorsed by or affiliated with TikTok.</p>

      <h2>2. Your account</h2>
      <ul>
        <li>You must be at least 18 years old to use Evee Studio.</li>
        <li>You sign in with your email and a one-time code. Keep access to your email secure; you’re responsible for activity on your account.</li>
        <li>Give us accurate information, and only upload screenshots and data that belong to you.</li>
      </ul>

      <h2>3. Free trial, subscriptions and billing</h2>
      <ul>
        <li>Paid plans start with a 7-day free trial. A card is required to start it. If you cancel before the trial ends, you won’t be charged.</li>
        <li>When the trial ends, your subscription starts and your card is charged the price shown at checkout. It renews automatically every month or year, depending on your plan, until you cancel.</li>
        <li>Founding member pricing stays the same for as long as your subscription stays active. If you cancel and come back later, current prices apply.</li>
        <li>Payments are processed by Stripe. We don’t see or store your full card number.</li>
        <li>We may change prices for future billing periods. We’ll tell you before a change affects you, and you can cancel before it does.</li>
      </ul>

      <h2>4. Cancellation and refunds</h2>
      <ul>
        <li><b>You can cancel anytime.</b> In the app, tap the profile icon, then <b>Manage or cancel subscription</b>. You can also email us at {CONTACT}.</li>
        <li>When you cancel, your subscription won’t renew, and you keep access until the end of the period you’ve already paid for.</li>
        <li><b>Payments are non-refundable once your subscription is activated and billed</b>, including partial months or years and unused time, except where a refund is required by law.</li>
        <li>If you think you were charged by mistake, email us at {CONTACT} and we’ll look into it.</li>
      </ul>

      <h2>5. Your content and data</h2>
      <p>You own the sales numbers, screenshots, product names and notes you add. You give us permission to store and process them only to run Evee Studio for you. Our <a href="/privacy">Privacy Policy</a> explains how we handle your information.</p>

      <h2>6. Our content</h2>
      <p>The app, its design, and its frameworks, lessons, affirmations and written guidance belong to Elevation Haus LLC. You may use them to plan and make your own videos. You may not copy, resell or republish them, or build a competing product from them.</p>

      <h2>7. Results, AI and accuracy</h2>
      <ul>
        <li>Evee Studio gives suggestions, not guarantees. We don’t promise any amount of views, sales, GMV or commissions. Your results depend on many things outside our control, including TikTok.</li>
        <li>Some features use AI, such as reading your screenshots and laying out frameworks for your products. AI can make mistakes, so check the numbers and suggestions before relying on them.</li>
        <li>You’re responsible for the videos you post, including following TikTok’s rules, TikTok Shop policies, FTC disclosure rules and the law. Don’t make health claims, false claims or misleading promises in your videos.</li>
      </ul>

      <h2>8. Acceptable use</h2>
      <p>Don’t misuse Evee Studio: no trying to break into it, overload it, scrape it, share your account, or use it for anything illegal or harmful. We may suspend or close accounts that do.</p>

      <h2>9. Changes and availability</h2>
      <p>We’re always improving Evee Studio, so features may change. We try to keep it running smoothly but can’t promise it will always be available or error-free. We may update these terms; if a change is significant, we’ll let you know by email or in the app. Using Evee Studio after a change means you accept the updated terms.</p>

      <h2>10. Disclaimers and limits</h2>
      <p>Evee Studio is provided “as is.” To the fullest extent the law allows, we disclaim implied warranties, and we aren’t liable for indirect or consequential losses, including lost profits or sales. Our total liability for any claim is limited to the amount you paid us in the 3 months before the claim.</p>

      <h2>11. Governing law</h2>
      <p>These terms are governed by the laws of the State of California, without regard to its conflict-of-law rules.</p>

      <h2>12. Contact</h2>
      <p>Questions about these terms or your subscription: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
    </Legal>
  );
}
