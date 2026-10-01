alter table public.proveedores
  add column if not exists pago_directo_cliente boolean not null default false;

alter table public.proveedores
  add column if not exists excluido_simulacion boolean not null default false;
