-- Agrupa filas del mismo proveedor cuando se agrega con múltiples categorías
-- (un valor_total compartido; pagos/pagos viven en el registro primario del grupo).
ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS grupo_id uuid;

CREATE INDEX IF NOT EXISTS idx_proveedores_grupo_id
  ON proveedores (grupo_id)
  WHERE grupo_id IS NOT NULL;
