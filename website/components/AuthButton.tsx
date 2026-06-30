"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }

  if (loading) return null;

  if (user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            fontSize: "0.8rem",
            color: "var(--muted)",
            maxWidth: 160,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {user.email}
        </span>
        <button
          onClick={handleSignOut}
          style={{
            padding: "6px 14px",
            backgroundColor: "transparent",
            color: "var(--muted)",
            border: "1px solid var(--border)",
            borderRadius: 7,
            fontSize: "0.8rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/auth/login"
      style={{
        padding: "7px 16px",
        backgroundColor: "var(--blue)",
        color: "#fff",
        borderRadius: 7,
        fontSize: "0.875rem",
        fontWeight: 600,
        textDecoration: "none",
      }}
    >
      Sign in
    </Link>
  );
}
