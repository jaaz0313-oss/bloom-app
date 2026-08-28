alter table public.presupuesto_estimado_categorias
  add column if not exists orden integer default 0;

create index if not exists presupuesto_estimado_orden_idx
  on public.presupuesto_estimado_categorias (boda_id, orden);
