import Link from "next/link";

export const metadata = {
  title: "FAQ — Alphabit",
  description: "Answers to the questions a skeptical investor should ask about Alphabit's risk model and tools.",
};

const linkStyle: React.CSSProperties = { color: "var(--blue)", textDecoration: "none" };

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Is this rigorous, or just another sentiment gauge with a nice UI?",
    a: (
      <>
        The model is a 13-factor weighted composite built on on-chain data (MVRV, Puell Multiple, network
        health), market positioning (funding rates, Fear &amp; Greed, BTC dominance), price structure, and
        macro conditions (Fed Funds, CPI, DXY). Every factor, weight, and data source is published on the{" "}
        <Link href="/methodology" style={linkStyle}>Methodology page</Link> — including the normalization
        math. You can judge the rigor yourself rather than take our word for it.
      </>
    ),
  },
  {
    q: "Does it work? How would I know?",
    a: (
      <>
        Honestly stated: the model&apos;s weights were refined by studying past cycles, so backtest results
        are in-sample and should be read as illustrative of the strategy&apos;s logic — not as a validated
        track record. What we commit to is publishing the signal weekly, in public, without retroactive
        edits. Over time that builds a genuine out-of-sample record you can evaluate. We&apos;d rather earn
        trust slowly than claim a track record we can&apos;t defend.
      </>
    ),
  },
  {
    q: "Will Alphabit tell me when to buy or sell?",
    a: (
      <>
        No — and that&apos;s deliberate. The model outputs a risk score and zone (accumulate / hold /
        reduce), which is a statement about historical conditions, not a trade call. It quantifies when
        conditions have historically favored deploying capital versus preserving it. What you do with
        that depends on your situation, which we don&apos;t know. Nothing on this site is financial advice.
      </>
    ),
  },
  {
    q: "Who is behind this?",
    a: (
      <>
        Alphabit is built by Sahil Kaila and a small team — the story and people are on the{" "}
        <Link href="/about" style={linkStyle}>Our Story page</Link>. The model logic is the founder&apos;s
        own quantitative work, and the methodology is fully disclosed rather than hidden behind
        &quot;proprietary&quot; language.
      </>
    ),
  },
  {
    q: "Where does the data come from?",
    a: (
      <>
        On-chain metrics from CoinMetrics&apos; community API, macro series from FRED (the St. Louis Fed),
        sentiment from alternative.me, funding rates from OKX, market caps from CoinGecko, and exchange
        price history. Sources are listed per-factor on the{" "}
        <Link href="/methodology" style={linkStyle}>Methodology page</Link>. We don&apos;t generate any input
        data ourselves — every factor is independently checkable.
      </>
    ),
  },
  {
    q: "How often does the signal update?",
    a: (
      <>
        Factor data refreshes daily as sources publish; the actionable signal is weekly, mapped to a
        Sunday cadence. Crypto risk conditions change over weeks and months, not minutes — a weekly
        cadence is a feature, not a limitation. It keeps the process disciplined and ignorable noise ignored.
      </>
    ),
  },
  {
    q: "What do I get for free, and what will cost money?",
    a: (
      <>
        The current week&apos;s risk score and zone are free, always — along with Fear &amp; Greed, the Macro
        Dashboard, the DCA Calculator, and the Whale Tracker. Paid tiers (see{" "}
        <Link href="/pricing" style={linkStyle}>Pricing</Link>) add depth: full signal history, per-factor
        breakdowns, multi-asset coverage, account-synced portfolio tracking, and a weekly digest. The core
        insight is never paywalled.
      </>
    ),
  },
  {
    q: "Do you hold my crypto or connect to my exchange?",
    a: (
      <>
        No. Alphabit is analytics only — no custody, no exchange API keys, no wallet connections. The
        Portfolio Tracker runs on manually-entered numbers, stored in your own browser (or synced to your
        account if you sign in). Details on the <Link href="/security" style={linkStyle}>Security page</Link>.
      </>
    ),
  },
  {
    q: "Can I adjust the model's weights myself?",
    a: (
      <>
        The published default weighting is <em>the</em> signal — one number, computed the same way for
        everyone, so it stays repeatable and accountable. An advanced mode for exploring custom weightings
        exists in the research tool, but we treat the default as canonical: a signal you can tune to say
        anything isn&apos;t a signal.
      </>
    ),
  },
  {
    q: "What happens when the model is wrong?",
    a: (
      <>
        It will be wrong — any honest quantitative process is wrong on individual calls. The design goal
        is that the <em>process</em> is defensible even when an outcome is bad: factors are disclosed,
        changes are documented, and the signal history stays public. That&apos;s the same standard a
        quantitative research desk holds itself to, and it&apos;s the difference between a bad outcome and
        a bad process.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "64px 24px 96px" }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 10 }}>
          FAQ
        </div>
        <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 14 }}>
          Questions a skeptic should ask
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "1rem", lineHeight: 1.7, maxWidth: 600 }}>
          These are the questions we&apos;d ask before trusting a product like this one. If yours isn&apos;t
          answered here, the <Link href="/methodology" style={linkStyle}>Methodology page</Link> goes deeper.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {FAQS.map((f) => (
          <details
            key={f.q}
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "18px 22px",
            }}
          >
            <summary style={{ fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", lineHeight: 1.5 }}>
              {f.q}
            </summary>
            <div style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.7, paddingTop: 12 }}>
              {f.a}
            </div>
          </details>
        ))}
      </div>

      <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: 40, textAlign: "center" }}>
        Nothing on this page or site is financial advice. Past performance doesn&apos;t guarantee future results.
      </p>
    </div>
  );
}
