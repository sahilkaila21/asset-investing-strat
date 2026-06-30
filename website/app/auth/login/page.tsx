"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setSubmitted(true);
      }
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 120px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 36,
        }}
      >
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: 8,
          }}
        >
          Sign in to AssetStrat
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: 28 }}>
          We&apos;ll send a magic link to your email — no password needed.
        </p>

        {submitted ? (
          <div
            style={{
              backgroundColor: "#1a2e1a",
              border: "1px solid var(--green)",
              borderRadius: 8,
              padding: "16px 20px",
              color: "var(--green)",
              fontSize: "0.9rem",
              lineHeight: 1.5,
            }}
          >
            Check your inbox — we sent a link to <strong>{email}</strong>.
            <br />
            <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
              The link expires in 60 minutes.
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label
                htmlFor="email"
                style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", marginBottom: 6 }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 7,
                  color: "var(--text)",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
            </div>

            {error && (
              <p style={{ color: "var(--red)", fontSize: "0.8rem", margin: 0 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "11px",
                backgroundColor: loading ? "var(--border)" : "var(--blue)",
                color: "#fff",
                border: "none",
                borderRadius: 7,
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}

        <p style={{ marginTop: 24, textAlign: "center", fontSize: "0.8rem", color: "var(--muted)" }}>
          <Link href="/" style={{ color: "var(--muted)", textDecoration: "underline" }}>
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
