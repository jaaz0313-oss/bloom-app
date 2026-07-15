alter table public.proveedores
  add column if not exists deposito_reembolsable numeric default 0;
