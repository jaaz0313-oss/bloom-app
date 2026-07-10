-- Tareas del equipo

create table if not exists public.tareas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  boda_id uuid references public.bodas(id) on delete set null,
  asignado_a text not null,
  creado_por text not null,
  prioridad text not null default 'media' check (prioridad in ('alta', 'media', 'baja')),
  fecha_limite date,
  completada boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tareas_asignado_a_idx on public.tareas (asignado_a);
create index if not exists tareas_creado_por_idx on public.tareas (creado_por);
create index if not exists tareas_boda_id_idx on public.tareas (boda_id);
create index if not exists tareas_fecha_limite_idx on public.tareas (fecha_limite);
create index if not exists tareas_completada_idx on public.tareas (completada);

alter table public.tareas enable row level security;

drop policy if exists "Allow all" on public.tareas;
create policy "Allow all"
  on public.tareas
  for all
  using (true)
  with check (true);
