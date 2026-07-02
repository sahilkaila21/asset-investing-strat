-- Subscription state per user, driven by Stripe webhooks.
-- Run this once a real Supabase project is connected (see website/README or ask Sahil for project ref).

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  tier text not null default 'free' check (tier in ('free', 'pro', 'institutional')),
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled', 'incomplete')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Users can read their own subscription row.
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Only the service role (used by the Stripe webhook handler) can write.
-- No insert/update/delete policy for authenticated/anon roles is defined on purpose.

create index if not exists subscriptions_stripe_customer_id_idx on public.subscriptions (stripe_customer_id);
