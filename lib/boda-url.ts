export const BODA_SECTION_PROVEEDORES = "proveedores";

export function bodaProveedoresHref(
  bodaId: string,
  proveedorId?: string,
): string {
  const params = new URLSearchParams({ section: BODA_SECTION_PROVEEDORES });
  if (proveedorId) {
    params.set("proveedor", proveedorId);
  }
  return `/bodas/${bodaId}?${params.toString()}`;
}
