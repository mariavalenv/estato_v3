-- Harden the existing auth profile trigger function.
-- It remains callable by the auth.users trigger, but not as a Data API RPC.

alter function public.handle_new_user() set search_path = '';

revoke all on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
