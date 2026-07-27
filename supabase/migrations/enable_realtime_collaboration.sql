-- Habilita Supabase Realtime en las tablas usadas en colaboración simultánea.
-- Idempotente: ignora si la tabla ya está en la publicación.
-- REPLICA IDENTITY FULL para que DELETE/UPDATE envíen la fila completa (filtros client-side).

alter table public.proveedores replica identity full;
alter table public.pagos replica identity full;
alter table public.notas_boda replica identity full;
alter table public.cronograma_items replica identity full;
alter table public.bodas replica identity full;
alter table public.tareas replica identity full;
alter table public.tareas_comentarios replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.proveedores;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.pagos;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.notas_boda;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.cronograma_items;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.bodas;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.tareas;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.tareas_comentarios;
  exception
    when duplicate_object then null;
  end;
end $$;
