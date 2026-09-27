-- Estato v3 additive social/agent layer.
--
-- IMPORTANT:
-- v3 deliberately reuses the proven v2 tables for current app data:
-- search_preferences, matches (global inventory), user_match_actions,
-- agent_status and agent_activity.
--
-- New social/agent tables are namespaced with v3_ so this migration can
-- coexist with the older profiles/conversations/messages/matches schemas.

create schema if not exists private;

create table if not exists public.v3_agents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  agent_type text check (agent_type in ('personal','household','listing','organisation')) not null default 'personal',
  bio text,
  status text not null default 'active',
  public_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.v3_agent_private_state (
  agent_id uuid references public.v3_agents(id) on delete cascade primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.v3_agent_permissions (
  agent_id uuid references public.v3_agents(id) on delete cascade primary key,
  message_agents text check (message_agents in ('allowed','ask','never')) not null default 'allowed',
  message_humans text check (message_humans in ('allowed','ask','never')) not null default 'ask',
  propose_matches text check (propose_matches in ('allowed','ask','never')) not null default 'allowed',
  initiate_introductions text check (initiate_introductions in ('allowed','ask','never')) not null default 'ask',
  schedule_viewings text check (schedule_viewings in ('allowed','ask','never')) not null default 'ask',
  make_payments text check (make_payments in ('allowed','ask','never')) not null default 'never',
  sign_contracts text check (sign_contracts in ('allowed','ask','never')) not null default 'never',
  limits jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.v3_households (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete cascade not null,
  agent_id uuid references public.v3_agents(id) on delete set null,
  name text not null,
  city text,
  neighbourhood text,
  description text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.v3_household_members (
  household_id uuid references public.v3_households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz default now(),
  primary key (household_id, user_id)
);

create table if not exists public.v3_conversations (
  id uuid primary key default gen_random_uuid(),
  conversation_type text not null default 'mixed',
  subject_type text,
  subject_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.v3_conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.v3_conversations(id) on delete cascade not null,
  participant_type text check (participant_type in ('human','agent')) not null,
  human_user_id uuid references auth.users(id) on delete cascade,
  agent_id uuid references public.v3_agents(id) on delete cascade,
  joined_at timestamptz default now(),
  check (
    (participant_type = 'human' and human_user_id is not null and agent_id is null)
    or
    (participant_type = 'agent' and agent_id is not null and human_user_id is null)
  )
);

create unique index if not exists v3_participant_human_unique
  on public.v3_conversation_participants(conversation_id, human_user_id)
  where human_user_id is not null;

create unique index if not exists v3_participant_agent_unique
  on public.v3_conversation_participants(conversation_id, agent_id)
  where agent_id is not null;

create table if not exists public.v3_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.v3_conversations(id) on delete cascade not null,
  sender_type text check (sender_type in ('human','agent')) not null,
  sender_user_id uuid references auth.users(id) on delete cascade,
  sender_agent_id uuid references public.v3_agents(id) on delete cascade,
  content text not null,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  check (
    (sender_type = 'human' and sender_user_id is not null and sender_agent_id is null)
    or
    (sender_type = 'agent' and sender_agent_id is not null and sender_user_id is null)
  )
);

create table if not exists public.v3_social_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  subject_type text check (subject_type in ('user','household','inventory_match')) not null,
  subject_id uuid not null,
  decision text check (decision in ('interested','pass','save')) not null,
  reason_codes text[] not null default '{}',
  note text,
  created_at timestamptz default now(),
  unique (user_id, subject_type, subject_id)
);

alter table public.v3_agents enable row level security;
alter table public.v3_agent_private_state enable row level security;
alter table public.v3_agent_permissions enable row level security;
alter table public.v3_households enable row level security;
alter table public.v3_household_members enable row level security;
alter table public.v3_conversations enable row level security;
alter table public.v3_conversation_participants enable row level security;
alter table public.v3_messages enable row level security;
alter table public.v3_social_decisions enable row level security;

-- Explicit Data API privileges. RLS policies below still determine row access.
grant select, insert, update, delete on public.v3_agents to authenticated;
grant select, insert, update, delete on public.v3_agent_private_state to authenticated;
grant select, insert, update, delete on public.v3_agent_permissions to authenticated;
grant select, insert, update, delete on public.v3_households to authenticated;
grant select, insert, update, delete on public.v3_household_members to authenticated;
grant select, insert, update, delete on public.v3_conversations to authenticated;
grant select, insert, update, delete on public.v3_conversation_participants to authenticated;
grant select, insert, update, delete on public.v3_messages to authenticated;
grant select, insert, update, delete on public.v3_social_decisions to authenticated;

-- Agent identities are intentionally discoverable to signed-in users.
create policy "authenticated read public agents"
  on public.v3_agents for select
  to authenticated
  using (true);

create policy "owners insert agents"
  on public.v3_agents for insert
  to authenticated
  with check ((select auth.uid()) = owner_user_id);

create policy "owners update agents"
  on public.v3_agents for update
  to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

create policy "owners delete agents"
  on public.v3_agents for delete
  to authenticated
  using ((select auth.uid()) = owner_user_id);

create policy "owners manage private agent state"
  on public.v3_agent_private_state for all
  to authenticated
  using (
    exists (
      select 1
      from public.v3_agents
      where v3_agents.id = v3_agent_private_state.agent_id
        and v3_agents.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.v3_agents
      where v3_agents.id = v3_agent_private_state.agent_id
        and v3_agents.owner_user_id = (select auth.uid())
    )
  );

create policy "owners manage permissions"
  on public.v3_agent_permissions for all
  to authenticated
  using (
    exists (
      select 1
      from public.v3_agents
      where v3_agents.id = v3_agent_permissions.agent_id
        and v3_agents.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.v3_agents
      where v3_agents.id = v3_agent_permissions.agent_id
        and v3_agents.owner_user_id = (select auth.uid())
    )
  );

-- Households are intentionally discoverable to signed-in users.
create policy "authenticated read households"
  on public.v3_households for select
  to authenticated
  using (true);

create policy "creator inserts household"
  on public.v3_households for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "creator updates household"
  on public.v3_households for update
  to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "creator deletes household"
  on public.v3_households for delete
  to authenticated
  using (created_by = (select auth.uid()));

create policy "members read household membership"
  on public.v3_household_members for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.v3_households
      where v3_households.id = v3_household_members.household_id
        and v3_households.created_by = (select auth.uid())
    )
  );

create policy "household creator inserts membership"
  on public.v3_household_members for insert
  to authenticated
  with check (
    exists (
      select 1 from public.v3_households
      where v3_households.id = v3_household_members.household_id
        and v3_households.created_by = (select auth.uid())
    )
  );

create policy "household creator updates membership"
  on public.v3_household_members for update
  to authenticated
  using (
    exists (
      select 1 from public.v3_households
      where v3_households.id = v3_household_members.household_id
        and v3_households.created_by = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.v3_households
      where v3_households.id = v3_household_members.household_id
        and v3_households.created_by = (select auth.uid())
    )
  );

create policy "household creator deletes membership"
  on public.v3_household_members for delete
  to authenticated
  using (
    exists (
      select 1 from public.v3_households
      where v3_households.id = v3_household_members.household_id
        and v3_households.created_by = (select auth.uid())
    )
  );

-- This helper must bypass participant-table RLS to avoid policy recursion.
-- It lives in a non-exposed schema, has an explicit authenticated-user check,
-- and has no PUBLIC execute grant.
create or replace function private.v3_is_conversation_participant(target_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.v3_conversation_participants cp
      left join public.v3_agents a on a.id = cp.agent_id
      where cp.conversation_id = target_conversation
        and (
          cp.human_user_id = (select auth.uid())
          or a.owner_user_id = (select auth.uid())
        )
    );
$$;

revoke all on function private.v3_is_conversation_participant(uuid) from public;
grant execute on function private.v3_is_conversation_participant(uuid) to authenticated;

create policy "participants read conversations"
  on public.v3_conversations for select
  to authenticated
  using (
    created_by = (select auth.uid())
    or private.v3_is_conversation_participant(id)
  );

create policy "authenticated create conversations"
  on public.v3_conversations for insert
  to authenticated
  with check ((select auth.uid()) = created_by);

create policy "participants update conversations"
  on public.v3_conversations for update
  to authenticated
  using (
    created_by = (select auth.uid())
    or private.v3_is_conversation_participant(id)
  )
  with check (
    created_by = (select auth.uid())
    or private.v3_is_conversation_participant(id)
  );

create policy "conversation creator deletes conversation"
  on public.v3_conversations for delete
  to authenticated
  using (created_by = (select auth.uid()));

create policy "participants read participant list"
  on public.v3_conversation_participants for select
  to authenticated
  using (
    private.v3_is_conversation_participant(conversation_id)
    or exists (
      select 1 from public.v3_conversations c
      where c.id = conversation_id
        and c.created_by = (select auth.uid())
    )
  );

create policy "participants add participants"
  on public.v3_conversation_participants for insert
  to authenticated
  with check (
    private.v3_is_conversation_participant(conversation_id)
    or exists (
      select 1 from public.v3_conversations c
      where c.id = conversation_id
        and c.created_by = (select auth.uid())
    )
  );

create policy "participants remove participants"
  on public.v3_conversation_participants for delete
  to authenticated
  using (
    private.v3_is_conversation_participant(conversation_id)
    and (
      human_user_id = (select auth.uid())
      or exists (
        select 1 from public.v3_agents a
        where a.id = agent_id
          and a.owner_user_id = (select auth.uid())
      )
    )
  );

create policy "participants read messages"
  on public.v3_messages for select
  to authenticated
  using (private.v3_is_conversation_participant(conversation_id));

create policy "participants send own messages"
  on public.v3_messages for insert
  to authenticated
  with check (
    private.v3_is_conversation_participant(conversation_id)
    and (
      sender_user_id = (select auth.uid())
      or exists (
        select 1 from public.v3_agents
        where v3_agents.id = v3_messages.sender_agent_id
          and v3_agents.owner_user_id = (select auth.uid())
      )
    )
  );

create policy "users manage own social decisions"
  on public.v3_social_decisions for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
