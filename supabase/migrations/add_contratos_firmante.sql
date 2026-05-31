alter table public.contratos
  add column if not exists firmante text not null default 'novia'
  check (firmante in ('novia', 'novio'));
