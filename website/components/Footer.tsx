import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        backgroundColor: "#161b27",
        padding: "32px 24px",
        marginTop: "auto",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 4 }}>
            Asset<span style={{ color: "var(--blue)" }}>Strat</span>
          </div>
          <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
            Risk-managed crypto investment tools.
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {[
            { href: "/tools/risk-model",     label: "Risk Model" },
            { href: "/tools/fear-greed",     label: "Fear & Greed" },
            { href: "/tools/macro",          label: "Macro" },
            { href: "/tools/dca-calculator", label: "DCA Calculator" },
            { href: "/tools/portfolio",      label: "Portfolio" },
          ].map((l) => (
            <Link key={l.href} href={l.href} style={{ color: "var(--muted)", fontSize: "0.85rem", textDecoration: "none" }}>
              {l.label}
            </Link>
          ))}
        </div>

        <div style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
          © {new Date().getFullYear()} AssetStrat. For informational purposes only.
        </div>
      </div>
    </footer>
  );
}
