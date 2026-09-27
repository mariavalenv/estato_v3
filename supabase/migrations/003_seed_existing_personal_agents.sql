-- Seed a personal Estato agent for users that already existed before v3.

insert into public.v3_agents (
  owner_user_id,
  name,
  agent_type,
  bio,
  status,
  public_metadata
)
select
  u.id,
  case
    when nullif(trim(u.raw_user_meta_data->>'full_name'), '') is not null
      then split_part(trim(u.raw_user_meta_data->>'full_name'), ' ', 1) || '''s Estato'
    else 'My Estato agent'
  end,
  'personal',
  'Personal housing and flatmate agent',
  'active',
  '{}'::jsonb
from auth.users u
where not exists (
  select 1
  from public.v3_agents a
  where a.owner_user_id = u.id
    and a.agent_type = 'personal'
)
on conflict do nothing;

insert into public.v3_agent_permissions (
  agent_id,
  message_agents,
  message_humans,
  propose_matches,
  initiate_introductions,
  schedule_viewings,
  make_payments,
  sign_contracts,
  limits
)
select
  a.id,
  'allowed',
  'ask',
  'allowed',
  'ask',
  'ask',
  'never',
  'never',
  '{}'::jsonb
from public.v3_agents a
where a.agent_type = 'personal'
on conflict (agent_id) do nothing;
