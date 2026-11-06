-- Vínculo entre una tarea nacida de @mención en notas internas del proveedor
-- y ese proveedor. Sirve para abrir el proveedor desde la tarea y para no
-- duplicar: una sola tarea abierta por persona y proveedor.

alter table public.tareas
  add column if not exists proveedor_id uuid references public.proveedores(id) on delete set null;

alter table public.tareas
  add column if not exists desde_mencion_notas boolean not null default false;

create index if not exists tareas_proveedor_id_idx
  on public.tareas (proveedor_id);

create unique index if not exists tareas_mencion_abierta_proveedor_asignado_idx
  on public.tareas (proveedor_id, asignado_a)
  where desde_mencion_notas = true
    and completada = false
    and proveedor_id is not null;
