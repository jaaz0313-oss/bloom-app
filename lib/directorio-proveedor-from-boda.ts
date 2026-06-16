export type BodaProveedorDirectorioSource = {
  banco?: string | null;
  tipo_cuenta?: string | null;
  numero_cuenta?: string | null;
  titular_cuenta?: string | null;
  titular?: string | null;
  documento_nit?: string | null;
  codigo_swift?: string | null;
  cuenta_usa?: string | null;
  paypal?: string | null;
  condiciones_pago?: string | null;
  anticipo_requerido?: number | null;
  anticipo?: number | null;
  incluye_iva?: boolean | null;
};

type DirectorioInsertBase = {
  nombre: string;
  categoria: string;
  telefono?: string | null;
  email?: string | null;
};

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function buildDirectorioInsertFromBodaProveedor(
  base: DirectorioInsertBase,
  source: BodaProveedorDirectorioSource = {},
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    nombre: base.nombre,
    categoria: base.categoria,
    activo: true,
  };

  if (hasText(base.telefono)) payload.telefono = base.telefono.trim();
  if (hasText(base.email)) payload.email = base.email.trim();

  if (hasText(source.banco)) payload.banco = source.banco.trim();
  if (hasText(source.tipo_cuenta)) payload.tipo_cuenta = source.tipo_cuenta.trim();
  if (hasText(source.numero_cuenta)) {
    payload.numero_cuenta = source.numero_cuenta.trim();
  }

  const titular = source.titular_cuenta ?? source.titular;
  if (hasText(titular)) payload.titular = titular.trim();

  if (hasText(source.documento_nit)) {
    payload.documento_nit = source.documento_nit.trim();
  }
  if (hasText(source.codigo_swift)) payload.codigo_swift = source.codigo_swift.trim();
  if (hasText(source.cuenta_usa)) payload.cuenta_usa = source.cuenta_usa.trim();
  if (hasText(source.paypal)) payload.paypal = source.paypal.trim();
  if (hasText(source.condiciones_pago)) {
    payload.condiciones_pago = source.condiciones_pago.trim();
  }

  const anticipoRequerido = source.anticipo_requerido ?? source.anticipo;
  if (anticipoRequerido != null && anticipoRequerido > 0) {
    payload.anticipo_requerido = anticipoRequerido;
  }

  if (source.incluye_iva === true) {
    payload.incluye_iva = true;
  }

  return payload;
}
