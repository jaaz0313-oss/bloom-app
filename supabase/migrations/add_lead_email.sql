-- Email del lead para invites de Google Meet en citas
alter table public.leads
  add column if not exists email text;
