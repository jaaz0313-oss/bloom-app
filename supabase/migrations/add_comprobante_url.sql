-- Ejecutar si la tabla pagos ya existe sin la columna comprobante_url.
alter table public.pagos
  add column if not exists comprobante_url text;

