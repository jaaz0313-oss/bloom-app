export type AprobacionClienteEstado = "pendiente" | "confirmada";

export type AprobacionClienteRow = {
  id: string;
  boda_id: string;
  proveedor_id: string;
  estado: AprobacionClienteEstado | string;
  created_at: string;
};

export type AprobacionClientePendienteAlert = {
  id: string;
  bodaId: string;
  proveedorId: string;
  nombrePareja: string;
  proveedorNombre: string;
  categoria: string;
  createdAt: string;
};

export function isAprobacionClientePendiente(
  row: Pick<AprobacionClienteRow, "estado">,
): boolean {
  return row.estado === "pendiente";
}
