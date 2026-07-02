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
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <svg width="24" height="21" viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="12" width="4" height="8" rx="1.5" fill="#4f7cff" opacity="0.5"/>
              <rect x="6" y="7" width="4" height="13" rx="1.5" fill="#4f7cff" opacity="0.75"/>
              <rect x="12" y="3" width="4" height="17" rx="1.5" fill="#4f7cff"/>
              <rect x="18" y="0" width="4" height="20" rx="1.5" fill="#34d399"/>
            </svg>
            <span style={{ fontWeight: 700, fontSize: "1rem" }}>
              Alpha<span style={{ color: "var(--blue)" }}>bit</span>
            </span>
          </div>
          <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
            Data-driven crypto investment tools.
          </div>
        </div>

        <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
          {[
            {
              heading: "Tools",
              links: [
                { href: "/tools/risk-model",     label: "Risk Model" },
                { href: "/tools/fear-greed",     label: "Fear & Greed" },
                { href: "/tools/macro",          label: "Macro" },
                { href: "/tools/dca-calculator", label: "DCA Calculator" },
                { href: "/tools/portfolio",      label: "Portfolio" },
                { href: "/tools/whale-tracker",  label: "Whale Tracker" },
              ],
            },
            {
              heading: "Company",
              links: [
                { href: "/methodology", label: "Methodology" },
                { href: "/pricing",     label: "Pricing" },
                { href: "/about",       label: "Our Story" },
                { href: "/faq",         label: "FAQ" },
              ],
            },
            {
              heading: "Trust",
              links: [
                { href: "/security",         label: "Security" },
                { href: "/legal/privacy",    label: "Privacy" },
                { href: "/legal/terms",      label: "Terms" },
                { href: "/legal/disclosure", label: "Disclosure" },
              ],
            },
          ].map((col) => (
            <div key={col.heading}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 10 }}>
                {col.heading}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {col.links.map((l) => (
                  <Link key={l.href} href={l.href} style={{ color: "var(--muted)", fontSize: "0.85rem", textDecoration: "none" }}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ color: "var(--muted)", fontSize: "0.78rem", maxWidth: 260 }}>
          © {new Date().getFullYear()} Alphabit. Not financial advice — see our{" "}
          <Link href="/legal/disclosure" style={{ color: "var(--muted)", textDecoration: "underline" }}>
            full disclosure
          </Link>.
        </div>
      </div>
    </footer>
  );
}
