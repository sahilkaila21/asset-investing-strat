"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import AuthButton from "@/components/AuthButton";

const tools = [
  { href: "/tools/risk-model",      label: "Risk Model" },
  { href: "/tools/fear-greed",      label: "Fear & Greed" },
  { href: "/tools/macro",           label: "Macro Dashboard" },
  { href: "/tools/dca-calculator",  label: "DCA Calculator" },
  { href: "/tools/portfolio",       label: "Portfolio Tracker" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav
      style={{
        backgroundColor: "#161b27",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", height: 60, gap: 32 }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
              Asset<span style={{ color: "var(--blue)" }}>Strat</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div style={{ display: "flex", gap: 4, flex: 1 }} className="hidden-mobile">
            {tools.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: "0.875rem",
                    fontWeight: active ? 600 : 400,
                    color: active ? "var(--text)" : "var(--muted)",
                    backgroundColor: active ? "var(--surface)" : "transparent",
                    textDecoration: "none",
                    transition: "color 0.15s, background 0.15s",
                  }}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>

          {/* CTA */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <AuthButton />

            {/* Mobile hamburger */}
            <button
              onClick={() => setOpen(!open)}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                padding: 4,
                display: "none",
              }}
              className="show-mobile"
              aria-label="Menu"
            >
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2}>
                {open
                  ? <><line x1="4" y1="4" x2="18" y2="18"/><line x1="18" y1="4" x2="4" y2="18"/></>
                  : <><line x1="3" y1="6" x2="19" y2="6"/><line x1="3" y1="12" x2="19" y2="12"/><line x1="3" y1="18" x2="19" y2="18"/></>
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div style={{ padding: "8px 0 16px", borderTop: "1px solid var(--border)" }}>
            {tools.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                onClick={() => setOpen(false)}
                style={{
                  display: "block",
                  padding: "10px 4px",
                  color: pathname === t.href ? "var(--text)" : "var(--muted)",
                  textDecoration: "none",
                  fontSize: "0.9rem",
                  fontWeight: pathname === t.href ? 600 : 400,
                }}
              >
                {t.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile   { display: block !important; }
        }
      `}</style>
    </nav>
  );
}
