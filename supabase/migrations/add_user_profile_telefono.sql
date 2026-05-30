-- Teléfono en perfil de usuario

alter table public.user_profiles
  add column if not exists telefono text;

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
  on public.user_profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
