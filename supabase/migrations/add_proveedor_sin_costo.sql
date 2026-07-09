alter table public.proveedores
  add column if not exists sin_costo boolean default false;
