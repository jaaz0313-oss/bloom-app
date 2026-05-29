-- Reemplazar precio min/max/fijo por precio_estimado único

alter table public.cotizacion_items
  add column if not exists precio_estimado numeric(12, 2);

update public.cotizacion_items
set precio_estimado = coalesce(
  precio_fijo,
  case
    when precio_min is not null and precio_max is not null and precio_min > 0 and precio_max > 0
      then (precio_min + precio_max) / 2
    else coalesce(nullif(precio_min, 0), nullif(precio_max, 0))
  end
)
where precio_estimado is null;

alter table public.cotizacion_items
  drop column if exists precio_min,
  drop column if exists precio_max,
  drop column if exists precio_fijo,
  drop column if exists es_precio_fijo;
