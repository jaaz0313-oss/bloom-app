alter table proveedores drop constraint if exists proveedores_estado_check;
alter table proveedores add constraint proveedores_estado_check
  check (estado in (
    'pendiente',
    'cotizacion_solicitada',
    'en_negociacion',
    'contratado',
    'descartado'
  ));

alter table proveedores add column if not exists cotizacion_solicitada_at timestamp;
alter table proveedores add column if not exists cotizacion_recibida_at timestamp;
alter table proveedores add column if not exists monto_cotizado numeric;
alter table proveedores add column if not exists notas_cotizacion text;
