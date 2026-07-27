-- Permite crear leads rápidos solo con nombre y email.
alter table public.leads
  alter column fecha_tentativa drop not null;

alter table public.leads
  alter column ciudad drop not null;
