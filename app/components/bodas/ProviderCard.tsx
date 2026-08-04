"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { FileText, StickyNote } from "lucide-react";
import {
  getProviderSaldoPendienteConPagos,
  getProveedorGrupoCategoriasCompaneras,
  getProveedorGrupoPrimaryId,
  hasDepositoReembolsable,
  hasProveedorValorDefinido,
  isProveedorGrupoPrimario,
  isProveedorSinCosto,
  parseProveedorValorInput,
  getDepositoReembolsableMonto,
  PROVIDER_STATUS_LABELS,
  PROVIDER_STATUS_STYLES,
  type ProveedorRow,
} from "@/app/data/providers";
import { formatCurrency, formatInputCurrency, formatInputCurrencyFromNumber, formatProveedorValorTotal, formatShortDateStable, parseInputCurrency } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { syncBodaProveedoresContratados } from "@/lib/sync-boda";
import { marcarHitoCronogramaPorProveedorContratado } from "@/lib/cronograma";
import { syncTastingNotasReunionToProveedor } from "@/lib/tasting-notas-reunion";
import type { PagoRow } from "@/app/data/pagos";
import type { NotaReunionRow } from "@/app/data/notas-reunion";
import { hasPermission, type UserRole } from "@/lib/auth/roles";
import { ProviderNotasReunion } from "@/app/components/bodas/ProviderNotasReunion";
import { WhatsAppLocaleToggle } from "@/app/components/ui/WhatsAppLocaleToggle";
import {
  buildCotizacionMessageByTipo,
  openCotizacionWhatsApp,
  type CotizacionBodaContext,
  type CotizacionMensajeTipo,
} from "@/lib/proveedor-cotizacion";
import type { WhatsAppLocale } from "@/lib/whatsapp-locale";
import { ProviderContratadoConfirmacionModal } from "./ProviderContratadoConfirmacionModal";
import { ProviderPayments } from "./ProviderPayments";
import { SubirCotizacionDriveButton } from "./SubirCotizacionDriveButton";
import { AbrirCarpetaDriveButton } from "./AbrirCarpetaDriveButton";
import { ProviderComisionFields } from "./ProviderComisionFields";
import {
  AUDITORIA_ACCIONES,
  buildProveedorEstadoAuditoriaDetalle,
  logAuditoria,
} from "@/lib/auditoria";
import { getPorcentajeComisionProveedor } from "@/lib/comisiones";
import {
  buildPaymentReminderDashboardMessage,
  openPaymentReminderWhatsApp,
} from "@/lib/whatsapp";

type ProviderCardProps = {
  provider: ProveedorRow;
  /** Lista completa de la boda, para resolver grupos multi-categoría. */
  allProviders?: ProveedorRow[];
  bodaId: string;
  boda: CotizacionBodaContext;
  plannerName: string;
  pagos: PagoRow[];
  pagosByProveedor?: Record<string, PagoRow[]>;
  notasReunion: NotaReunionRow[];
  currentUserId: string;
  role: UserRole;
  dragHandle?: ProviderDragHandleProps;
  driveFolderUrl?: string | null;
};

export type ProviderDragHandleProps = {
  setActivatorNodeRef: (element: HTMLElement | null) => void;
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
};

const cotizacionPrimerContactoButtonClass =
  "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-60";

const cotizacionPostReunionButtonClass =
  "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-green-500 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-60";

function CotizacionWhatsAppButtons({
  markPrimerAsRequested,
  disabled,
  onSolicitar,
  locale,
  onLocaleChange,
}: {
  markPrimerAsRequested: boolean;
  disabled: boolean;
  onSolicitar: (tipo: CotizacionMensajeTipo, markAsRequested: boolean) => void;
  locale: WhatsAppLocale;
  onLocaleChange: (locale: WhatsAppLocale) => void;
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-2">
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
      <WhatsAppLocaleToggle locale={locale} onChange={onLocaleChange} />
    </div>
  );
}

export function ProviderCard({
  provider,
  allProviders = [],
  bodaId,
  boda,
  plannerName,
  pagos,
  pagosByProveedor = {},
  notasReunion,
  currentUserId,
  role,
  dragHandle,
  driveFolderUrl = null,
}: ProviderCardProps) {
  const router = useRouter();
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cotizacionOpen, setCotizacionOpen] = useState(false);
  const [cotizacionModalTitle, setCotizacionModalTitle] = useState(
    "Registrar cotización",
  );
  const [cotizacionSubmitting, setCotizacionSubmitting] = useState(false);
  const [cotizacionError, setCotizacionError] = useState<string | null>(null);
  const [montoCotizado, setMontoCotizado] = useState(
    formatInputCurrencyFromNumber(provider.monto_cotizado),
  );
  const [descripcionCotizacion, setDescripcionCotizacion] = useState(
    provider.descripcion_servicio ?? "",
  );
  const [notasCotizacion, setNotasCotizacion] = useState(
    provider.notas_cotizacion ?? "",
  );
  const [whatsappLocale, setWhatsappLocale] = useState<WhatsAppLocale>("es");
  const [vincularOpen, setVincularOpen] = useState(false);
  const [vincularTargetId, setVincularTargetId] = useState("");
  const [vincularSubmitting, setVincularSubmitting] = useState(false);
  const [vincularError, setVincularError] = useState<string | null>(null);

  const canManage = hasPermission(role, "providers.manage");
  const canSendWhatsApp = hasPermission(role, "whatsapp.send");
  const isAdmin = role === "admin";
  const [comisionUpdating, setComisionUpdating] = useState(false);
  const [descripcionServicioLocal, setDescripcionServicioLocal] = useState(
    provider.descripcion_servicio ?? "",
  );
  const [notasLocal, setNotasLocal] = useState(provider.notas ?? "");
  const [editingInlineField, setEditingInlineField] = useState<
    "descripcion_servicio" | "notas" | null
  >(null);
  const [inlineDraft, setInlineDraft] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [infoProveedorOpen, setInfoProveedorOpen] = useState(false);

  useEffect(() => {
    if (editingInlineField === "descripcion_servicio") return;
    setDescripcionServicioLocal(provider.descripcion_servicio ?? "");
  }, [provider.descripcion_servicio, editingInlineField]);

  useEffect(() => {
    if (editingInlineField === "notas") return;
    setNotasLocal(provider.notas ?? "");
  }, [provider.notas, editingInlineField]);
  const providersForGrupo =
    allProviders.length > 0 ? allProviders : [provider];
  const esPrimarioGrupo = isProveedorGrupoPrimario(providersForGrupo, provider);
  const categoriasCompaneras = getProveedorGrupoCategoriasCompaneras(
    providersForGrupo,
    provider,
  );
  const primaryId = provider.grupo_id
    ? getProveedorGrupoPrimaryId(providersForGrupo, provider.grupo_id)
    : provider.id;
  const primaryProvider =
    primaryId != null
      ? (providersForGrupo.find((p) => p.id === primaryId) ?? provider)
      : provider;
  const pagosParaSaldo = esPrimarioGrupo
    ? pagos
    : (pagosByProveedor[primaryProvider.id] ?? []);
  const showPayments =
    esPrimarioGrupo &&
    provider.estado === "contratado" &&
    !isProveedorSinCosto(provider);
  const esSecundarioGrupo =
    !esPrimarioGrupo && Boolean(provider.grupo_id);
  const incluidoEnLabel = esSecundarioGrupo
    ? `Incluido en ${primaryProvider.nombre}${
        primaryProvider.nombre.trim().toLowerCase() ===
        provider.nombre.trim().toLowerCase()
          ? ` (${primaryProvider.categoria})`
          : ""
      }`
    : null;
  const saldoPendiente = getProviderSaldoPendienteConPagos(
    primaryProvider,
    pagosParaSaldo,
  );
  const sinCosto = isProveedorSinCosto(provider);
  /** Cotización recibida: solo valor de referencia, sin saldo ni pagos. */
  const showValorCotizado =
    !sinCosto && provider.estado === "en_negociacion";
  /** Contratado: valor total, pagos y saldo pendiente. */
  const showFinanzasCompletas =
    !sinCosto && provider.estado === "contratado";
  const valorCotizadoMostrar =
    provider.monto_cotizado != null && provider.monto_cotizado > 0
      ? provider.monto_cotizado
      : provider.valor_total;
  const hasWhatsAppTarget =
    Boolean(boda.whatsappGrupoLink?.trim()) ||
    Boolean(boda.telefonoNovia?.trim());
  const showPaymentReminder =
    esPrimarioGrupo &&
    provider.estado === "contratado" &&
    !sinCosto &&
    saldoPendiente > 0 &&
    canSendWhatsApp;

  const candidatosVinculo = providersForGrupo
    .filter(
      (p) =>
        p.id !== provider.id &&
        p.estado !== "descartado" &&
        !(
          provider.grupo_id &&
          p.grupo_id &&
          provider.grupo_id === p.grupo_id
        ),
    )
    .slice()
    .sort((a, b) => {
      const byName = a.nombre.localeCompare(b.nombre, "es");
      if (byName !== 0) return byName;
      return a.categoria.localeCompare(b.categoria, "es");
    });

  function startInlineEdit(field: "descripcion_servicio" | "notas") {
    if (!canManage || inlineSaving) return;
    setEditingInlineField(field);
    setInlineDraft(
      field === "descripcion_servicio"
        ? descripcionServicioLocal
        : notasLocal,
    );
    setInlineError(null);
  }

  function cancelInlineEdit() {
    if (inlineSaving) return;
    setEditingInlineField(null);
    setInlineError(null);
  }

  async function handleSaveInlineField(
    field: "descripcion_servicio" | "notas",
  ) {
    if (!canManage) {
      setInlineError("No tienes permisos para editar proveedores.");
      return;
    }
    if (!supabase) {
      setInlineError("Supabase no está configurado.");
      return;
    }

    const trimmed = inlineDraft.trim();
    setInlineSaving(true);
    setInlineError(null);

    try {
      const { error: updateError } = await supabase
        .from("proveedores")
        .update({ [field]: trimmed || null })
        .eq("id", provider.id);

      if (updateError) {
        setInlineError(updateError.message);
        return;
      }

      if (field === "descripcion_servicio") {
        setDescripcionServicioLocal(trimmed);
      } else {
        setNotasLocal(trimmed);
      }
      setEditingInlineField(null);
      router.refresh();
    } finally {
      setInlineSaving(false);
    }
  }

  async function handleVincularProveedor(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage || !supabase) {
      setVincularError(
        !supabase
          ? "Supabase no está configurado."
          : "No tienes permiso para vincular proveedores.",
      );
      return;
    }

    const other = providersForGrupo.find((p) => p.id === vincularTargetId);
    if (!other) {
      setVincularError("Selecciona un proveedor para vincular.");
      return;
    }

    setVincularSubmitting(true);
    setVincularError(null);
    try {
      const memberIds = new Set<string>([provider.id, other.id]);
      for (const p of providersForGrupo) {
        if (
          (provider.grupo_id && p.grupo_id === provider.grupo_id) ||
          (other.grupo_id && p.grupo_id === other.grupo_id)
        ) {
          memberIds.add(p.id);
        }
      }

      const grupoId =
        provider.grupo_id ?? other.grupo_id ?? crypto.randomUUID();

      const { error: updateGrupoError } = await supabase
        .from("proveedores")
        .update({ grupo_id: grupoId })
        .in("id", [...memberIds]);

      if (updateGrupoError) {
        setVincularError(updateGrupoError.message);
        return;
      }

      const members = providersForGrupo
        .filter((p) => memberIds.has(p.id))
        .map((p) => ({ ...p, grupo_id: grupoId }))
        .sort((a, b) => {
          const byDate = a.created_at.localeCompare(b.created_at);
          if (byDate !== 0) return byDate;
          return a.id.localeCompare(b.id);
        });

      const primary = members[0];
      const secondaries = members.slice(1);
      if (primary && secondaries.length > 0) {
        const primaryAnticipo = Math.max(Number(primary.anticipo) || 0, 0);
        let anticipoExtra = 0;
        let depositoExtra = 0;

        for (const secondary of secondaries) {
          const secondaryAnticipo = Math.max(
            Number(secondary.anticipo) || 0,
            0,
          );
          // Si el primario ya tiene anticipo, se asume duplicado en secundarios.
          if (primaryAnticipo === 0 && secondaryAnticipo > 0) {
            anticipoExtra += secondaryAnticipo;
          }
          depositoExtra += getDepositoReembolsableMonto(secondary);

          const { error: movePagosError } = await supabase
            .from("pagos")
            .update({ proveedor_id: primary.id })
            .eq("proveedor_id", secondary.id);

          if (movePagosError) {
            setVincularError(
              `Grupo vinculado, pero no se pudieron mover pagos: ${movePagosError.message}`,
            );
            router.refresh();
            return;
          }
        }

        const primaryUpdate: {
          anticipo?: number;
          deposito_reembolsable?: number;
        } = {};
        if (anticipoExtra > 0) {
          primaryUpdate.anticipo = primaryAnticipo + anticipoExtra;
        }
        if (
          depositoExtra > 0 &&
          getDepositoReembolsableMonto(primary) === 0
        ) {
          primaryUpdate.deposito_reembolsable = depositoExtra;
        }

        if (Object.keys(primaryUpdate).length > 0) {
          const { error: primaryError } = await supabase
            .from("proveedores")
            .update(primaryUpdate)
            .eq("id", primary.id);

          if (primaryError) {
            setVincularError(
              `Grupo vinculado, pero no se pudo consolidar anticipo/depósito: ${primaryError.message}`,
            );
            router.refresh();
            return;
          }
        }

        const { error: clearError } = await supabase
          .from("proveedores")
          .update({ anticipo: 0, deposito_reembolsable: 0 })
          .in(
            "id",
            secondaries.map((p) => p.id),
          );

        if (clearError) {
          setVincularError(
            `Grupo vinculado, pero no se pudo limpiar anticipo/depósito de secundarios: ${clearError.message}`,
          );
          router.refresh();
          return;
        }
      }

      await logAuditoria({
        accion: AUDITORIA_ACCIONES.ESTADO_PROVEEDOR,
        entidad: "proveedor",
        entidadId: provider.id,
        bodaNombre: boda.nombrePareja,
        detalle: `Grupo vinculado: ${provider.nombre} (${provider.categoria}) ↔ ${other.nombre} (${other.categoria})`,
      });

      setVincularOpen(false);
      setVincularTargetId("");
      router.refresh();
    } finally {
      setVincularSubmitting(false);
    }
  }

  function handlePaymentReminder() {
    const message = buildPaymentReminderDashboardMessage(
      {
        nombrePareja: boda.nombrePareja,
        nombreProveedor: provider.nombre,
        saldoPendiente,
        fechaSaldo: provider.fecha_saldo,
        banco: provider.banco,
        numeroCuenta: provider.numero_cuenta,
        titularCuenta: provider.titular_cuenta,
      },
      whatsappLocale,
    );
    openPaymentReminderWhatsApp({
      message,
      whatsappGrupoLink: boda.whatsappGrupoLink ?? null,
      telefonoNovia: boda.telefonoNovia ?? null,
    });
  }

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
    depositoReembolsable: string;
  };

  const [editOpen, setEditOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [contratadoConfirmOpen, setContratadoConfirmOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({
    nombre: provider.nombre,
    categoria: provider.categoria,
    descripcionServicio: provider.descripcion_servicio ?? "",
    valorTotal:
      provider.valor_total != null && provider.valor_total > 0
        ? formatInputCurrencyFromNumber(provider.valor_total)
        : "",
    anticipo: formatInputCurrencyFromNumber(provider.anticipo),
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
    depositoReembolsable:
      getDepositoReembolsableMonto(provider) > 0
        ? formatInputCurrencyFromNumber(getDepositoReembolsableMonto(provider))
        : "",
  });

  useEffect(() => {
    if (!editOpen) return;

    // Precarga con los valores actuales del proveedor.
    setEditForm({
      nombre: provider.nombre ?? "",
      categoria: provider.categoria ?? "",
      descripcionServicio: provider.descripcion_servicio ?? "",
      valorTotal:
        provider.valor_total != null && provider.valor_total > 0
          ? formatInputCurrencyFromNumber(provider.valor_total)
          : "",
      anticipo: formatInputCurrencyFromNumber(provider.anticipo ?? 0),
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
      depositoReembolsable:
        getDepositoReembolsableMonto(provider) > 0
          ? formatInputCurrencyFromNumber(getDepositoReembolsableMonto(provider))
          : "",
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

    const valorTotal = parseProveedorValorInput(editForm.valorTotal);
    const anticipo = parseInputCurrency(editForm.anticipo);

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
    if (valorTotal === 0 && anticipo > 0) {
      return setEditError(
        "Si el valor total está pendiente, el anticipo debe ser 0.",
      );
    }
    if (valorTotal > 0 && anticipo > valorTotal) {
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

    const depositoReembolsable = parseInputCurrency(
      editForm.depositoReembolsable,
    );
    if (!Number.isFinite(depositoReembolsable) || depositoReembolsable < 0) {
      return setEditError("Ingresa un depósito reembolsable válido (>= 0).");
    }

    setEditSubmitting(true);
    try {
      // En registros secundarios del grupo, anticipo/depósito no deben duplicarse.
      const anticipoGuardar = esPrimarioGrupo ? Math.round(anticipo) : 0;
      const depositoGuardar = esPrimarioGrupo
        ? Math.round(depositoReembolsable)
        : 0;

      const { error: updateError } = await supabase
        .from("proveedores")
        .update({
          nombre,
          categoria,
          descripcion_servicio: descripcionServicio || null,
          valor_total: esPrimarioGrupo ? Math.round(valorTotal) : 0,
          anticipo: anticipoGuardar,
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
          deposito_reembolsable: depositoGuardar,
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
    const message = buildCotizacionMessageByTipo(
      tipo,
      provider.nombre,
      plannerName.trim(),
      bodaCtx,
      provider.categoria,
      whatsappLocale,
    );
    const opened = openCotizacionWhatsApp(provider.telefono, message);
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
        detalle: buildProveedorEstadoAuditoriaDetalle(
          provider.nombre,
          "cotizacion_solicitada",
        ),
      });

      router.refresh();
    } finally {
      setUpdating(false);
    }
  }

  function openCotizacionModal(
    title: string,
    options?: { resetFields?: boolean },
  ) {
    setCotizacionError(null);
    setCotizacionModalTitle(title);
    if (options?.resetFields) {
      setMontoCotizado("");
      setDescripcionCotizacion("");
      setNotasCotizacion("");
    } else {
      setMontoCotizado(
        formatInputCurrencyFromNumber(provider.monto_cotizado),
      );
      setDescripcionCotizacion(provider.descripcion_servicio ?? "");
      setNotasCotizacion(provider.notas_cotizacion ?? "");
    }
    setCotizacionOpen(true);
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

    const monto = parseInputCurrency(montoCotizado);
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
          monto_cotizado: esPrimarioGrupo ? Math.round(monto) : null,
          descripcion_servicio: descripcionCotizacion.trim() || null,
          notas_cotizacion: notasCotizacion.trim() || null,
          cotizacion_recibida_at: new Date().toISOString(),
          valor_total: esPrimarioGrupo ? Math.round(monto) : 0,
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
        if (supabase) {
          await marcarHitoCronogramaPorProveedorContratado(
            supabase,
            bodaId,
            provider.categoria,
          );
          await syncTastingNotasReunionToProveedor(supabase, {
            bodaId,
            proveedorId: provider.id,
            proveedorNombre: provider.nombre,
            currentUserId,
            currentUserNombre: plannerName,
          });
        }
      }

      await logAuditoria({
        accion: AUDITORIA_ACCIONES.ESTADO_PROVEEDOR,
        entidad: "proveedor",
        entidadId: provider.id,
        bodaNombre: boda.nombrePareja,
        detalle: buildProveedorEstadoAuditoriaDetalle(
          provider.nombre,
          nuevoEstado,
        ),
      });

      if (nuevoEstado === "contratado") {
        setContratadoConfirmOpen(true);
        return;
      }

      router.refresh();
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-bloom-border bg-bloom-surface shadow-sm">
      {dragHandle && (
        <button
          type="button"
          ref={dragHandle.setActivatorNodeRef}
          {...dragHandle.attributes}
          {...dragHandle.listeners}
          className="absolute left-2 top-3 z-10 inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-lg text-bloom-muted transition-colors hover:bg-bloom-canvas hover:text-bloom-ink active:cursor-grabbing"
          aria-label="Reordenar proveedor"
          title="Arrastrar para reordenar"
          onClick={(e) => e.stopPropagation()}
        >
          <DragHandleIcon />
        </button>
      )}
      <div className={dragHandle ? "pl-7" : undefined}>
        <button
          type="button"
          id={`${panelId}-trigger`}
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-bloom-canvas/60 sm:px-6"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <span className="min-w-0 flex-1 overflow-hidden">
              <span className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 truncate font-medium text-bloom-ink">
                  {provider.nombre}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <ProviderEstadoBadge provider={provider} />
                  {sinCosto ? (
                    <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">
                      Sin costo
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="mt-1 block truncate text-sm text-bloom-muted">
                {provider.categoria}
              </span>
              {incluidoEnLabel ? (
                <span
                  className="mt-1 block truncate text-xs text-bloom-muted"
                  title={incluidoEnLabel}
                >
                  {incluidoEnLabel}
                </span>
              ) : null}
              {!esSecundarioGrupo && categoriasCompaneras.length > 0 ? (
                <span className="mt-1 block text-xs text-bloom-muted/90">
                  Precio compartido con {categoriasCompaneras.join(", ")}
                </span>
              ) : null}
            </span>
            {!esSecundarioGrupo && !sinCosto && showFinanzasCompletas && (
              <dl className="grid shrink-0 grid-cols-2 gap-x-5 gap-y-1 text-sm sm:text-right">
                <div>
                  <dt className="text-bloom-muted">Valor total</dt>
                  <dd className="font-medium text-bloom-ink">
                    {formatProveedorValorTotal(provider.valor_total)}
                  </dd>
                </div>
                <div>
                  <dt className="text-bloom-muted">Saldo pendiente</dt>
                  <dd className="font-medium text-bloom-ink">
                    {hasProveedorValorDefinido(provider.valor_total) ? (
                      formatCurrency(saldoPendiente)
                    ) : (
                      formatProveedorValorTotal(0)
                    )}
                  </dd>
                </div>
              </dl>
            )}
            {!esSecundarioGrupo && !sinCosto && showValorCotizado && (
              <dl className="grid shrink-0 gap-y-1 text-sm sm:text-right">
                <div>
                  <dt className="text-bloom-muted">Valor cotizado</dt>
                  <dd className="font-medium text-bloom-ink">
                    {formatProveedorValorTotal(valorCotizadoMostrar)}
                  </dd>
                </div>
              </dl>
            )}
          </span>
          <AccordionChevron open={expanded} />
        </button>

        <div
          id={panelId}
          role="region"
          aria-labelledby={`${panelId}-trigger`}
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="border-t border-bloom-border/70 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          {canManage ? (
            <div className="space-y-3">
              <ProviderInlineTextField
                label="Descripción del servicio"
                icon={FileText}
                emptyLabel="Agregar descripción..."
                value={descripcionServicioLocal}
                editing={editingInlineField === "descripcion_servicio"}
                draft={inlineDraft}
                saving={inlineSaving}
                error={
                  editingInlineField === "descripcion_servicio"
                    ? inlineError
                    : null
                }
                disabled={
                  updating || editSubmitting || deleting || inlineSaving
                }
                onStartEdit={() => startInlineEdit("descripcion_servicio")}
                onDraftChange={setInlineDraft}
                onCancel={cancelInlineEdit}
                onSave={() => handleSaveInlineField("descripcion_servicio")}
              />
              <ProviderInlineTextField
                label="Notas internas"
                icon={StickyNote}
                emptyLabel="Agregar nota..."
                value={notasLocal}
                editing={editingInlineField === "notas"}
                draft={inlineDraft}
                saving={inlineSaving}
                error={editingInlineField === "notas" ? inlineError : null}
                disabled={
                  updating || editSubmitting || deleting || inlineSaving
                }
                onStartEdit={() => startInlineEdit("notas")}
                onDraftChange={setInlineDraft}
                onCancel={cancelInlineEdit}
                onSave={() => handleSaveInlineField("notas")}
              />
            </div>
          ) : null}

          {canManage && (
            <div className="mt-3 max-w-sm">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-bloom-muted">
                Cotización en Drive
              </p>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <SubirCotizacionDriveButton
                    bodaId={bodaId}
                    proveedorId={provider.id}
                    cotizacionDriveUrl={provider.cotizacion_drive_url}
                    disabled={
                      updating ||
                      editSubmitting ||
                      deleting ||
                      cotizacionSubmitting
                    }
                  />
                </div>
                <AbrirCarpetaDriveButton driveFolderUrl={driveFolderUrl} />
              </div>
            </div>
          )}

          {showPaymentReminder && (
            <div className="mt-4 border-t border-bloom-border pt-4">
              <div className="inline-flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePaymentReminder}
                  disabled={!hasWhatsAppTarget}
                  title={
                    hasWhatsAppTarget
                      ? undefined
                      : "Agrega el grupo de WhatsApp o el teléfono de la novia en la boda"
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-medium text-green-800 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <WhatsAppIcon />
                  Enviar recordatorio de pago
                </button>
                <WhatsAppLocaleToggle
                  locale={whatsappLocale}
                  onChange={setWhatsappLocale}
                />
              </div>
            </div>
          )}

          {showPayments && (
            <ProviderPayments
              bodaId={bodaId}
              proveedorId={provider.id}
              proveedorNombre={provider.nombre}
              bodaNombre={boda.nombrePareja}
              pagos={pagos}
              anticipo={provider.anticipo}
              valorTotal={provider.valor_total}
              createdAt={provider.created_at}
              role={role}
              driveFolderUrl={driveFolderUrl}
            />
          )}

          <div className="mt-3">
            <button
              type="button"
              aria-expanded={infoProveedorOpen}
              aria-controls={`${panelId}-info-proveedor`}
              onClick={() => setInfoProveedorOpen((open) => !open)}
              className="inline-flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas/70"
            >
              <AccordionChevron open={infoProveedorOpen} />
              <span>Ver información del proveedor</span>
            </button>
            <div
              id={`${panelId}-info-proveedor`}
              className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                infoProveedorOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <dl className="mt-1 grid grid-cols-1 gap-2 rounded-lg border border-bloom-border bg-bloom-canvas/60 px-3 py-2 text-xs text-bloom-ink sm:grid-cols-2">
                  <div>
                    <dt className="text-bloom-muted">Teléfono</dt>
                    <dd>{provider.telefono?.trim() || "No registrado"}</dd>
                  </div>
                  <div>
                    <dt className="text-bloom-muted">Email</dt>
                    <dd className="break-all">
                      {provider.email?.trim() || "No registrado"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-bloom-muted">Banco</dt>
                    <dd>{provider.banco?.trim() || "No registrado"}</dd>
                  </div>
                  <div>
                    <dt className="text-bloom-muted">Tipo de cuenta</dt>
                    <dd>{provider.tipo_cuenta?.trim() || "No registrado"}</dd>
                  </div>
                  <div>
                    <dt className="text-bloom-muted">Número de cuenta</dt>
                    <dd>{provider.numero_cuenta?.trim() || "No registrado"}</dd>
                  </div>
                  <div>
                    <dt className="text-bloom-muted">Titular</dt>
                    <dd>
                      {provider.titular_cuenta?.trim() || "No registrado"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-bloom-muted">Documento / NIT</dt>
                    <dd>
                      {provider.documento_nit?.trim() || "No registrado"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-bloom-muted">Dirección / Residencia</dt>
                    <dd>
                      {provider.direccion?.trim() || "No registrado"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {hasDepositoReembolsable(provider) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">
                Depósito reembolsable:{" "}
                {formatCurrency(getDepositoReembolsableMonto(provider))}
              </span>
            </div>
          )}

          {isAdmin && provider.da_comision && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800">
                Comisión {getPorcentajeComisionProveedor(provider)}%
              </span>
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
              <CotizacionWhatsAppButtons
                markPrimerAsRequested
                disabled={updating || editSubmitting || deleting}
                onSolicitar={handleSolicitarCotizacion}
                locale={whatsappLocale}
                onLocaleChange={setWhatsappLocale}
              />
              <button
                type="button"
                onClick={() => openCotizacionModal("Ya tengo cotización", { resetFields: true })}
                disabled={updating || editSubmitting || deleting || cotizacionSubmitting}
                className="inline-flex items-center justify-center rounded-lg border border-bloom-border bg-bloom-surface px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas disabled:opacity-60"
              >
                Ya tengo cotización
              </button>
            </div>
          )}

          {canManage && provider.estado === "cotizacion_solicitada" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <CotizacionWhatsAppButtons
                markPrimerAsRequested={false}
                disabled={updating || editSubmitting || deleting}
                onSolicitar={handleSolicitarCotizacion}
                locale={whatsappLocale}
                onLocaleChange={setWhatsappLocale}
              />
              <button
                type="button"
                onClick={() => openCotizacionModal("Registrar cotización")}
                disabled={updating || editSubmitting}
                className="rounded-full bg-bloom-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
              >
                Registrar cotización
              </button>
            </div>
          )}

          {provider.estado === "en_negociacion" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleEstadoChange("contratado")}
                disabled={updating || editSubmitting || deleting}
                className="inline-flex items-center justify-center rounded-full bg-green-500 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-green-600 disabled:opacity-60"
              >
                {updating ? "Actualizando..." : "Contratar"}
              </button>
              <button
                type="button"
                onClick={() => handleEstadoChange("descartado")}
                disabled={updating || editSubmitting || deleting}
                className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
              >
                Descartar
              </button>
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
                disabled={updating || editSubmitting || deleting || vincularSubmitting}
                className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
              >
                Eliminar
              </button>
            )}

            {canManage && candidatosVinculo.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setVincularError(null);
                  setVincularTargetId("");
                  setVincularOpen(true);
                }}
                disabled={updating || editSubmitting || deleting || vincularSubmitting}
                className="rounded-full border border-bloom-border bg-bloom-canvas px-4 py-2 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
              >
                Vincular con otro proveedor
              </button>
            )}
          </div>

          {error && (
            <p className="mt-2 text-xs text-red-700" role="alert">
              {error}
            </p>
          )}

          {showFinanzasCompletas && provider.fecha_saldo && (
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-bloom-border bg-bloom-canvas/60 px-3 py-2 text-sm sm:max-w-md">
              <div>
                <dt className="text-bloom-muted">Fecha de saldo</dt>
                <dd className="font-medium text-bloom-ink">
                  {formatShortDateStable(provider.fecha_saldo)}
                </dd>
              </div>
            </dl>
          )}

      <ProviderNotasReunion
        bodaId={bodaId}
        bodaNombre={boda.nombrePareja}
        provider={provider}
        initialNotas={notasReunion}
        currentUserId={currentUserId}
        currentUserNombre={plannerName}
        role={role}
      />
            </div>
          </div>
        </div>
      </div>

      {contratadoConfirmOpen && (
        <ProviderContratadoConfirmacionModal
          boda={boda}
          nombreProveedor={provider.nombre}
          categoria={provider.categoria}
          descripcionServicio={provider.descripcion_servicio}
          valorTotal={provider.valor_total}
          telefonoProveedor={provider.telefono}
          onClose={() => {
            setContratadoConfirmOpen(false);
            router.refresh();
          }}
        />
      )}

      {cotizacionOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={cotizacionModalTitle}
          onClick={(e) => {
            if (e.target === e.currentTarget) setCotizacionOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl text-bloom-ink">
                  {cotizacionModalTitle}
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
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className={inputClass}
                  value={montoCotizado}
                  onChange={(e) =>
                    setMontoCotizado(formatInputCurrency(e.target.value))
                  }
                  placeholder="Ej: 3.500.000"
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
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    className={inputClass}
                    value={editForm.valorTotal}
                    onChange={(e) =>
                      setEditForm((s) => ({
                        ...s,
                        valorTotal: formatInputCurrency(e.target.value),
                      }))
                    }
                    placeholder="Pendiente de definir"
                    disabled={editSubmitting}
                  />
                </Field>
                {esPrimarioGrupo ? (
                  <Field label="Anticipo">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      className={inputClass}
                      value={editForm.anticipo}
                      onChange={(e) =>
                        setEditForm((s) => ({
                          ...s,
                          anticipo: formatInputCurrency(e.target.value),
                        }))
                      }
                      placeholder="Ej: 1.000.000"
                      disabled={editSubmitting}
                    />
                  </Field>
                ) : (
                  <div className="flex items-end">
                    <p className="text-xs text-bloom-muted">
                      Anticipo y pagos se gestionan en la categoría primaria del
                      grupo.
                    </p>
                  </div>
                )}
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

              {esPrimarioGrupo ? (
                <div className="rounded-xl border border-sky-200/80 bg-sky-50/40 p-4 space-y-4">
                  <p className="text-sm font-medium text-bloom-ink">
                    Depósito reembolsable
                  </p>
                  <Field label="Monto del depósito">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      className={inputClass}
                      value={editForm.depositoReembolsable}
                      onChange={(e) =>
                        setEditForm((s) => ({
                          ...s,
                          depositoReembolsable: formatInputCurrency(
                            e.target.value,
                          ),
                        }))
                      }
                      placeholder="Opcional"
                      disabled={editSubmitting}
                    />
                  </Field>
                </div>
              ) : null}

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

      {vincularOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vincular-provider-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !vincularSubmitting) {
              setVincularOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
            <h2
              id="vincular-provider-title"
              className="font-display text-xl text-bloom-ink"
            >
              Vincular con otro proveedor
            </h2>
            <p className="mt-3 text-sm text-bloom-muted">
              Comparte el mismo valor en la proyección. El saldo y los pagos
              quedan en el proveedor primario del grupo (el más antiguo).
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleVincularProveedor}>
              <label className="block text-sm">
                <span className="text-bloom-muted">Proveedor</span>
                <select
                  className="mt-1 w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2.5 text-sm text-bloom-ink outline-none focus:border-bloom-accent"
                  value={vincularTargetId}
                  onChange={(e) => setVincularTargetId(e.target.value)}
                  disabled={vincularSubmitting}
                  required
                >
                  <option value="">Selecciona un proveedor…</option>
                  {candidatosVinculo.map((candidato) => (
                    <option key={candidato.id} value={candidato.id}>
                      {candidato.nombre} · {candidato.categoria}
                      {candidato.estado !== "contratado"
                        ? ` (${PROVIDER_STATUS_LABELS[candidato.estado]})`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>

              {vincularError && (
                <p className="text-sm text-red-700" role="alert">
                  {vincularError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setVincularOpen(false)}
                  disabled={vincularSubmitting}
                  className="rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={vincularSubmitting || !vincularTargetId}
                  className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
                >
                  {vincularSubmitting ? "Vinculando…" : "Vincular"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProviderEstadoBadge({ provider }: { provider: ProveedorRow }) {
  if (provider.estado === "cotizacion_solicitada") {
    return (
      <span className="inline-flex flex-col rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-800">
        <span>Cotización solicitada</span>
        {provider.cotizacion_solicitada_at && (
          <span className="font-normal opacity-90">
            {formatShortDateStable(provider.cotizacion_solicitada_at.slice(0, 10))}
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PROVIDER_STATUS_STYLES[provider.estado]}`}
    >
      {PROVIDER_STATUS_LABELS[provider.estado]}
    </span>
  );
}

function ProviderInlineTextField({
  label,
  icon: Icon,
  emptyLabel,
  value,
  editing,
  draft,
  saving,
  error,
  disabled,
  onStartEdit,
  onDraftChange,
  onCancel,
  onSave,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  emptyLabel: string;
  value: string;
  editing: boolean;
  draft: string;
  saving: boolean;
  error: string | null;
  disabled: boolean;
  onStartEdit: () => void;
  onDraftChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="inline-flex items-center gap-1.5 text-xs text-bloom-muted">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{label}</span>
      </p>

      {editing ? (
        <div className="space-y-2">
          <textarea
            className={textareaClass}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            rows={3}
            autoFocus
            disabled={saving}
            aria-label={label}
          />
          {error ? (
            <p className="text-xs text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-full border border-bloom-border bg-bloom-surface px-3 py-1 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-full bg-bloom-accent px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      ) : value.trim() ? (
        <button
          type="button"
          onClick={onStartEdit}
          disabled={disabled}
          aria-label={`Editar ${label.toLowerCase()}`}
          className="block w-full rounded-lg border border-transparent px-1.5 py-1 text-left transition-colors hover:border-bloom-border/70 hover:bg-bloom-canvas/70 disabled:opacity-60"
        >
          <span className="whitespace-pre-wrap text-sm text-bloom-ink">
            {value.trim()}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onStartEdit}
          disabled={disabled}
          aria-label={emptyLabel}
          className="block w-full rounded-lg border border-dashed border-bloom-border/80 px-1.5 py-1 text-left text-sm text-bloom-muted transition-colors hover:border-bloom-border hover:bg-bloom-canvas/70 hover:text-bloom-ink disabled:opacity-60"
        >
          {emptyLabel}
        </button>
      )}
    </div>
  );
}

function AccordionChevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-5 w-5 shrink-0 text-bloom-muted transition-transform duration-300 ${
        open ? "rotate-180" : "rotate-0"
      }`}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function DragHandleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M7 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM7 10a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM7 15.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM16 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM16 10a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM16 15.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
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

