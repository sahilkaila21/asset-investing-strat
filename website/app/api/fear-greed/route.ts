import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch("https://api.alternative.me/fng/?limit=365&format=json", {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: `Upstream error ${res.status}` }, { status: 502 });
  }

  const json = await res.json();
  return NextResponse.json(json.data ?? []);
}
