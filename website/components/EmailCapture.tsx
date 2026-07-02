"use client";

import { useState } from "react";

export default function EmailCapture({
  source,
  placeholder = "you@email.com",
  buttonLabel = "Notify me",
}: {
  source: string;
  placeholder?: string;
  buttonLabel?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p style={{ color: "var(--green)", fontSize: "0.85rem", fontWeight: 600 }}>
        You&apos;re on the list — we&apos;ll email you when this is ready.
      </p>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 200,
          padding: "10px 14px",
          backgroundColor: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 7,
          color: "var(--text)",
          fontSize: "0.875rem",
        }}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        style={{
          padding: "10px 20px",
          backgroundColor: "var(--blue)",
          color: "#fff",
          border: "none",
          borderRadius: 7,
          fontWeight: 600,
          fontSize: "0.875rem",
          cursor: status === "loading" ? "not-allowed" : "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {status === "loading" ? "Sending…" : buttonLabel}
      </button>
      {status === "error" && (
        <p style={{ color: "var(--red)", fontSize: "0.8rem", width: "100%" }}>
          Something went wrong — try again in a moment.
        </p>
      )}
    </form>
  );
}
