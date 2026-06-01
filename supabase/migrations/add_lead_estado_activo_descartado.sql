-- Visibilidad en listado: activo / descartado.
-- La columna estado antes almacenaba el seguimiento (nuevo, en_conversacion, perdido).

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'estado'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'estado_seguimiento'
  ) then
    alter table public.leads rename column estado to estado_seguimiento;
  end if;
end $$;

alter table public.leads
  add column if not exists estado text not null default 'activo';

alter table public.leads drop constraint if exists leads_estado_check;

alter table public.leads
  add constraint leads_estado_check
  check (estado in ('activo', 'descartado'));
