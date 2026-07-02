import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  description: string;
  icon: LucideIcon;
}

export default function ComingSoon({ title, description, icon: Icon }: Props) {
  return (
    <div style={{ maxWidth: 600, margin: "80px auto", textAlign: "center", padding: "0 24px" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
        <Icon size={40} color="var(--muted)" strokeWidth={1.5} />
      </div>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 12 }}>{title}</h1>
      <p style={{ color: "var(--muted)", fontSize: "1rem", lineHeight: 1.6, marginBottom: 32 }}>
        {description}
      </p>
      <div
        style={{
          display: "inline-block",
          padding: "8px 20px",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          color: "var(--blue)",
          fontSize: "0.875rem",
          fontWeight: 600,
          marginBottom: 32,
        }}
      >
        Coming Soon
      </div>
      <div>
        <Link
          href="/"
          style={{
            color: "var(--muted)",
            fontSize: "0.875rem",
            textDecoration: "none",
            borderBottom: "1px solid var(--border)",
            paddingBottom: 2,
          }}
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
