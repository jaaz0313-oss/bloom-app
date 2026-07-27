alter table public.tastings
  add column if not exists tipo_cita text default 'tasting';

update public.tastings
set tipo_cita = 'tasting'
where tipo_cita is null or trim(tipo_cita) = '';
