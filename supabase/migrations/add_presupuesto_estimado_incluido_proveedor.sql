-- Campos para ítems personalizados / incluidos en otro proveedor
alter table public.presupuesto_estimado_categorias
  add column if not exists incluido_en_proveedor_id uuid
    references public.proveedores(id) on delete set null;

create index if not exists presupuesto_estimado_incluido_proveedor_idx
  on public.presupuesto_estimado_categorias (incluido_en_proveedor_id);
