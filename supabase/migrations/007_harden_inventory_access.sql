-- Restrict legacy shared inventory to signed-in users only.

drop policy if exists "authenticated users can read inventory"
  on public.matches;

create policy "authenticated users can read inventory"
  on public.matches for select
  to authenticated
  using (user_id is null);

drop policy if exists "authenticated users read listings"
  on public.listings;

create policy "authenticated users read listings"
  on public.listings for select
  to authenticated
  using (true);

create index if not exists v3_households_agent_idx
  on public.v3_households(agent_id)
  where agent_id is not null;
