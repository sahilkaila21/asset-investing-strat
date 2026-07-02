-- Email capture for the weekly digest / Pro waitlist, before Stripe billing is live.

create table if not exists public.email_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'unknown',
  created_at timestamptz not null default now(),
  unique (email, source)
);

alter table public.email_signups enable row level security;

-- Inserts come from a server route using the service role key, so no anon/authenticated
-- policies are needed. Table is server-write-only by design.
