-- Menciones en notas internas de bodas

create table if not exists public.menciones_notas (
  id uuid primary key default gen_random_uuid(),
  nota_id uuid not null references public.notas_boda(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  visto boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists menciones_notas_usuario_visto_idx
  on public.menciones_notas (usuario_id, visto);

create index if not exists menciones_notas_nota_id_idx
  on public.menciones_notas (nota_id);

alter table public.menciones_notas enable row level security;

drop policy if exists "Auth users" on public.menciones_notas;
create policy "Auth users"
  on public.menciones_notas
  for all
  using (true);
