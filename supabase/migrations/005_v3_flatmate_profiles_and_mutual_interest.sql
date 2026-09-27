-- Estato v3 real-user flatmate profiles and mutual-interest conversations.

create table if not exists public.v3_flatmate_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  bio text,
  city text,
  occupation text,
  budget_min integer,
  budget_max integer,
  preferred_neighbourhoods text[] not null default '{}',
  move_in_date date,
  schedule text check (schedule in ('early','standard','night','flexible')),
  cleanliness smallint check (cleanliness between 1 and 5),
  social_level smallint check (social_level between 1 and 5),
  work_from_home boolean,
  smoking text check (smoking in ('non_smoker','outside_only','smoker','no_preference')),
  has_pets boolean,
  pet_details text,
  lifestyle_tags text[] not null default '{}',
  is_discoverable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (budget_min is null or budget_max is null or budget_min <= budget_max)
);

alter table public.v3_flatmate_profiles enable row level security;

grant select, insert, update, delete
  on public.v3_flatmate_profiles
  to authenticated;

create policy "users read own or discoverable flatmate profiles"
  on public.v3_flatmate_profiles for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or is_discoverable = true
  );

create policy "users insert own flatmate profile"
  on public.v3_flatmate_profiles for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "users update own flatmate profile"
  on public.v3_flatmate_profiles for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "users delete own flatmate profile"
  on public.v3_flatmate_profiles for delete
  to authenticated
  using (user_id = (select auth.uid()));

create index if not exists v3_flatmate_profiles_discovery_idx
  on public.v3_flatmate_profiles(city, updated_at desc)
  where is_discoverable = true;

-- Existing users receive private draft profiles. Nothing is published automatically.
insert into public.v3_flatmate_profiles (
  user_id,
  display_name,
  city,
  budget_min,
  budget_max,
  preferred_neighbourhoods,
  occupation,
  lifestyle_tags,
  bio,
  is_discoverable
)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    split_part(u.email, '@', 1),
    'Estato user'
  ),
  prefs.cities[1],
  prefs.budget_min,
  prefs.budget_max,
  coalesce(prefs.areas, '{}'),
  prefs.my_occupation,
  coalesce(prefs.my_lifestyle, '{}'),
  prefs.my_bio,
  false
from auth.users u
left join public.search_preferences prefs on prefs.user_id = u.id
on conflict (user_id) do nothing;

alter table public.v3_conversations
  add column if not exists conversation_key text;

create unique index if not exists v3_conversations_key_unique
  on public.v3_conversations(conversation_key)
  where conversation_key is not null;

alter table public.v3_social_decisions
  add constraint v3_social_decisions_no_self_interest
  check (subject_type <> 'user' or subject_id <> user_id);

-- Users may see only positive interest explicitly directed at them.
create policy "users see interest directed at them"
  on public.v3_social_decisions for select
  to authenticated
  using (
    subject_type = 'user'
    and subject_id = (select auth.uid())
    and decision = 'interested'
  );

create or replace function private.v3_handle_mutual_interest()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reciprocal_exists boolean;
  conversation_id uuid;
  current_agent uuid;
  other_agent uuid;
  pair_key text;
begin
  if new.subject_type <> 'user'
     or new.decision <> 'interested'
     or new.subject_id = new.user_id then
    return new;
  end if;

  select exists (
    select 1
    from public.v3_social_decisions d
    where d.user_id = new.subject_id
      and d.subject_type = 'user'
      and d.subject_id = new.user_id
      and d.decision = 'interested'
  )
  into reciprocal_exists;

  if not reciprocal_exists then
    return new;
  end if;

  pair_key :=
    'human:' ||
    least(new.user_id::text, new.subject_id::text) ||
    ':' ||
    greatest(new.user_id::text, new.subject_id::text);

  insert into public.v3_conversations (
    conversation_type,
    subject_type,
    subject_id,
    created_by,
    conversation_key
  )
  values (
    'human_agent_match',
    'user_match',
    new.subject_id,
    new.user_id,
    pair_key
  )
  on conflict (conversation_key)
  where conversation_key is not null
  do update set updated_at = now()
  returning id into conversation_id;

  insert into public.v3_conversation_participants (
    conversation_id,
    participant_type,
    human_user_id
  )
  values
    (conversation_id, 'human', new.user_id),
    (conversation_id, 'human', new.subject_id)
  on conflict do nothing;

  select id
    into current_agent
  from public.v3_agents
  where owner_user_id = new.user_id
    and agent_type = 'personal'
  limit 1;

  select id
    into other_agent
  from public.v3_agents
  where owner_user_id = new.subject_id
    and agent_type = 'personal'
  limit 1;

  if current_agent is not null then
    insert into public.v3_conversation_participants (
      conversation_id,
      participant_type,
      agent_id
    )
    values (conversation_id, 'agent', current_agent)
    on conflict do nothing;
  end if;

  if other_agent is not null then
    insert into public.v3_conversation_participants (
      conversation_id,
      participant_type,
      agent_id
    )
    values (conversation_id, 'agent', other_agent)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.v3_handle_mutual_interest() from public;
revoke all on function private.v3_handle_mutual_interest() from anon;
revoke all on function private.v3_handle_mutual_interest() from authenticated;

drop trigger if exists v3_social_decision_mutual_interest
  on public.v3_social_decisions;

create trigger v3_social_decision_mutual_interest
after insert or update of decision
on public.v3_social_decisions
for each row
execute function private.v3_handle_mutual_interest();
