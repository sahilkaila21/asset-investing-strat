"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

interface Tool {
  href: string;
  icon: ReactNode;
  label: string;
  tag: string;
  tagColor: string;
  description: string;
  features: string[];
}

export default function ToolCard({ tool }: { tool: Tool }) {
  const [hovered, setHovered] = useState(false);
  const isLive = tool.tag === "Live";

  return (
    <Link href={tool.href} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          backgroundColor: "var(--surface)",
          border: `1px solid ${hovered ? "var(--blue)" : "var(--border)"}`,
          borderRadius: 12,
          padding: 28,
          height: "100%",
          transform: hovered ? "translateY(-2px)" : "translateY(0)",
          transition: "border-color 0.2s, transform 0.15s",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {tool.icon}
            <span style={{ fontWeight: 700, fontSize: "1rem" }}>{tool.label}</span>
          </div>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 999,
              backgroundColor: isLive ? "rgba(52,211,153,0.12)" : "rgba(139,146,165,0.12)",
              color: tool.tagColor,
              border: `1px solid ${isLive ? "rgba(52,211,153,0.3)" : "var(--border)"}`,
              textTransform: "uppercase" as const,
              letterSpacing: "0.06em",
            }}
          >
            {tool.tag}
          </span>
        </div>

        <p style={{ color: "var(--muted)", fontSize: "0.875rem", lineHeight: 1.65, marginBottom: 18 }}>
          {tool.description}
        </p>

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {tool.features.map((f) => (
            <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: "var(--muted)" }}>
              <span style={{ color: "var(--blue)", fontSize: "0.65rem" }}>●</span>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </Link>
  );
}
