alter table public.directorio_proveedores
  add column if not exists anticipo_requerido numeric;

alter table public.directorio_proveedores
  add column if not exists incluye_iva boolean default false;

alter table public.directorio_proveedores
  add column if not exists especialidad text;

alter table public.directorio_proveedores
  add column if not exists fortalezas text;

alter table public.directorio_proveedores
  add column if not exists codigo_swift text;

alter table public.directorio_proveedores
  add column if not exists cuenta_usa text;

alter table public.directorio_proveedores
  add column if not exists paypal text;

alter table public.directorio_proveedores
  add column if not exists condiciones_pago text;

alter table public.directorio_proveedores
  add column if not exists instagram text;

alter table public.directorio_proveedores
  add column if not exists pagina_web text;

alter table public.directorio_proveedores
  add column if not exists ciudad_base text;

alter table public.directorio_proveedores
  add column if not exists otras_ciudades text;

alter table public.directorio_proveedores
  add column if not exists nombre_contacto text;
