import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const { email, source } = await req.json().catch(() => ({}));

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (supabase) {
    await supabase
      .from("email_signups")
      .upsert({ email, source: typeof source === "string" ? source : "unknown" }, { onConflict: "email,source" });
  }

  // Always report success — capturing the lead client-side succeeded either way,
  // and persistence is best-effort until Supabase is connected.
  return NextResponse.json({ ok: true });
}
