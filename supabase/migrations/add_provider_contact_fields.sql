alter table public.proveedores
  add column if not exists tipo_cuenta text;

alter table public.proveedores
  add column if not exists email text;

alter table public.proveedores
  add column if not exists telefono text;

alter table public.proveedores
  add column if not exists documento_nit text;

alter table public.proveedores
  add column if not exists direccion text;
