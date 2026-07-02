import Link from "next/link";
import LegalLayout from "@/components/LegalLayout";

export const metadata = {
  title: "Privacy Policy — Alphabit",
  description: "How Alphabit collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout label="Legal" title="Privacy Policy" updated="July 2, 2026">
      <p>
        This policy describes how Alphabit (operated by [ENTITY NAME], [JURISDICTION] — &quot;we&quot;,
        &quot;us&quot;) handles your information when you use alphabit tools and services (the
        &quot;Service&quot;). The short version: we collect very little, we don&apos;t sell any of it, and
        the most sensitive things — your crypto, your exchange accounts, your keys — we never touch at all.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li>
          <strong>Email address.</strong> Collected only if you create an account (via magic-link sign-in)
          or join a waitlist. Used for authentication, service messages, and — only if you opt in — a
          weekly digest.
        </li>
        <li>
          <strong>Portfolio holdings.</strong> If you sign in and use the Portfolio Tracker, the coin,
          amount, and average cost figures you enter are stored against your account. If you use the tool
          without signing in, this data stays in your browser&apos;s local storage and never reaches our
          servers.
        </li>
        <li>
          <strong>Subscription status.</strong> If you purchase a paid plan, we store your plan tier and
          billing status. Payment card details are handled entirely by Stripe and never pass through our
          servers.
        </li>
        <li>
          <strong>Basic technical logs.</strong> Standard hosting logs (IP address, request path, user
          agent) retained briefly by our hosting provider (Vercel) for security and debugging.
        </li>
      </ul>

      <h2>2. What we do not collect</h2>
      <ul>
        <li>No passwords — authentication is passwordless (email one-time links).</li>
        <li>No exchange API keys, wallet addresses, private keys, or custody of any assets.</li>
        <li>No sale or rental of personal data to third parties, ever.</li>
        <li>No third-party advertising trackers.</li>
      </ul>

      <h2>3. How we use your information</h2>
      <p>
        We use the information above to operate the Service: signing you in, syncing your portfolio if you
        choose to, processing subscriptions, sending emails you asked for, and keeping the Service secure.
        We do not use your data to train models, build advertising profiles, or for any purpose unrelated
        to the Service.
      </p>

      <h2>4. Who we share it with</h2>
      <p>We share data only with the processors needed to run the Service:</p>
      <ul>
        <li><strong>Supabase</strong> — authentication and database hosting.</li>
        <li><strong>Vercel</strong> — website hosting and logs.</li>
        <li><strong>Stripe</strong> — payment processing (when billing is live).</li>
      </ul>
      <p>
        We may disclose information if legally required to do so. There are no other recipients.
      </p>

      <h2>5. Data retention and deletion</h2>
      <p>
        Account data is kept while your account is active. You can request deletion of your account and
        all associated data at any time by contacting us, and we will complete it within 30 days.
        Anonymous localStorage data is under your control — clearing your browser storage removes it.
      </p>

      <h2>6. Your rights</h2>
      <p>
        Depending on your jurisdiction, you may have rights to access, correct, export, or delete your
        personal data, and to object to processing. To exercise any of these, contact us at
        [CONTACT EMAIL]. We honor these requests regardless of jurisdiction where practical.
      </p>

      <h2>7. Changes to this policy</h2>
      <p>
        If this policy changes materially, we will update the date above and note the change prominently.
        We won&apos;t weaken protections retroactively without notice.
      </p>

      <p>
        See also: <Link href="/security">Security</Link> · <Link href="/legal/terms">Terms of Service</Link> ·{" "}
        <Link href="/legal/disclosure">Disclosure</Link>
      </p>
    </LegalLayout>
  );
}
