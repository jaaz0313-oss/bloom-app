create table if not exists public.user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  nombre text not null,
  rol text not null check (rol in ('admin', 'lider', 'coordinadora', 'finanzas')),
  activo boolean default true,
  created_at timestamp default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "Users can view all profiles" on public.user_profiles;
create policy "Users can view all profiles"
on public.user_profiles for select
using (true);

drop policy if exists "Admin can manage profiles" on public.user_profiles;
create policy "Admin can manage profiles"
on public.user_profiles for all
using (true);
