-- Estado de la cita (programada, confirmada, cancelada, realizada)

alter table public.citas
  add column if not exists estado text not null default 'programada';

alter table public.citas drop constraint if exists citas_estado_check;

alter table public.citas
  add constraint citas_estado_check
  check (estado in ('programada', 'confirmada', 'cancelada', 'realizada'));

create index if not exists citas_estado_idx on public.citas (estado);
