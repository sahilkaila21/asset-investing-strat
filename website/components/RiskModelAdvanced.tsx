"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/configured";
import { getSubscriptionTier } from "@/lib/subscription";

type Factor = { key: string; name: string; tier: string; value: number; weight: number };

function zoneOf(score: number) {
  if (score < 3) return { label: "Accumulate", color: "var(--green)" };
  if (score <= 6) return { label: "Hold", color: "#facc15" };
  return { label: "Reduce", color: "var(--red)" };
}

/** Recompute the 0–10 composite from per-factor values (0–100) and integer weights. */
function recompute(factors: Factor[], weights: Record<string, number>) {
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  if (total <= 0) return 0;
  const raw = factors.reduce((s, f) => s + (weights[f.key] / total) * f.value, 0);
  return Math.max(0, Math.min(10, raw / 10));
}

export default function RiskModelAdvanced({ factors, baseScore }: { factors: Factor[]; baseScore: number }) {
  const defaults = useMemo(
    () => Object.fromEntries(factors.map((f) => [f.key, Math.round(f.weight * 100)])),
    [factors]
  );
  const [weights, setWeights] = useState<Record<string, number>>(defaults);
  const [entitled, setEntitled] = useState<"loading" | "yes" | "no">("loading");

  useEffect(() => {
    let active = true;
    (async () => {
      if (!isSupabaseConfigured()) {
        if (active) setEntitled("no");
        return;
      }
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const tier = await getSubscriptionTier(supabase, data.user?.id);
        if (active) setEntitled(tier === "pro" || tier === "institutional" ? "yes" : "no");
      } catch {
        if (active) setEntitled("no");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const score = recompute(factors, weights);
  const z = zoneOf(score);
  const changed = factors.some((f) => weights[f.key] !== defaults[f.key]);
  const locked = entitled !== "yes";

  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Advanced: tune the weights</h2>
        <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "3px 9px", borderRadius: 999, backgroundColor: "rgba(79,124,255,0.12)", color: "var(--blue)", border: "1px solid rgba(79,124,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Pro
        </span>
      </div>
      <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 18, maxWidth: 640 }}>
        Explore how the score responds to different factor weightings. The published default is the
        authoritative signal — this is a research view, computed live in your browser.
      </p>

      <div style={{ position: "relative", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "22px 24px" }}>
        {/* live recomputed score */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
            Recomputed score
          </span>
          <span style={{ fontSize: "1.6rem", fontWeight: 800 }}>{score.toFixed(2)}</span>
          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: z.color }}>{z.label}</span>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>vs. {baseScore.toFixed(2)} default</span>
          {changed && (
            <button
              onClick={() => setWeights(defaults)}
              style={{ marginLeft: "auto", fontSize: "0.78rem", color: "var(--blue)", background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
            >
              Reset
            </button>
          )}
        </div>

        {/* sliders */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "14px 28px", filter: locked ? "blur(4px)" : "none", pointerEvents: locked ? "none" : "auto", userSelect: locked ? "none" : "auto" }}>
          {factors.map((f) => (
            <div key={f.key}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 4 }}>
                <span>{f.name}</span>
                <span style={{ fontFamily: "monospace", color: "var(--muted)" }}>{weights[f.key]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                value={weights[f.key]}
                onChange={(e) => setWeights((w) => ({ ...w, [f.key]: Number(e.target.value) }))}
                style={{ width: "100%", accentColor: "#4f7cff", cursor: locked ? "not-allowed" : "pointer" }}
                disabled={locked}
              />
            </div>
          ))}
        </div>

        {/* lock overlay */}
        {locked && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              backgroundColor: "rgba(15,17,23,0.55)",
              borderRadius: 12,
              textAlign: "center",
              padding: 24,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "1rem" }}>Custom weighting is a Pro feature</div>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", maxWidth: 360, margin: 0 }}>
              Everyone sees the same authoritative default signal. Pro unlocks live weight tuning for
              your own research.
            </p>
            <Link href="/pricing" style={{ padding: "9px 22px", backgroundColor: "var(--blue)", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>
              See plans →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
