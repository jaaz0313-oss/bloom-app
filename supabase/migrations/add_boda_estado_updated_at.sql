-- Estado de la boda y marca de última actividad para alertas del dashboard.
alter table public.bodas
  add column if not exists estado text default 'activa';

update public.bodas
set estado = 'activa'
where estado is null;

alter table public.bodas
  alter column estado set default 'activa',
  alter column estado set not null;

alter table public.bodas
  drop constraint if exists bodas_estado_check;

alter table public.bodas
  add constraint bodas_estado_check
  check (estado in ('activa', 'cancelada', 'finalizada'));

alter table public.bodas
  add column if not exists updated_at timestamptz;

update public.bodas
set updated_at = coalesce(created_at, now())
where updated_at is null;

alter table public.bodas
  alter column updated_at set default now(),
  alter column updated_at set not null;

create or replace function public.set_bodas_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bodas_set_updated_at on public.bodas;
create trigger bodas_set_updated_at
  before update on public.bodas
  for each row
  execute function public.set_bodas_updated_at();
