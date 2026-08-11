alter table public.bodas
  add column if not exists mostrar_presupuesto_estimado_cliente boolean default false;

create table if not exists public.presupuesto_estimado_categorias (
  id uuid default gen_random_uuid() primary key,
  boda_id uuid references public.bodas(id) on delete cascade,
  categoria text not null,
  valor_estimado numeric default 0,
  notas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (boda_id, categoria)
);

alter table public.presupuesto_estimado_categorias enable row level security;

drop policy if exists "Allow all" on public.presupuesto_estimado_categorias;
create policy "Allow all"
  on public.presupuesto_estimado_categorias
  for all
  using (true)
  with check (true);
