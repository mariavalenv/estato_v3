-- Allow matched conversation participants to continue seeing each other's
-- flatmate display profile even after public discoverability is turned off.

create or replace function private.v3_shares_conversation_with(target_user uuid)
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
      from public.v3_conversation_participants me
      join public.v3_conversation_participants them
        on them.conversation_id = me.conversation_id
      where me.participant_type = 'human'
        and me.human_user_id = (select auth.uid())
        and them.participant_type = 'human'
        and them.human_user_id = target_user
    );
$$;

revoke all on function private.v3_shares_conversation_with(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.v3_shares_conversation_with(uuid) to authenticated;

drop policy if exists "users read own or discoverable flatmate profiles"
  on public.v3_flatmate_profiles;

create policy "users read relevant flatmate profiles"
  on public.v3_flatmate_profiles for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or is_discoverable = true
    or private.v3_shares_conversation_with(user_id)
  );
