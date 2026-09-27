-- Estato v3 additive social/agent layer.
--
-- IMPORTANT:
-- v3 deliberately reuses the proven v2 tables for auth-adjacent app data:
-- search_preferences, matches (global inventory), user_match_actions,
-- agent_status and agent_activity.
--
-- The tables below are namespaced with v3_ so this migration is safe to run
-- against the existing Estato Supabase project without colliding with the
-- older profiles/conversations/messages/matches schemas.

create table if not exists v3_agents (
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

create table if not exists v3_agent_private_state (
  agent_id uuid references v3_agents(id) on delete cascade primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists v3_agent_permissions (
  agent_id uuid references v3_agents(id) on delete cascade primary key,
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

create table if not exists v3_households (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete cascade not null,
  agent_id uuid references v3_agents(id) on delete set null,
  name text not null,
  city text,
  neighbourhood text,
  description text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists v3_household_members (
  household_id uuid references v3_households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz default now(),
  primary key (household_id, user_id)
);

create table if not exists v3_conversations (
  id uuid primary key default gen_random_uuid(),
  conversation_type text not null default 'mixed',
  subject_type text,
  subject_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists v3_conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references v3_conversations(id) on delete cascade not null,
  participant_type text check (participant_type in ('human','agent')) not null,
  human_user_id uuid references auth.users(id) on delete cascade,
  agent_id uuid references v3_agents(id) on delete cascade,
  joined_at timestamptz default now(),
  check (
    (participant_type = 'human' and human_user_id is not null and agent_id is null)
    or
    (participant_type = 'agent' and agent_id is not null and human_user_id is null)
  )
);

create unique index if not exists v3_participant_human_unique
  on v3_conversation_participants(conversation_id, human_user_id)
  where human_user_id is not null;

create unique index if not exists v3_participant_agent_unique
  on v3_conversation_participants(conversation_id, agent_id)
  where agent_id is not null;

create table if not exists v3_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references v3_conversations(id) on delete cascade not null,
  sender_type text check (sender_type in ('human','agent')) not null,
  sender_user_id uuid references auth.users(id) on delete cascade,
  sender_agent_id uuid references v3_agents(id) on delete cascade,
  content text not null,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  check (
    (sender_type = 'human' and sender_user_id is not null and sender_agent_id is null)
    or
    (sender_type = 'agent' and sender_agent_id is not null and sender_user_id is null)
  )
);

create table if not exists v3_social_decisions (
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

alter table v3_agents enable row level security;
alter table v3_agent_private_state enable row level security;
alter table v3_agent_permissions enable row level security;
alter table v3_households enable row level security;
alter table v3_household_members enable row level security;
alter table v3_conversations enable row level security;
alter table v3_conversation_participants enable row level security;
alter table v3_messages enable row level security;
alter table v3_social_decisions enable row level security;

create policy "authenticated read public agents"
  on v3_agents for select
  using (auth.role() = 'authenticated');

create policy "owners insert agents"
  on v3_agents for insert
  with check (auth.uid() = owner_user_id);

create policy "owners update agents"
  on v3_agents for update
  using (auth.uid() = owner_user_id);

create policy "owners delete agents"
  on v3_agents for delete
  using (auth.uid() = owner_user_id);

create policy "owners manage private agent state"
  on v3_agent_private_state for all
  using (
    exists (
      select 1
      from v3_agents
      where v3_agents.id = v3_agent_private_state.agent_id
        and v3_agents.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from v3_agents
      where v3_agents.id = v3_agent_private_state.agent_id
        and v3_agents.owner_user_id = auth.uid()
    )
  );

create policy "owners manage permissions"
  on v3_agent_permissions for all
  using (
    exists (
      select 1
      from v3_agents
      where v3_agents.id = v3_agent_permissions.agent_id
        and v3_agents.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from v3_agents
      where v3_agents.id = v3_agent_permissions.agent_id
        and v3_agents.owner_user_id = auth.uid()
    )
  );

create policy "authenticated read households"
  on v3_households for select
  using (auth.role() = 'authenticated');

create policy "creator manages household"
  on v3_households for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "members read household membership"
  on v3_household_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from v3_households
      where v3_households.id = v3_household_members.household_id
        and v3_households.created_by = auth.uid()
    )
  );

create policy "household creator manages membership"
  on v3_household_members for all
  using (
    exists (
      select 1 from v3_households
      where v3_households.id = v3_household_members.household_id
        and v3_households.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from v3_households
      where v3_households.id = v3_household_members.household_id
        and v3_households.created_by = auth.uid()
    )
  );

create or replace function v3_is_conversation_participant(target_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from v3_conversation_participants cp
    left join v3_agents a on a.id = cp.agent_id
    where cp.conversation_id = target_conversation
      and (
        cp.human_user_id = auth.uid()
        or a.owner_user_id = auth.uid()
      )
  );
$$;

revoke all on function v3_is_conversation_participant(uuid) from public;
grant execute on function v3_is_conversation_participant(uuid) to authenticated;

create policy "participants read conversations"
  on v3_conversations for select
  using (created_by = auth.uid() or v3_is_conversation_participant(id));

create policy "authenticated create conversations"
  on v3_conversations for insert
  with check (auth.uid() = created_by);

create policy "participants update conversations"
  on v3_conversations for update
  using (created_by = auth.uid() or v3_is_conversation_participant(id));

create policy "participants read participant list"
  on v3_conversation_participants for select
  using (v3_is_conversation_participant(conversation_id));

create policy "participants add participants"
  on v3_conversation_participants for insert
  with check (
    v3_is_conversation_participant(conversation_id)
    or human_user_id = auth.uid()
    or exists (
      select 1 from v3_agents
      where v3_agents.id = v3_conversation_participants.agent_id
        and v3_agents.owner_user_id = auth.uid()
    )
  );

create policy "participants read messages"
  on v3_messages for select
  using (v3_is_conversation_participant(conversation_id));

create policy "participants send own messages"
  on v3_messages for insert
  with check (
    v3_is_conversation_participant(conversation_id)
    and (
      sender_user_id = auth.uid()
      or exists (
        select 1 from v3_agents
        where v3_agents.id = v3_messages.sender_agent_id
          and v3_agents.owner_user_id = auth.uid()
      )
    )
  );

create policy "users manage own social decisions"
  on v3_social_decisions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
