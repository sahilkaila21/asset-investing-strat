import Link from "next/link";
import LegalLayout from "@/components/LegalLayout";

export const metadata = {
  title: "Terms of Service — Alphabit",
  description: "The terms governing your use of Alphabit.",
};

export default function TermsPage() {
  return (
    <LegalLayout label="Legal" title="Terms of Service" updated="July 2, 2026">
      <p>
        These terms govern your use of Alphabit (the &quot;Service&quot;), operated by [ENTITY NAME],
        [JURISDICTION]. By using the Service you agree to them. If you don&apos;t agree, don&apos;t use the
        Service.
      </p>

      <h2>1. What the Service is — and isn't</h2>
      <p>
        Alphabit provides quantitative analytics, risk scores, and decision-support tools for crypto
        markets. <strong>It is not financial, investment, legal, or tax advice</strong>, and it is not a
        brokerage, exchange, custodian, or investment adviser. Risk scores and signals are statements
        about historical statistical conditions, not recommendations to buy or sell any asset, and not
        predictions of price.
      </p>

      <h2>2. No advice, no fiduciary relationship</h2>
      <p>
        Nothing in the Service creates an adviser-client or fiduciary relationship. Investment decisions
        are yours alone. You should assume any position you take can lose its entire value, and you should
        consult a qualified professional who knows your circumstances before making significant financial
        decisions.
      </p>

      <h2>3. Performance information</h2>
      <p>
        Any backtested or historical performance shown by the Service is illustrative. Backtests are
        constructed with hindsight, our model parameters were informed by historical data (in-sample), and
        past performance — real or simulated — does not guarantee future results. See our{" "}
        <Link href="/legal/disclosure">Disclosure</Link> for the full statement.
      </p>

      <h2>4. Accounts</h2>
      <p>
        Accounts are created via email magic link. You are responsible for maintaining control of your
        email account. We may suspend accounts that abuse the Service (automated scraping, attempts to
        breach security, resale of data without permission).
      </p>

      <h2>5. Subscriptions and billing</h2>
      <p>
        Paid tiers are billed through Stripe on a monthly or annual cycle. You can cancel at any time,
        effective at the end of the current billing period. Prices may change with at least 30 days&apos;
        notice; changes never apply retroactively to an already-paid period.
      </p>

      <h2>6. Data and availability</h2>
      <p>
        The Service aggregates data from third-party sources (CoinMetrics, FRED, alternative.me, OKX,
        CoinGecko, and others). We work to keep data accurate and the Service available, but we do not
        warrant that data is error-free, complete, or uninterrupted, and third-party sources may change
        or fail without notice. The Service is provided &quot;as is&quot; without warranties of any kind.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, [ENTITY NAME] is not liable for trading or investment
        losses, lost profits, or indirect, incidental, or consequential damages arising from use of the
        Service. Our total aggregate liability for any claim is limited to the amount you paid us in the
        twelve months preceding the claim.
      </p>

      <h2>8. Intellectual property</h2>
      <p>
        The Service&apos;s code, design, and content are owned by [ENTITY NAME]. Our methodology is
        published for transparency — you may reference it with attribution, but you may not resell the
        Service&apos;s data or republish its signals commercially without permission.
      </p>

      <h2>9. Changes and termination</h2>
      <p>
        We may update these terms; material changes will be announced with reasonable notice and the date
        above will change. You may stop using the Service at any time and request account deletion per the{" "}
        <Link href="/legal/privacy">Privacy Policy</Link>.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These terms are governed by the laws of [JURISDICTION], and disputes are subject to the courts of
        [JURISDICTION].
      </p>
    </LegalLayout>
  );
}
