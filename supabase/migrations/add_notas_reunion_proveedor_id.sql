-- Vincular notas de reunión a un proveedor específico

alter table public.notas_reunion
  add column if not exists proveedor_id uuid references public.proveedores(id) on delete cascade;

create index if not exists notas_reunion_proveedor_id_idx
  on public.notas_reunion (proveedor_id);
