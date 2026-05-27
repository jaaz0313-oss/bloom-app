-- Política para eliminar bodas desde la app (planner).
drop policy if exists "anon delete bodas" on public.bodas;
create policy "anon delete bodas"
  on public.bodas for delete to anon, authenticated using (true);

-- Asegurar cascade en cronograma_items (si la tabla ya existe).
alter table public.cronograma_items
  drop constraint if exists cronograma_items_boda_id_fkey;

alter table public.cronograma_items
  add constraint cronograma_items_boda_id_fkey
  foreign key (boda_id) references public.bodas(id) on delete cascade;

-- Asegurar cascade en pagos al borrar proveedores (si la FK existe).
alter table public.pagos
  drop constraint if exists pagos_proveedor_id_fkey;

alter table public.pagos
  add constraint pagos_proveedor_id_fkey
  foreign key (proveedor_id) references public.proveedores(id) on delete cascade;
