-- updated_at en tablas relacionadas (para alertas de inactividad de bodas)
alter table public.proveedores
  add column if not exists updated_at timestamptz;

update public.proveedores
set updated_at = coalesce(created_at, now())
where updated_at is null;

alter table public.proveedores
  alter column updated_at set default now(),
  alter column updated_at set not null;

create or replace function public.set_proveedores_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists proveedores_set_updated_at on public.proveedores;
create trigger proveedores_set_updated_at
  before update on public.proveedores
  for each row
  execute function public.set_proveedores_updated_at();

alter table public.citas
  add column if not exists updated_at timestamptz;

update public.citas
set updated_at = coalesce(created_at, now())
where updated_at is null;

alter table public.citas
  alter column updated_at set default now(),
  alter column updated_at set not null;

create or replace function public.set_citas_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists citas_set_updated_at on public.citas;
create trigger citas_set_updated_at
  before update on public.citas
  for each row
  execute function public.set_citas_updated_at();

alter table public.tastings
  add column if not exists updated_at timestamptz;

update public.tastings
set updated_at = coalesce(created_at, now())
where updated_at is null;

alter table public.tastings
  alter column updated_at set default now(),
  alter column updated_at set not null;

create or replace function public.set_tastings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tastings_set_updated_at on public.tastings;
create trigger tastings_set_updated_at
  before update on public.tastings
  for each row
  execute function public.set_tastings_updated_at();

-- Una sola query: MAX de actividad por boda (boda + tablas relacionadas)
create or replace function public.get_bodas_ultima_actividad()
returns table (boda_id uuid, ultima_actividad timestamptz)
language sql
stable
security invoker
as $$
  select a.boda_id, max(a.actividad_at) as ultima_actividad
  from (
    select b.id as boda_id, coalesce(b.updated_at, b.created_at) as actividad_at
    from public.bodas b

    union all

    select p.boda_id, p.updated_at as actividad_at
    from public.proveedores p

    union all

    select pr.boda_id, pa.created_at as actividad_at
    from public.pagos pa
    inner join public.proveedores pr on pr.id = pa.proveedor_id
    where pa.created_at is not null

    union all

    select n.boda_id, n.created_at as actividad_at
    from public.notas_boda n

    union all

    select c.boda_id, c.updated_at as actividad_at
    from public.citas c
    where c.boda_id is not null

    union all

    select t.boda_id, t.updated_at as actividad_at
    from public.tastings t
  ) a
  where a.boda_id is not null
    and a.actividad_at is not null
  group by a.boda_id;
$$;

grant execute on function public.get_bodas_ultima_actividad() to anon, authenticated;
