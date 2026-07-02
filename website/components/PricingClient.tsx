"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import EmailCapture from "@/components/EmailCapture";

const PRO_MONTHLY = 39;
const PRO_ANNUAL_TOTAL = Math.round(PRO_MONTHLY * 12 * 0.8); // ~20% off
const PRO_ANNUAL_MONTHLY_EQUIV = Math.round(PRO_ANNUAL_TOTAL / 12);

type Interval = "monthly" | "annual";

function Card({
  children,
  highlighted = false,
}: {
  children: React.ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: `1px solid ${highlighted ? "var(--blue)" : "var(--border)"}`,
        borderRadius: 14,
        padding: 32,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((f) => (
        <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.85rem", color: "var(--muted)" }}>
          <Check size={15} color="var(--green)" strokeWidth={2.5} style={{ marginTop: 2, flexShrink: 0 }} />
          {f}
        </li>
      ))}
    </ul>
  );
}

export default function PricingClient() {
  const [interval, setInterval] = useState<Interval>("monthly");
  const [proState, setProState] = useState<"idle" | "loading" | "waitlist" | "error">("idle");
  const [showInstitutionalCapture, setShowInstitutionalCapture] = useState(false);

  async function handleGetPro() {
    setProState("loading");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });

      if (res.status === 401) {
        window.location.href = "/auth/login?next=/pricing";
        return;
      }

      if (!res.ok) {
        setProState("waitlist");
        return;
      }

      const { url } = await res.json();
      if (url) window.location.href = url;
      else setProState("waitlist");
    } catch {
      setProState("error");
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 24px 96px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 10 }}>
          Pricing
        </div>
        <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 14 }}>
          Start free. Upgrade when depth matters.
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "1rem", maxWidth: 560, margin: "0 auto" }}>
          The current risk score and zone are free, always. Pro unlocks history, multi-asset coverage, and persistence.
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 44 }}>
        <div
          style={{
            display: "inline-flex",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 999,
            padding: 4,
          }}
        >
          {(["monthly", "annual"] as Interval[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setInterval(opt)}
              style={{
                padding: "8px 20px",
                borderRadius: 999,
                border: "none",
                backgroundColor: interval === opt ? "var(--blue)" : "transparent",
                color: interval === opt ? "#fff" : "var(--muted)",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              {opt === "monthly" ? "Monthly" : "Annual — save 20%"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
        {/* Free */}
        <Card>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 6 }}>Free</div>
            <div style={{ fontSize: "2rem", fontWeight: 800 }}>
              $0<span style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--muted)" }}> /mo</span>
            </div>
          </div>
          <FeatureList
            items={[
              "This week's risk score & zone (BTC)",
              "Fear & Greed, Macro Dashboard, DCA Calculator",
              "Portfolio Tracker (stored in your browser)",
              "Whale Tracker",
            ]}
          />
          <Link
            href="/tools/risk-model"
            style={{
              marginTop: "auto",
              textAlign: "center",
              padding: "11px 20px",
              backgroundColor: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
              fontWeight: 600,
              fontSize: "0.9rem",
              textDecoration: "none",
            }}
          >
            Get started
          </Link>
        </Card>

        {/* Pro */}
        <Card highlighted>
          <div
            style={{
              position: "absolute",
              top: -12,
              left: 32,
              backgroundColor: "var(--blue)",
              color: "#fff",
              fontSize: "0.68rem",
              fontWeight: 700,
              padding: "3px 12px",
              borderRadius: 999,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Most popular
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 6 }}>Pro</div>
            <div style={{ fontSize: "2rem", fontWeight: 800 }}>
              ${interval === "monthly" ? PRO_MONTHLY : PRO_ANNUAL_MONTHLY_EQUIV}
              <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--muted)" }}> /mo</span>
            </div>
            {interval === "annual" && (
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 2 }}>
                Billed ${PRO_ANNUAL_TOTAL}/yr
              </div>
            )}
          </div>
          <FeatureList
            items={[
              "Everything in Free",
              "Full historical signal archive",
              "Per-factor breakdown (published weights)",
              "Multi-asset coverage: ETH, SOL",
              "Portfolio Tracker synced to your account",
              "Weekly signal email digest",
            ]}
          />
          {proState === "waitlist" ? (
            <div style={{ marginTop: "auto" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 10 }}>
                Pro billing is launching soon — leave your email and we&apos;ll let you know.
              </p>
              <EmailCapture source="pro-waitlist" />
            </div>
          ) : (
            <button
              onClick={handleGetPro}
              disabled={proState === "loading"}
              style={{
                marginTop: "auto",
                padding: "11px 20px",
                backgroundColor: "var(--blue)",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: proState === "loading" ? "not-allowed" : "pointer",
              }}
            >
              {proState === "loading" ? "Loading…" : "Get Pro"}
            </button>
          )}
        </Card>

        {/* Institutional */}
        <Card>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 6 }}>Institutional</div>
            <div style={{ fontSize: "2rem", fontWeight: 800 }}>Custom</div>
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 2 }}>Starting around $500/mo</div>
          </div>
          <FeatureList
            items={[
              "Everything in Pro",
              "API access",
              "Custom factor weighting for internal use",
              "Priority data refresh",
              "Multi-user seats",
              "Dedicated support & onboarding",
            ]}
          />
          {showInstitutionalCapture ? (
            <div style={{ marginTop: "auto" }}>
              <EmailCapture source="institutional" buttonLabel="Request info" placeholder="you@fund.com" />
            </div>
          ) : (
            <button
              onClick={() => setShowInstitutionalCapture(true)}
              style={{
                marginTop: "auto",
                padding: "11px 20px",
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              Talk to sales
            </button>
          )}
        </Card>
      </div>

      <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.8rem", marginTop: 48, maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>
        Past performance doesn&apos;t guarantee future results. Alphabit is a decision-support tool, not financial advice.
      </p>
    </div>
  );
}
