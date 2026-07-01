import Link from "next/link";

export const metadata = {
  title: "Our Story — Alphabit",
  description: "A decade of studying markets, testing strategies with real money, and building tools to share what works.",
};

export default function AboutPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px 96px" }}>

      {/* Hero */}
      <div style={{ marginBottom: 56 }}>
        <p style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--blue)", marginBottom: 16 }}>
          Our Story
        </p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 2.8rem)", fontWeight: 800, lineHeight: 1.15, color: "var(--text)", marginBottom: 24, letterSpacing: "-0.03em" }}>
          Built from a decade of<br />
          <span style={{ color: "var(--blue)" }}>obsession</span> with markets.
        </h1>
        <p style={{ fontSize: "1.15rem", lineHeight: 1.75, color: "var(--muted)", maxWidth: 640, marginBottom: 28 }}>
          Not a hedge fund. Not a trading desk. Just someone who couldn&apos;t stop reading, studying, and asking
          <em> why</em> — until the answers started paying off.
        </p>

        {/* Founder byline */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 14,
          background: "rgba(79,124,255,0.07)", border: "1px solid rgba(79,124,255,0.2)",
          borderRadius: 12, padding: "12px 20px",
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: "50%",
            background: "linear-gradient(135deg, #4f7cff 0%, #34d399 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: "1rem", color: "#fff", flexShrink: 0,
          }}>
            SK
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)", letterSpacing: "-0.01em" }}>
              Sahil Kaila
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 2 }}>
              Solutions Architect &amp; Data Analyst · Founder, Alphabit
            </div>
          </div>
        </div>
      </div>

      <Divider />

      {/* The origin */}
      <Section label="Where it started">
        <p>
          For over ten years I&apos;ve worked as a Solutions Architect and Data Analyst. My days are built around
          patterns — finding signal in noise, turning complex systems into clear decisions. I love the work.
          But somewhere alongside it, a second obsession quietly took root.
        </p>
        <p>
          Finance. Global markets. The mechanics behind why capital flows where it does.
        </p>
        <p>
          I wasn&apos;t drawn in by get-rich-quick promises. I was drawn in by the{" "}
          <strong style={{ color: "var(--text)" }}>history</strong> — the patterns that repeat across decades,
          the macro forces that shape cycles, the way fear and greed leave legible footprints in the data.
          I spent years reading case studies, studying historical drawdowns, dissecting what separated investors
          who survived crashes from those who didn&apos;t.
        </p>
        <p>
          Crypto, specifically, felt like the most data-rich, pattern-dense market I&apos;d ever encountered.
          On-chain transparency that traditional markets don&apos;t offer. Sentiment cycles so clean you could almost
          set a watch by them. Macro correlations that made intuitive sense once you understood the underlying mechanics.
        </p>
        <p>
          So I studied it the way I study everything: obsessively, with data, and with a healthy respect for
          what I didn&apos;t yet know.
        </p>
      </Section>

      <Divider />

      {/* The strategy */}
      <Section label="Putting real money behind the thesis">
        <p>
          At some point, studying from the sidelines wasn&apos;t enough. I wanted to know if the frameworks I&apos;d
          built — the risk signals, the cycle indicators, the macro overlays — actually held up when real money
          was on the line.
        </p>
        <p>
          So I deployed my own capital using the risk-managed strategy you see in this tool today.
        </p>
        <p>
          The core idea was simple but disciplined: <strong style={{ color: "var(--text)" }}>buy when risk is
          low, reduce when risk is high</strong>. Not market timing in the classic sense — more like a systematic
          approach to position-sizing based on where we are in the cycle. When the on-chain metrics, macro signals,
          and sentiment data all converged to say &quot;this is historically a low-risk zone&quot; — deploy more.
          When they said &quot;this is historically a dangerous zone&quot; — hold back, take some off the table.
        </p>
        <p>
          It worked. Not perfectly — no strategy is perfect. But it worked well enough that I stopped
          second-guessing the framework and started trusting the data.
        </p>
        <p>
          More importantly: it <em>survived</em> the periods that test every investor&apos;s conviction. The drawdowns
          that wipe out overleveraged positions. The euphoria cycles that tempt you to FOMO in at the top.
          The macro shocks that cause panic selling at exactly the wrong moment. The model helped me stay
          rational when the market was anything but.
        </p>
      </Section>

      <Divider />

      {/* The why */}
      <Section label="Why share it">
        <p>
          I know what it feels like to watch a market move and have no framework for what to do. To see
          headlines screaming &quot;crypto is dead&quot; and not know if this is the moment to buy the dip or
          step away entirely. To watch friends make financial decisions driven by Twitter and YouTube influencers
          who have every incentive except the honest one.
        </p>
        <p>
          The tools institutional investors use to navigate these markets — the macro overlays, the on-chain
          analytics, the systematic risk frameworks — they exist. They&apos;re just usually locked behind Bloomberg
          terminals and fund subscriptions most people will never access.
        </p>
        <p>
          <strong style={{ color: "var(--text)" }}>That gap felt wrong to me.</strong>
        </p>
        <p>
          I spent years building these tools for myself. The natural next step was to make them available
          to anyone who wants to approach crypto investing with the same rigour that professional analysts
          apply to traditional markets. Not to make decisions for you — but to give you the same clarity
          I have when I sit down to review my own positions every week.
        </p>
        <p>
          That&apos;s Alphabit. A decade of self-directed study and real-money testing, packaged into tools
          that are honest about what they know and what they don&apos;t.
        </p>
      </Section>

      <Divider />

      {/* What this is and isn't */}
      <Section label="What this is — and isn't">
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            ["✓", "var(--green)", "Data-driven tools built on publicly available on-chain, macro, and sentiment signals"],
            ["✓", "var(--green)", "A framework for thinking about risk — not a black box that tells you what to do"],
            ["✓", "var(--green)", "Strategies tested with real capital through real market cycles"],
            ["–", "#f87171",     "Financial advice — these are informational tools, not personalised recommendations"],
            ["–", "#f87171",     "A guarantee of returns — past patterns are signal, not certainty"],
            ["–", "#f87171",     "A replacement for your own research and judgement"],
          ].map(([icon, color, text], i) => (
            <li key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <span style={{ color: color as string, fontWeight: 700, fontSize: "1rem", marginTop: 2, flexShrink: 0 }}>{icon}</span>
              <span style={{ color: "var(--muted)", lineHeight: 1.65 }}>{text as string}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Divider />

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
        <p style={{ color: "var(--muted)", marginBottom: 28, fontSize: "1.05rem", lineHeight: 1.7 }}>
          If any of this resonates, start with the Risk Model.<br />
          It&apos;s the tool I use myself, every week.
        </p>
        <Link
          href="/tools/risk-model"
          style={{
            display: "inline-block",
            padding: "14px 32px",
            borderRadius: 10,
            backgroundColor: "var(--blue)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.95rem",
            textDecoration: "none",
            letterSpacing: "-0.01em",
          }}
        >
          Open the Risk Model →
        </Link>
      </div>

    </main>
  );
}

function Divider() {
  return <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "48px 0" }} />;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 8 }}>
      <p style={{
        fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em",
        textTransform: "uppercase", color: "var(--blue)", marginBottom: 18,
      }}>
        {label}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, color: "var(--muted)", lineHeight: 1.8, fontSize: "1.02rem" }}>
        {children}
      </div>
    </section>
  );
}
