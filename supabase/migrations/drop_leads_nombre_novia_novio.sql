-- leads usa nombre_pareja; no existen columnas separadas de novia/novio
alter table public.leads
  drop column if exists nombre_novia,
  drop column if exists nombre_novio;
