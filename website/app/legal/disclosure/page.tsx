import Link from "next/link";
import LegalLayout from "@/components/LegalLayout";

export const metadata = {
  title: "Disclosure — Alphabit",
  description: "Alphabit's full risk and performance disclosure, stated plainly.",
};

export default function DisclosurePage() {
  return (
    <LegalLayout label="Legal" title="Risk & Performance Disclosure" updated="July 2, 2026">
      <p>
        This page states, in plain language, the limits of what Alphabit&apos;s tools can tell you. We&apos;d
        rather over-disclose than have you discover a caveat later.
      </p>

      <h2>Not financial advice</h2>
      <p>
        Nothing produced by Alphabit — risk scores, zones, signals, backtests, charts, or commentary — is
        financial, investment, legal, or tax advice, or a recommendation to buy, sell, or hold any asset.
        Alphabit is not registered as an investment adviser with any regulator. All investment decisions
        are yours alone.
      </p>

      <h2>How to read our backtest numbers</h2>
      <p>
        Where the Service shows backtested results, be aware of what they are and aren&apos;t:
      </p>
      <ul>
        <li>
          <strong>They are in-sample.</strong> The model&apos;s factor weights were informed and refined by
          studying historical data — including the same periods the backtest runs over. That makes
          backtest results illustrative of the strategy&apos;s logic, not evidence of a validated,
          out-of-sample track record.
        </li>
        <li>
          <strong>They are constructed with hindsight.</strong> Backtests can&apos;t capture real execution:
          slippage, fees, taxes, liquidity, downtime, or the psychological difficulty of actually
          following a signal during a crash.
        </li>
        <li>
          <strong>A genuine track record takes time.</strong> The weekly signal is published openly and
          without retroactive edits. As that history accumulates, it becomes the out-of-sample record on
          which the model should be judged.
        </li>
      </ul>

      <h2>Crypto-specific risks</h2>
      <p>
        Crypto assets are exceptionally volatile and can lose most or all of their value. Historical
        patterns the model relies on — valuation cycles, funding dynamics, macro correlations — may stop
        working at any time. Regulatory changes, exchange failures, and protocol-level events can cause
        losses no market model anticipates.
      </p>

      <h2>Past performance</h2>
      <p>
        Past performance, whether real or simulated, does not guarantee future results. No representation
        is made that any account or strategy will achieve results similar to any shown.
      </p>

      <p>
        Related reading: <Link href="/methodology">Methodology</Link> (including a plain-language
        limitations section) · <Link href="/legal/terms">Terms of Service</Link>
      </p>
    </LegalLayout>
  );
}
