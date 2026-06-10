export type NotaReunionRow = {
  id: string;
  boda_id: string;
  fecha: string;
  con_quien: string;
  resumen: string;
  creado_por: string | null;
  creado_por_nombre: string | null;
  created_at: string;
};

export type NotaReunionConQuienTipo = "cliente" | "proveedor" | "equipo";
