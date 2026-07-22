-- Comentarios en tareas

create table if not exists public.tareas_comentarios (
  id uuid default gen_random_uuid() primary key,
  tarea_id uuid references public.tareas(id) on delete cascade,
  autor text not null,
  contenido text not null,
  created_at timestamptz default now()
);

create index if not exists tareas_comentarios_tarea_id_idx
  on public.tareas_comentarios (tarea_id);

create index if not exists tareas_comentarios_created_at_idx
  on public.tareas_comentarios (created_at);

alter table public.tareas_comentarios enable row level security;

drop policy if exists "Allow all" on public.tareas_comentarios;
create policy "Allow all"
  on public.tareas_comentarios
  for all
  using (true)
  with check (true);

-- Quién y cuándo se completó (para notificar al creador)
alter table public.tareas
  add column if not exists completada_por text;

alter table public.tareas
  add column if not exists completada_at timestamptz;
