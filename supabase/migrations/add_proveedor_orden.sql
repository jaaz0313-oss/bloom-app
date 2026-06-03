-- Orden de proveedores en la boda (p. ej. importados desde cotización)

alter table public.proveedores
  add column if not exists orden int;

create index if not exists proveedores_boda_id_orden_idx
  on public.proveedores (boda_id, orden);
