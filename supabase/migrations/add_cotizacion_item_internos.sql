-- Campos internos del planner en ítems de cotización

alter table public.cotizacion_items
  add column if not exists proveedor_sugerido_id uuid references public.directorio_proveedores(id);

alter table public.cotizacion_items
  add column if not exists notas_internas text;
