import type { ReactNode } from "react";

/**
 * Shared shell for legal pages. The review banner stays until a lawyer has
 * reviewed the text and the [ENTITY]/[JURISDICTION] placeholders are replaced.
 */
export default function LegalLayout({
  label,
  title,
  updated,
  children,
}: {
  label: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px 96px" }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 10 }}>
          {label}
        </div>
        <h1 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 10 }}>
          {title}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Last updated: {updated}</p>
      </div>

      <div
        style={{
          backgroundColor: "rgba(250, 204, 21, 0.08)",
          border: "1px solid rgba(250, 204, 21, 0.35)",
          borderRadius: 10,
          padding: "14px 18px",
          marginBottom: 36,
          fontSize: "0.85rem",
          lineHeight: 1.6,
          color: "#facc15",
        }}
      >
        <strong>Draft pending legal review.</strong> This document is a working draft and has not yet been
        reviewed by counsel. Entity and jurisdiction details are placeholders. It describes our practices
        in good faith but should not yet be relied on as a binding legal document.
      </div>

      <div className="legal-body">
        {children}
      </div>

      <style>{`
        .legal-body h2 {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 32px 0 12px;
          letter-spacing: -0.01em;
        }
        .legal-body p, .legal-body li {
          color: var(--muted);
          font-size: 0.9rem;
          line-height: 1.75;
          margin-bottom: 12px;
        }
        .legal-body ul {
          padding-left: 20px;
          margin-bottom: 12px;
        }
        .legal-body strong {
          color: var(--text);
        }
        .legal-body a {
          color: var(--blue);
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}
