alter table public.bodas
  add column if not exists mostrar_usd_cliente boolean default false;

alter table public.bodas
  add column if not exists permitir_excel_cliente boolean default false;
