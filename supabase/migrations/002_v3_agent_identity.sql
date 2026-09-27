-- Estato v3 personal agent identity + lookup indexes.

create unique index if not exists v3_one_personal_agent_per_user
  on public.v3_agents(owner_user_id)
  where agent_type = 'personal';

create index if not exists v3_agents_owner_idx
  on public.v3_agents(owner_user_id);

create index if not exists v3_households_creator_idx
  on public.v3_households(created_by);

create index if not exists v3_household_members_user_idx
  on public.v3_household_members(user_id);

create index if not exists v3_conversations_creator_idx
  on public.v3_conversations(created_by);

create index if not exists v3_conversation_participants_human_idx
  on public.v3_conversation_participants(human_user_id)
  where human_user_id is not null;

create index if not exists v3_conversation_participants_agent_idx
  on public.v3_conversation_participants(agent_id)
  where agent_id is not null;

create index if not exists v3_messages_conversation_created_idx
  on public.v3_messages(conversation_id, created_at);

create index if not exists v3_messages_sender_user_idx
  on public.v3_messages(sender_user_id)
  where sender_user_id is not null;

create index if not exists v3_messages_sender_agent_idx
  on public.v3_messages(sender_agent_id)
  where sender_agent_id is not null;

create index if not exists v3_social_decisions_user_idx
  on public.v3_social_decisions(user_id, created_at desc);
