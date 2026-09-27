-- Estato v3 core social/agent model.

create table if not exists profiles (
  user_id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  avatar_url text,
  bio text,
  housing_preferences jsonb not null default '{}'::jsonb,
  flatmate_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  agent_type text check (agent_type in ('personal','household','listing','organisation')) not null default 'personal',
  bio text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists agent_permissions (
  agent_id uuid references agents(id) on delete cascade primary key,
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

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  neighbourhood text,
  description text,
  preferences jsonb not null default '{}'::jsonb,
  agent_id uuid references agents(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists household_members (
  household_id uuid references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member',
  primary key (household_id, user_id)
);

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete set null,
  agent_id uuid references agents(id) on delete set null,
  title text,
  city text,
  neighbourhood text,
  price integer,
  available_from date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  conversation_type text not null default 'mixed',
  subject_type text,
  subject_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists conversation_participants (
  conversation_id uuid references conversations(id) on delete cascade,
  participant_type text check (participant_type in ('human','agent')) not null,
  human_user_id uuid references auth.users(id) on delete cascade,
  agent_id uuid references agents(id) on delete cascade,
  joined_at timestamptz default now(),
  check (
    (participant_type = 'human' and human_user_id is not null and agent_id is null)
    or
    (participant_type = 'agent' and agent_id is not null and human_user_id is null)
  )
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender_type text check (sender_type in ('human','agent')) not null,
  sender_user_id uuid references auth.users(id) on delete cascade,
  sender_agent_id uuid references agents(id) on delete cascade,
  content text not null,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  check (
    (sender_type = 'human' and sender_user_id is not null and sender_agent_id is null)
    or
    (sender_type = 'agent' and sender_agent_id is not null and sender_user_id is null)
  )
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  match_type text check (match_type in ('human_human','human_household','human_listing')) not null,
  target_user_id uuid references auth.users(id) on delete cascade,
  target_household_id uuid references households(id) on delete cascade,
  target_listing_id uuid references listings(id) on delete cascade,
  status text not null default 'pending',
  reasons text[] not null default '{}',
  discuss text[] not null default '{}',
  agent_reasoning text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists match_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  match_id uuid references matches(id) on delete cascade not null,
  decision text check (decision in ('interested','pass','save')) not null,
  reason_codes text[] not null default '{}',
  note text,
  created_at timestamptz default now(),
  unique (user_id, match_id)
);

alter table profiles enable row level security;
alter table agents enable row level security;
alter table agent_permissions enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;
alter table matches enable row level security;
alter table match_decisions enable row level security;

create policy "users manage own profile"
  on profiles for all using (auth.uid() = user_id);

create policy "owners manage agents"
  on agents for all using (auth.uid() = owner_user_id);

create policy "owners manage agent permissions"
  on agent_permissions for all using (
    exists (
      select 1 from agents
      where agents.id = agent_permissions.agent_id
      and agents.owner_user_id = auth.uid()
    )
  );

create policy "users read own matches"
  on matches for select using (auth.uid() = user_id);

create policy "users manage own decisions"
  on match_decisions for all using (auth.uid() = user_id);
