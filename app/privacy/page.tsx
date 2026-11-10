import Legal, { CONTACT } from "../landing/Legal";

export const metadata = { title: "Privacy Policy · Evee Studio" };

export default function Privacy() {
  return (
    <Legal title="Privacy Policy">
      <p>This policy explains what information Evee Studio collects, how we use it, and your choices. Evee Studio is run by Elevation Haus LLC. We keep it simple: we collect what we need to run the app, and we don’t sell your data.</p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Account info:</b> your email address, and your name if you add one.</li>
        <li><b>What you add to the app:</b> sales numbers (units, GMV), product names, videos posted, challenge progress, notes and settings.</li>
        <li><b>Screenshots you upload:</b> we send them to our AI provider to read your sales numbers. We keep the numbers you save, not the screenshot images.</li>
        <li><b>Billing info:</b> if you subscribe, Stripe handles your payment. We receive your email, plan and subscription status, not your full card number.</li>
        <li><b>Basic technical info:</b> sign-in cookies that keep you logged in, a few settings saved in your browser (like the date range you picked), and standard server logs used to fix problems.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run Evee Studio for you: show your planner, top sellers, challenges and suggestions.</li>
        <li>To sign you in, manage your subscription and send account emails like sign-in codes.</li>
        <li>To keep the app secure, prevent abuse and fix bugs.</li>
        <li>To improve Evee Studio. If we ever show combined, anonymous insights across creators, they will never identify you or show your own numbers to anyone else.</li>
      </ul>
      <p>We don’t sell your personal information, and we don’t use it for advertising.</p>

      <h2>Who helps us run the app</h2>
      <p>We use trusted service providers who process data only to provide their service to us:</p>
      <ul>
        <li><b>Supabase:</b> database and sign-in</li>
        <li><b>Vercel:</b> hosting</li>
        <li><b>Stripe:</b> payments and subscriptions</li>
        <li><b>Anthropic:</b> AI that reads screenshots and lays out frameworks for your products</li>
        <li><b>Resend:</b> sending emails such as sign-in codes</li>
      </ul>
      <p>We may also share information if the law requires it, or as part of a sale or transfer of the business, in which case this policy would still protect it.</p>

      <h2>Privacy between users</h2>
      <p>Your sales, products and notes are private to your account. Other Evee Studio users can’t see them.</p>

      <h2>How long we keep it</h2>
      <p>We keep your information while your account is open. If you cancel your subscription, your data stays saved so you can pick up where you left off if you come back. You can ask us to delete your account and data anytime.</p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>You can edit or delete your sales logs in the app at any time.</li>
        <li>Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> to get a copy of your data, correct it, or delete your account and data.</li>
        <li>California residents have rights under the CCPA, including to know, delete and correct personal information, and not to be discriminated against for using these rights. We don’t sell or share personal information for cross-context advertising.</li>
      </ul>

      <h2>Security</h2>
      <p>We use secure connections, private per-user data access and well-known providers to protect your information. No system is perfectly secure, so we can’t guarantee absolute security.</p>

      <h2>Age</h2>
      <p>Evee Studio is for adults 18 and over. We don’t knowingly collect information from anyone under 18.</p>

      <h2>Changes</h2>
      <p>We may update this policy. If the changes are significant, we’ll let you know by email or in the app.</p>

      <h2>Contact</h2>
      <p>Questions or requests: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
    </Legal>
  );
}
