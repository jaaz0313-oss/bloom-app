alter table public.notas_boda
  add column if not exists origen text not null default 'manual';

alter table public.notas_boda
  drop constraint if exists notas_boda_origen_check;

alter table public.notas_boda
  add constraint notas_boda_origen_check
  check (origen in ('manual', 'proveedor'));
