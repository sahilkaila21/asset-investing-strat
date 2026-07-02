-- Account-persisted Portfolio Tracker holdings, replacing localStorage-only storage
-- for signed-in users. Anonymous users keep using localStorage (see app/tools/portfolio/page.tsx).

create table if not exists public.portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  coin text not null,
  amount numeric not null,
  avg_cost numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portfolio_holdings enable row level security;

create policy "portfolio_holdings_select_own"
  on public.portfolio_holdings for select
  using (auth.uid() = user_id);

create policy "portfolio_holdings_insert_own"
  on public.portfolio_holdings for insert
  with check (auth.uid() = user_id);

create policy "portfolio_holdings_update_own"
  on public.portfolio_holdings for update
  using (auth.uid() = user_id);

create policy "portfolio_holdings_delete_own"
  on public.portfolio_holdings for delete
  using (auth.uid() = user_id);

create index if not exists portfolio_holdings_user_id_idx on public.portfolio_holdings (user_id);
