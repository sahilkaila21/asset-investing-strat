import Link from "next/link";
import { ShieldCheck, KeyRound, Database, EyeOff } from "lucide-react";

export const metadata = {
  title: "Security — Alphabit",
  description: "What Alphabit stores, what it never touches, and how your data is handled.",
};

export default function SecurityPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "64px 24px 96px" }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 10 }}>
          Security
        </div>
        <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 14 }}>
          What we store, and what we never touch
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "1rem", lineHeight: 1.7, maxWidth: 620 }}>
          Alphabit is an analytics product. The most important security property we have is what we
          deliberately don&apos;t do: we never take custody, never connect to your exchange, and never ask
          for a password.
        </p>
      </div>

      {/* The four commitments */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 48 }}>
        {[
          {
            icon: ShieldCheck,
            title: "No custody, ever",
            desc: "We never hold, move, or have access to your crypto. There is no deposit address, no wallet connection, no transaction signing anywhere in the product.",
          },
          {
            icon: EyeOff,
            title: "No exchange API keys",
            desc: "We never ask you to link an exchange account or paste API keys. Portfolio data is numbers you type in manually — we have no ability to trade or withdraw on your behalf.",
          },
          {
            icon: KeyRound,
            title: "No passwords",
            desc: "Sign-in uses email magic links (one-time codes) via Supabase Auth. There is no password for us to store, and none for an attacker to steal.",
          },
          {
            icon: Database,
            title: "Local-first portfolio data",
            desc: "By default, Portfolio Tracker holdings live in your own browser's storage and never reach our servers. If you sign in, holdings sync to your account, protected by per-user access rules (row-level security).",
          },
        ].map((c) => (
          <div key={c.title} style={{ padding: 22, backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <c.icon size={22} color="var(--blue)" strokeWidth={1.75} style={{ marginBottom: 12 }} />
            <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 8 }}>{c.title}</div>
            <div style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.65 }}>{c.desc}</div>
          </div>
        ))}
      </div>

      {/* What we actually store */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 16 }}>Everything we store, itemized</h2>
        <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {[
            { what: "Your email address", when: "If you create an account or join a waitlist", where: "Supabase (managed Postgres)" },
            { what: "Portfolio holdings (coin, amount, cost basis)", when: "Only if you sign in and use the Portfolio Tracker", where: "Supabase, row-level security scoped to your user ID" },
            { what: "Subscription status", when: "Only if you purchase a paid plan", where: "Stripe (payment details never touch our servers)" },
            { what: "Anonymous portfolio data", when: "If you use Portfolio Tracker without an account", where: "Your browser's localStorage only — never sent to us" },
          ].map((row, i) => (
            <div key={row.what} style={{ padding: "14px 20px", borderTop: i > 0 ? "1px solid var(--border)" : "none", display: "grid", gridTemplateColumns: "1fr", gap: 4 }}>
              <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{row.what}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>When: {row.when}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Where: {row.where}</div>
            </div>
          ))}
        </div>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.6, marginTop: 14 }}>
          That&apos;s the complete list. No trackers beyond basic hosting analytics, no selling of data, no
          third-party ad networks.
        </p>
      </section>

      {/* Infrastructure */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 16 }}>Infrastructure</h2>
        <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 10, color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.7 }}>
          <li>Hosted on Vercel; all traffic is HTTPS-only.</li>
          <li>Authentication and database by Supabase, with row-level security on every user-scoped table.</li>
          <li>Payments (when live) handled entirely by Stripe — card numbers never pass through Alphabit servers.</li>
          <li>Market data comes from read-only public APIs (CoinMetrics, FRED, alternative.me, OKX, CoinGecko); no user data flows to them.</li>
        </ul>
      </section>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link
          href="/legal/privacy"
          style={{ padding: "12px 28px", backgroundColor: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, fontWeight: 600, fontSize: "0.95rem", textDecoration: "none" }}
        >
          Privacy Policy
        </Link>
        <Link
          href="/legal/terms"
          style={{ padding: "12px 28px", backgroundColor: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, fontWeight: 600, fontSize: "0.95rem", textDecoration: "none" }}
        >
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
