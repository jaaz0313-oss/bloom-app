-- URL del archivo de cotización subido a Google Drive (subcarpeta Cotizaciones).
alter table public.proveedores
  add column if not exists cotizacion_drive_url text;
