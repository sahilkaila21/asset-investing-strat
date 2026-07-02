/**
 * True only when Supabase env vars are set to something that looks like a real project
 * (not just present — the repo ships placeholder values like "your_supabase_project_url"
 * in .env.local, which pass a truthiness check but crash the Supabase SDK).
 */
export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.startsWith("http"));
}
