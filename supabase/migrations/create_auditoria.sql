-- Registro de auditoría de acciones en Bloom

create table if not exists public.auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id),
  usuario_nombre text,
  accion text not null,
  entidad text not null,
  entidad_id text,
  detalle text,
  boda_nombre text,
  created_at timestamptz not null default now()
);

create index if not exists auditoria_created_at_idx
  on public.auditoria (created_at desc);

create index if not exists auditoria_boda_nombre_idx
  on public.auditoria (boda_nombre);

alter table public.auditoria enable row level security;

drop policy if exists "Auth users" on public.auditoria;
create policy "Auth users"
  on public.auditoria
  for all
  using (true);
