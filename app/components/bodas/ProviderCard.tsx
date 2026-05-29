"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PROVIDER_STATUS_LABELS,
  PROVIDER_STATUS_STYLES,
  type ProveedorRow,
} from "@/app/data/providers";
import { formatCurrency, formatShortDateStable } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { syncBodaProveedoresContratados } from "@/lib/sync-boda";
import type { PagoRow } from "@/app/data/pagos";
import { hasPermission, type UserRole } from "@/lib/auth/roles";
import {
  openCotizacionWhatsAppPostReunion,
  openCotizacionWhatsAppPrimerContacto,
  type CotizacionBodaContext,
  type CotizacionMensajeTipo,
} from "@/lib/proveedor-cotizacion";
import { ProviderPayments } from "./ProviderPayments";
import { ProviderComisionFields } from "./ProviderComisionFields";
import { AUDITORIA_ACCIONES, logAuditoria } from "@/lib/auditoria";
import { getPorcentajeComisionProveedor } from "@/lib/comisiones";

type ProviderCardProps = {
  provider: ProveedorRow;
  bodaId: string;
  boda: CotizacionBodaContext;
  plannerName: string;
  pagos: PagoRow[];
  role: UserRole;
};

const cotizacionPrimerContactoButtonClass =
  "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-60";

const cotizacionPostReunionButtonClass =
  "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-green-500 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-60";

function CotizacionWhatsAppButtons({
  markPrimerAsRequested,
  disabled,
  onSolicitar,
}: {
  markPrimerAsRequested: boolean;
  disabled: boolean;
  onSolicitar: (tipo: CotizacionMensajeTipo, markAsRequested: boolean) => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => onSolicitar("primer_contacto", markPrimerAsRequested)}
        disabled={disabled}
        className={cotizacionPrimerContactoButtonClass}
      >
        Solicitar cotización
      </button>
      <button
        type="button"
        onClick={() => onSolicitar("post_reunion", false)}
        disabled={disabled}
        className={cotizacionPostReunionButtonClass}
      >
        Solicitar cotización (post reunión)
      </button>
    </>
  );
}

export function ProviderCard({
  provider,
  bodaId,
  boda,
  plannerName,
  pagos,
  role,
}: ProviderCardProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cotizacionOpen, setCotizacionOpen] = useState(false);
  const [cotizacionSubmitting, setCotizacionSubmitting] = useState(false);
  const [cotizacionError, setCotizacionError] = useState<string | null>(null);
  const [montoCotizado, setMontoCotizado] = useState(
    provider.monto_cotizado != null ? String(provider.monto_cotizado) : "",
  );
  const [descripcionCotizacion, setDescripcionCotizacion] = useState(
    provider.descripcion_servicio ?? "",
  );
  const [notasCotizacion, setNotasCotizacion] = useState(
    provider.notas_cotizacion ?? "",
  );

  const canManage = hasPermission(role, "providers.manage");
  const isAdmin = role === "admin";
  const [comisionUpdating, setComisionUpdating] = useState(false);
  const showPayments =
    provider.estado === "contratado" || provider.estado === "en_negociacion";

  type EditFormState = {
    nombre: string;
    categoria: string;
    descripcionServicio: string;
    valorTotal: string;
    anticipo: string;
    fechaSaldo: string;
    banco: string;
    numeroCuenta: string;
    tipoCuenta: string;
    titularCuenta: string;
    documentoNit: string;
    telefono: string;
    email: string;
    direccion: string;
    linkPago: string;
    notas: string;
    daComision: boolean;
    porcentajeComision: string;
  };

  const [editOpen, setEditOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({
    nombre: provider.nombre,
    categoria: provider.categoria,
    descripcionServicio: provider.descripcion_servicio ?? "",
    valorTotal: String(provider.valor_total),
    anticipo: String(provider.anticipo),
    fechaSaldo: provider.fecha_saldo ?? "",
    banco: provider.banco ?? "",
    numeroCuenta: provider.numero_cuenta ?? "",
    tipoCuenta: provider.tipo_cuenta ?? "",
    titularCuenta: provider.titular_cuenta ?? "",
    documentoNit: provider.documento_nit ?? "",
    telefono: provider.telefono ?? "",
    email: provider.email ?? "",
    direccion: provider.direccion ?? "",
    linkPago: provider.link_pago ?? "",
    notas: provider.notas ?? "",
    daComision: provider.da_comision ?? false,
    porcentajeComision: String(
      provider.porcentaje_comision != null ? provider.porcentaje_comision : 10,
    ),
  });

  useEffect(() => {
    if (!editOpen) return;

    // Precarga con los valores actuales del proveedor.
    setEditForm({
      nombre: provider.nombre ?? "",
      categoria: provider.categoria ?? "",
      descripcionServicio: provider.descripcion_servicio ?? "",
      valorTotal: String(provider.valor_total ?? 0),
      anticipo: String(provider.anticipo ?? 0),
      fechaSaldo: provider.fecha_saldo ?? "",
      banco: provider.banco ?? "",
      numeroCuenta: provider.numero_cuenta ?? "",
      tipoCuenta: provider.tipo_cuenta ?? "",
      titularCuenta: provider.titular_cuenta ?? "",
      documentoNit: provider.documento_nit ?? "",
      telefono: provider.telefono ?? "",
      email: provider.email ?? "",
      direccion: provider.direccion ?? "",
      linkPago: provider.link_pago ?? "",
      notas: provider.notas ?? "",
      daComision: provider.da_comision ?? false,
      porcentajeComision: String(
        provider.porcentaje_comision != null ? provider.porcentaje_comision : 10,
      ),
    });
  }, [editOpen, provider]);

  useEffect(() => {
    if (!deleteOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) setDeleteOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteOpen, deleting]);

  async function handleEditSave(e: React.FormEvent) {
    if (!hasPermission(role, "providers.manage")) {
      setEditError("No tienes permisos para editar proveedores.");
      return;
    }
    e.preventDefault();
    setEditError(null);

    if (!supabase) {
      setEditError("Supabase no está configurado.");
      return;
    }

    const nombre = editForm.nombre.trim();
    const categoria = editForm.categoria.trim();
    const descripcionServicio = editForm.descripcionServicio.trim();
    const notas = editForm.notas.trim();
    const fechaSaldo = editForm.fechaSaldo || null;

    const valorTotal = Number(editForm.valorTotal);
    const anticipo = Number(editForm.anticipo || "0");

    const banco = editForm.banco.trim() || null;
    const numeroCuenta = editForm.numeroCuenta.trim() || null;
    const tipoCuenta = editForm.tipoCuenta.trim() || null;
    const titularCuenta = editForm.titularCuenta.trim() || null;
    const documentoNit = editForm.documentoNit.trim() || null;
    const telefono = editForm.telefono.trim() || null;
    const email = editForm.email.trim() || null;
    const direccion = editForm.direccion.trim() || null;
    const linkPago = editForm.linkPago.trim() || null;

    if (!nombre) return setEditError("Ingresa el nombre del proveedor.");
    if (!categoria) return setEditError("Ingresa la categoría.");
    if (!Number.isFinite(valorTotal) || valorTotal < 0) {
      return setEditError("Ingresa un valor total válido (>= 0).");
    }
    if (!Number.isFinite(anticipo) || anticipo < 0) {
      return setEditError("Ingresa un anticipo válido (>= 0).");
    }
    if (anticipo > valorTotal) {
      return setEditError(
        "El anticipo no puede ser mayor que el valor total.",
      );
    }

    const daComision = editForm.daComision;
    let porcentajeComision = 10;
    if (daComision) {
      const pct = Number(editForm.porcentajeComision);
      if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
        return setEditError(
          "Ingresa un porcentaje de comisión válido (0–100).",
        );
      }
      porcentajeComision = pct;
    }

    setEditSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from("proveedores")
        .update({
          nombre,
          categoria,
          descripcion_servicio: descripcionServicio || null,
          valor_total: Math.round(valorTotal),
          anticipo: Math.round(anticipo),
          fecha_saldo: fechaSaldo,
          banco,
          numero_cuenta: numeroCuenta,
          tipo_cuenta: tipoCuenta,
          titular_cuenta: titularCuenta,
          documento_nit: documentoNit,
          telefono,
          email,
          direccion,
          link_pago: linkPago,
          notas: notas || null,
          da_comision: daComision,
          porcentaje_comision: daComision
            ? porcentajeComision
            : (provider.porcentaje_comision ?? 10),
        })
        .eq("id", provider.id);

      if (updateError) {
        setEditError(updateError.message);
        return;
      }

      setEditOpen(false);
      router.refresh();
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleMarcarComisionRecibida() {
    if (!isAdmin || !supabase || comisionUpdating || provider.comision_recibida) {
      return;
    }

    setComisionUpdating(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("proveedores")
        .update({
          comision_recibida: true,
          comision_recibida_at: new Date().toISOString(),
        })
        .eq("id", provider.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      await logAuditoria({
        accion: AUDITORIA_ACCIONES.COMISION_RECIBIDA,
        entidad: "comision",
        entidadId: provider.id,
        bodaNombre: boda.nombrePareja,
        detalle: `${provider.nombre} · ${getPorcentajeComisionProveedor(provider)}%`,
      });

      router.refresh();
    } finally {
      setComisionUpdating(false);
    }
  }

  async function handleConfirmDelete() {
    if (!canManage || !supabase || deleting) return;

    setDeleting(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from("proveedores")
        .delete()
        .eq("id", provider.id);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      await logAuditoria({
        accion: AUDITORIA_ACCIONES.PROVEEDOR_ELIMINADO,
        entidad: "proveedor",
        entidadId: provider.id,
        bodaNombre: boda.nombrePareja,
        detalle: `${provider.nombre} · ${provider.categoria}`,
      });

      setDeleteOpen(false);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  async function handleSolicitarCotizacion(
    tipo: CotizacionMensajeTipo,
    markAsRequested: boolean,
  ) {
    setError(null);
    if (!plannerName.trim()) {
      setError("No se pudo obtener el nombre del usuario logueado.");
      return;
    }
    if (!provider.telefono?.trim()) {
      setError("Este proveedor no tiene teléfono registrado");
      return;
    }

    const bodaCtx = {
      nombrePareja: boda.nombrePareja,
      fechaBoda: boda.fechaBoda,
      ciudad: boda.ciudad,
    };
    const cotizacionArgs = [
      provider.telefono,
      provider.nombre,
      plannerName.trim(),
      bodaCtx,
      provider.categoria,
    ] as const;

    const opened =
      tipo === "post_reunion"
        ? openCotizacionWhatsAppPostReunion(...cotizacionArgs)
        : openCotizacionWhatsAppPrimerContacto(...cotizacionArgs);
    if (!opened) {
      setError("No se pudo abrir WhatsApp con el teléfono del proveedor.");
      return;
    }

    if (!markAsRequested) return;

    if (!canManage) return;

    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    setUpdating(true);
    try {
      const { error: updateError } = await supabase
        .from("proveedores")
        .update({
          estado: "cotizacion_solicitada",
          cotizacion_solicitada_at: new Date().toISOString(),
        })
        .eq("id", provider.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      await logAuditoria({
        accion: AUDITORIA_ACCIONES.ESTADO_PROVEEDOR,
        entidad: "proveedor",
        entidadId: provider.id,
        bodaNombre: boda.nombrePareja,
        detalle: `${provider.nombre}: cotización solicitada`,
      });

      router.refresh();
    } finally {
      setUpdating(false);
    }
  }

  async function handleRegistrarCotizacion(e: React.FormEvent) {
    e.preventDefault();
    setCotizacionError(null);
    if (!canManage) {
      setCotizacionError("No tienes permisos para esta acción.");
      return;
    }
    if (!supabase) {
      setCotizacionError("Supabase no está configurado.");
      return;
    }

    const monto = Number(montoCotizado);
    if (!Number.isFinite(monto) || monto <= 0) {
      setCotizacionError("Ingresa un monto cotizado válido mayor a 0.");
      return;
    }

    setCotizacionSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from("proveedores")
        .update({
          estado: "en_negociacion",
          monto_cotizado: Math.round(monto),
          descripcion_servicio: descripcionCotizacion.trim() || null,
          notas_cotizacion: notasCotizacion.trim() || null,
          cotizacion_recibida_at: new Date().toISOString(),
          valor_total: Math.round(monto),
        })
        .eq("id", provider.id);

      if (updateError) {
        setCotizacionError(updateError.message);
        return;
      }

      await logAuditoria({
        accion: AUDITORIA_ACCIONES.COTIZACION_REGISTRADA,
        entidad: "proveedor",
        entidadId: provider.id,
        bodaNombre: boda.nombrePareja,
        detalle: `${provider.nombre}: ${formatCurrency(Math.round(monto))}`,
      });

      setCotizacionOpen(false);
      router.refresh();
    } finally {
      setCotizacionSubmitting(false);
    }
  }

  async function handleEstadoChange(
    nuevoEstado: "contratado" | "descartado",
  ) {
    setError(null);
    if (!canManage) {
      setError("No tienes permisos para esta acción.");
      return;
    }
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    setUpdating(true);
    try {
      const { error: updateError } = await supabase
        .from("proveedores")
        .update({ estado: nuevoEstado })
        .eq("id", provider.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      if (nuevoEstado === "contratado") {
        await syncBodaProveedoresContratados(bodaId);
      }

      await logAuditoria({
        accion: AUDITORIA_ACCIONES.ESTADO_PROVEEDOR,
        entidad: "proveedor",
        entidadId: provider.id,
        bodaNombre: boda.nombrePareja,
        detalle: `${provider.nombre}: ${nuevoEstado}`,
      });

      router.refresh();
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="rounded-2xl border border-bloom-border bg-bloom-surface p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-bloom-ink">{provider.nombre}</h3>
            {provider.estado === "cotizacion_solicitada" ? (
              <span className="inline-flex flex-col rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-800">
                <span>Cotización solicitada</span>
                {provider.cotizacion_solicitada_at && (
                  <span className="font-normal opacity-90">
                    {formatShortDateStable(
                      provider.cotizacion_solicitada_at.slice(0, 10),
                    )}
                  </span>
                )}
              </span>
            ) : (
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PROVIDER_STATUS_STYLES[provider.estado]}`}
              >
                {PROVIDER_STATUS_LABELS[provider.estado]}
              </span>
            )}
            {isAdmin && provider.da_comision && (
              <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800">
                Comisión {getPorcentajeComisionProveedor(provider)}%
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-bloom-muted">{provider.categoria}</p>

          {isAdmin && provider.da_comision && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {provider.comision_recibida ? (
                <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Comisión recibida
                  {provider.comision_recibida_at && (
                    <span className="ml-1 font-normal opacity-90">
                      ·{" "}
                      {formatShortDateStable(
                        provider.comision_recibida_at.slice(0, 10),
                      )}
                    </span>
                  )}
                </span>
              ) : (
                <>
                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                    Comisión pendiente
                  </span>
                  <button
                    type="button"
                    onClick={handleMarcarComisionRecibida}
                    disabled={
                      comisionUpdating ||
                      updating ||
                      editSubmitting ||
                      deleting
                    }
                    className="rounded-full border border-bloom-border bg-bloom-surface px-3 py-1 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas disabled:opacity-60"
                  >
                    {comisionUpdating ? "Guardando..." : "Marcar como recibida"}
                  </button>
                </>
              )}
            </div>
          )}

          {provider.estado === "pendiente" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  handleSolicitarCotizacion("primer_contacto", true)
                }
                disabled={updating || editSubmitting || deleting}
                className={cotizacionPrimerContactoButtonClass}
              >
                Solicitar cotización
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSolicitarCotizacion("post_reunion", false)
                }
                disabled={updating || editSubmitting || deleting}
                className={cotizacionPostReunionButtonClass}
              >
                Solicitar cotización (post reunión)
              </button>
            </div>
          )}

          {canManage && provider.estado === "cotizacion_solicitada" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <CotizacionWhatsAppButtons
                markPrimerAsRequested={false}
                disabled={updating || editSubmitting || deleting}
                onSolicitar={handleSolicitarCotizacion}
              />
              <button
                type="button"
                onClick={() => {
                  setCotizacionError(null);
                  setMontoCotizado(
                    provider.monto_cotizado != null
                      ? String(provider.monto_cotizado)
                      : "",
                  );
                  setNotasCotizacion(provider.notas_cotizacion ?? "");
                  setCotizacionOpen(true);
                }}
                disabled={updating || editSubmitting}
                className="rounded-full bg-bloom-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
              >
                Registrar cotización
              </button>
            </div>
          )}

          {provider.descripcion_servicio && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
                Descripción del servicio
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-bloom-ink">
                {provider.descripcion_servicio}
              </p>
            </div>
          )}

          {provider.notas && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
                Notas
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-bloom-ink">
                {provider.notas}
              </p>
            </div>
          )}

          {(provider.monto_cotizado != null ||
            provider.descripcion_servicio ||
            provider.notas_cotizacion) && (
            <div className="mt-3 rounded-lg border border-bloom-border bg-bloom-canvas/60 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
                Cotización recibida
              </p>
              {provider.monto_cotizado != null && (
                <p className="mt-1 text-sm font-medium text-bloom-ink">
                  Monto: {formatCurrency(provider.monto_cotizado)}
                </p>
              )}
              {provider.descripcion_servicio && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-bloom-ink">
                  {provider.descripcion_servicio}
                </p>
              )}
              {provider.cotizacion_recibida_at && (
                <p className="text-xs text-bloom-muted">
                  Registrada el{" "}
                  {formatShortDateStable(
                    provider.cotizacion_recibida_at.slice(0, 10),
                  )}
                </p>
              )}
              {provider.notas_cotizacion && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-bloom-muted">
                  {provider.notas_cotizacion}
                </p>
              )}
            </div>
          )}

          {(provider.banco ||
            provider.tipo_cuenta ||
            provider.numero_cuenta ||
            provider.titular_cuenta ||
            provider.documento_nit) && (
            <div className="mt-3 rounded-lg border border-bloom-border bg-bloom-canvas/60 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
                Datos bancarios
              </p>
              <dl className="mt-1 grid grid-cols-1 gap-1 text-xs text-bloom-ink sm:grid-cols-2">
                {provider.banco && (
                  <div>
                    <dt className="text-bloom-muted">Banco</dt>
                    <dd>{provider.banco}</dd>
                  </div>
                )}
                {provider.tipo_cuenta && (
                  <div>
                    <dt className="text-bloom-muted">Tipo de cuenta</dt>
                    <dd>{provider.tipo_cuenta}</dd>
                  </div>
                )}
                {provider.numero_cuenta && (
                  <div>
                    <dt className="text-bloom-muted">Número de cuenta</dt>
                    <dd>{provider.numero_cuenta}</dd>
                  </div>
                )}
                {provider.titular_cuenta && (
                  <div>
                    <dt className="text-bloom-muted">Titular</dt>
                    <dd>{provider.titular_cuenta}</dd>
                  </div>
                )}
                {provider.documento_nit && (
                  <div className="sm:col-span-2">
                    <dt className="text-bloom-muted">Documento / NIT</dt>
                    <dd>{provider.documento_nit}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {(provider.telefono || provider.email || provider.direccion) && (
            <div className="mt-3 rounded-lg border border-bloom-border bg-bloom-canvas/60 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
                Contacto del proveedor
              </p>
              <dl className="mt-1 grid grid-cols-1 gap-1 text-xs text-bloom-ink sm:grid-cols-2">
                {provider.telefono && (
                  <div>
                    <dt className="text-bloom-muted">Teléfono</dt>
                    <dd>{provider.telefono}</dd>
                  </div>
                )}
                {provider.email && (
                  <div>
                    <dt className="text-bloom-muted">Email</dt>
                    <dd>{provider.email}</dd>
                  </div>
                )}
                {provider.direccion && (
                  <div className="sm:col-span-2">
                    <dt className="text-bloom-muted">Dirección / Residencia</dt>
                    <dd>{provider.direccion}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          <div className="mt-3 rounded-lg border border-bloom-border bg-bloom-canvas/60 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
              Link de pago
            </p>
            <p className="mt-1 truncate text-sm text-bloom-ink">
              {provider.link_pago || "No registrado"}
            </p>
            {hasPermission(role, "providers.manage") && (
              <button
                type="button"
                onClick={() => {
                  setEditError(null);
                  setEditOpen(true);
                }}
                disabled={updating || editSubmitting}
                className="mt-2 rounded-full border border-bloom-border bg-bloom-surface px-3 py-1 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
              >
                Editar
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {canManage && provider.estado === "en_negociacion" && (
              <>
                <button
                  type="button"
                  onClick={() => handleEstadoChange("contratado")}
                  disabled={updating || editSubmitting}
                  className="rounded-full bg-bloom-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
                >
                  {updating ? "Actualizando..." : "Contratar"}
                </button>
                <button
                  type="button"
                  onClick={() => handleEstadoChange("descartado")}
                  disabled={updating || editSubmitting}
                  className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
                >
                  Descartar
                </button>
              </>
            )}

            {canManage && (
              <button
                type="button"
                onClick={() => {
                  setEditError(null);
                  setEditOpen(true);
                }}
                disabled={updating || editSubmitting || deleting}
                className="rounded-full border border-bloom-border bg-bloom-canvas px-4 py-2 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
              >
                Editar
              </button>
            )}

            {canManage && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setDeleteOpen(true);
                }}
                disabled={updating || editSubmitting || deleting}
                className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
              >
                Eliminar
              </button>
            )}
          </div>

          {error && (
            <p className="mt-2 text-xs text-red-700" role="alert">
              {error}
            </p>
          )}
        </div>

        <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-2 text-sm sm:text-right">
          <div>
            <dt className="text-bloom-muted">Valor total</dt>
            <dd className="font-medium text-bloom-ink">
              {formatCurrency(provider.valor_total)}
            </dd>
          </div>
          <div>
            <dt className="text-bloom-muted">Anticipo</dt>
            <dd className="font-medium text-bloom-ink">
              {formatCurrency(provider.anticipo)}
            </dd>
          </div>
          {provider.fecha_saldo && (
            <div className="col-span-2">
              <dt className="text-bloom-muted">Fecha de saldo</dt>
              <dd className="font-medium text-bloom-ink">
                {formatShortDateStable(provider.fecha_saldo)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {showPayments && (
        <ProviderPayments
          proveedorId={provider.id}
          proveedorNombre={provider.nombre}
          bodaNombre={boda.nombrePareja}
          pagos={pagos}
          anticipo={provider.anticipo}
          valorTotal={provider.valor_total}
          role={role}
        />
      )}

      {cotizacionOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Registrar cotización"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCotizacionOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl text-bloom-ink">
                  Registrar cotización
                </h2>
                <p className="mt-1 text-sm text-bloom-muted">
                  {provider.nombre} · {provider.categoria}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-bloom-muted transition-colors hover:bg-bloom-border hover:text-bloom-ink"
                onClick={() => setCotizacionOpen(false)}
                aria-label="Cerrar"
                disabled={cotizacionSubmitting}
              >
                <XIcon />
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleRegistrarCotizacion}>
              <Field label="Monto cotizado">
                <input
                  type="number"
                  min={1}
                  step={1}
                  className={inputClass}
                  value={montoCotizado}
                  onChange={(e) => setMontoCotizado(e.target.value)}
                  placeholder="Ej: 3500000"
                  required
                  disabled={cotizacionSubmitting}
                />
              </Field>
              <Field label="Descripción del servicio / plan">
                <textarea
                  className={textareaClass}
                  value={descripcionCotizacion}
                  onChange={(e) => setDescripcionCotizacion(e.target.value)}
                  placeholder="Plan, paquete o alcance del servicio cotizado"
                  rows={3}
                  disabled={cotizacionSubmitting}
                />
              </Field>
              <Field label="Notas">
                <textarea
                  className={textareaClass}
                  value={notasCotizacion}
                  onChange={(e) => setNotasCotizacion(e.target.value)}
                  placeholder="Condiciones, vigencia u observaciones internas"
                  rows={3}
                  disabled={cotizacionSubmitting}
                />
              </Field>

              {cotizacionError && (
                <p className="text-sm text-red-700" role="alert">
                  {cotizacionError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
                  onClick={() => setCotizacionOpen(false)}
                  disabled={cotizacionSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cotizacionSubmitting}
                  className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
                >
                  {cotizacionSubmitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Editar proveedor"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditOpen(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl text-bloom-ink">
                  Editar proveedor
                </h2>
                <p className="mt-1 text-sm text-bloom-muted">
                  Actualiza los datos del proveedor y su cotización.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-bloom-muted transition-colors hover:bg-bloom-border hover:text-bloom-ink"
                onClick={() => setEditOpen(false)}
                aria-label="Cerrar"
                disabled={editSubmitting}
              >
                <XIcon />
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleEditSave}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nombre">
                  <input
                    className={inputClass}
                    value={editForm.nombre}
                    onChange={(e) =>
                      setEditForm((s) => ({
                        ...s,
                        nombre: e.target.value,
                      }))
                    }
                    placeholder="Ej: Fotografía Luna"
                    required
                    disabled={editSubmitting}
                  />
                </Field>
                <Field label="Categoría">
                  <input
                    className={inputClass}
                    value={editForm.categoria}
                    onChange={(e) =>
                      setEditForm((s) => ({
                        ...s,
                        categoria: e.target.value,
                      }))
                    }
                    placeholder="Ej: Fotografía"
                    required
                    disabled={editSubmitting}
                  />
                </Field>
              </div>

              <Field label="Descripción del servicio">
                <textarea
                  className={textareaClass}
                  value={editForm.descripcionServicio}
                  onChange={(e) =>
                    setEditForm((s) => ({
                      ...s,
                      descripcionServicio: e.target.value,
                    }))
                  }
                  placeholder="Plan o servicio elegido"
                  rows={3}
                  disabled={editSubmitting}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Valor total">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={inputClass}
                    value={editForm.valorTotal}
                    onChange={(e) =>
                      setEditForm((s) => ({
                        ...s,
                        valorTotal: e.target.value,
                      }))
                    }
                    placeholder="Ej: 3500000"
                    required
                    disabled={editSubmitting}
                  />
                </Field>
                <Field label="Anticipo">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={inputClass}
                    value={editForm.anticipo}
                    onChange={(e) =>
                      setEditForm((s) => ({
                        ...s,
                        anticipo: e.target.value,
                      }))
                    }
                    placeholder="Ej: 1000000"
                    disabled={editSubmitting}
                  />
                </Field>
              </div>

              <Field label="Fecha de saldo">
                <input
                  type="date"
                  className={inputClass}
                  value={editForm.fechaSaldo}
                  onChange={(e) =>
                    setEditForm((s) => ({
                      ...s,
                      fechaSaldo: e.target.value,
                    }))
                  }
                  disabled={editSubmitting}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Banco">
                  <input
                    className={inputClass}
                    value={editForm.banco}
                    onChange={(e) =>
                      setEditForm((s) => ({
                        ...s,
                        banco: e.target.value,
                      }))
                    }
                    placeholder="Ej: Bancolombia"
                    disabled={editSubmitting}
                  />
                </Field>
                <Field label="Tipo de cuenta">
                  <select
                    className={inputClass}
                    value={editForm.tipoCuenta}
                    onChange={(e) =>
                      setEditForm((s) => ({
                        ...s,
                        tipoCuenta: e.target.value,
                      }))
                    }
                    disabled={editSubmitting}
                  >
                    <option value="">Seleccionar</option>
                    <option value="Ahorros">Ahorros</option>
                    <option value="Corriente">Corriente</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Número de cuenta">
                  <input
                    className={inputClass}
                    value={editForm.numeroCuenta}
                    onChange={(e) =>
                      setEditForm((s) => ({
                        ...s,
                        numeroCuenta: e.target.value,
                      }))
                    }
                    placeholder="Ej: 12345678901"
                    disabled={editSubmitting}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Titular">
                  <input
                    className={inputClass}
                    value={editForm.titularCuenta}
                    onChange={(e) =>
                      setEditForm((s) => ({
                        ...s,
                        titularCuenta: e.target.value,
                      }))
                    }
                    placeholder="Ej: Juan Pérez"
                    disabled={editSubmitting}
                  />
                </Field>
                <Field label="Documento / NIT">
                  <input
                    className={inputClass}
                    value={editForm.documentoNit}
                    onChange={(e) =>
                      setEditForm((s) => ({
                        ...s,
                        documentoNit: e.target.value,
                      }))
                    }
                    placeholder="Ej: 900123456-7"
                    disabled={editSubmitting}
                  />
                </Field>
              </div>

              <div className="space-y-3 rounded-xl border border-bloom-border bg-bloom-canvas/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
                  Contacto del proveedor
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Teléfono">
                    <input
                      className={inputClass}
                      value={editForm.telefono}
                      onChange={(e) =>
                        setEditForm((s) => ({
                          ...s,
                          telefono: e.target.value,
                        }))
                      }
                      placeholder="Ej: 3001234567"
                      disabled={editSubmitting}
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      className={inputClass}
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm((s) => ({
                          ...s,
                          email: e.target.value,
                        }))
                      }
                      placeholder="correo@proveedor.com"
                      disabled={editSubmitting}
                    />
                  </Field>
                </div>
                <Field label="Dirección / Residencia">
                  <input
                    className={inputClass}
                    value={editForm.direccion}
                    onChange={(e) =>
                      setEditForm((s) => ({
                        ...s,
                        direccion: e.target.value,
                      }))
                    }
                    placeholder="Ej: Calle 10 #20-30, Medellín"
                    disabled={editSubmitting}
                  />
                </Field>
              </div>

              <Field label="Link de pago">
                <input
                  type="url"
                  className={inputClass}
                  value={editForm.linkPago}
                  onChange={(e) =>
                    setEditForm((s) => ({
                      ...s,
                      linkPago: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                  disabled={editSubmitting}
                />
              </Field>

              <ProviderComisionFields
                daComision={editForm.daComision}
                porcentajeComision={editForm.porcentajeComision}
                onDaComisionChange={(daComision) =>
                  setEditForm((s) => ({ ...s, daComision }))
                }
                onPorcentajeChange={(porcentajeComision) =>
                  setEditForm((s) => ({ ...s, porcentajeComision }))
                }
                disabled={editSubmitting}
                inputClass={inputClass}
              />

              <Field label="Notas">
                <textarea
                  className={textareaClass}
                  value={editForm.notas}
                  onChange={(e) =>
                    setEditForm((s) => ({
                      ...s,
                      notas: e.target.value,
                    }))
                  }
                  placeholder="Ajustes, comentarios importantes..."
                  rows={3}
                  disabled={editSubmitting}
                />
              </Field>

              {editError && (
                <p className="text-sm text-red-700" role="alert">
                  {editError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
                  onClick={() => setEditOpen(false)}
                  disabled={editSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
                >
                  {editSubmitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-provider-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
            <h2
              id="delete-provider-title"
              className="font-display text-xl text-bloom-ink"
            >
              Eliminar proveedor
            </h2>
            <p className="mt-3 text-sm text-bloom-muted">
              ¿Eliminar este proveedor? Esta acción no se puede deshacer.
            </p>

            {error && (
              <p className="mt-4 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting || !supabase}
                className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

const textareaClass =
  "w-full resize-y rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-bloom-ink">{label}</label>
      {children}
    </div>
  );
}

function XIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

