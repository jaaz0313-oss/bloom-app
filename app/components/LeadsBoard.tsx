"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LEAD_SEGUIMIENTO_LABELS,
  LEAD_SEGUIMIENTO_STYLES,
  type LeadRow,
} from "@/app/data/leads";
import Link from "next/link";
import { formatCurrency, formatInputCurrencyFromNumber, formatShortDateStable, parseInputCurrency } from "@/lib/format";
import { importarCotizacionLeadABoda } from "@/lib/import-cotizacion-to-boda";
import { insertarCronograma } from "@/lib/cronograma";
import {
  DRIVE_FOLDER_CREATE_WARNING,
  ensureBodaDriveFolder,
} from "@/lib/ensure-boda-drive-folder";
import { createCotizacionForLead } from "@/lib/create-lead-cotizacion";
import { AUDITORIA_ACCIONES, logAuditoria } from "@/lib/auditoria";
import { insertLeadRow, updateLeadSeguimiento } from "@/lib/leads-mutations";
import { supabase } from "@/lib/supabase";
import { hasPermission, type UserRole } from "@/lib/auth/roles";
import {
  fetchSugerenciasBodasSimilares,
  sugerenciasBodasSimilaresToInsertItems,
} from "@/lib/sugerencias-bodas-similares";
import { LeadAgendarReunionButton } from "@/app/components/leads/LeadAgendarReunionModal";
import {
  emptyLeadForm,
  LeadCreateFields,
  LeadEditFields,
  type LeadFormState,
} from "@/app/components/leads/LeadFormFields";

type LeadsBoardProps = {
  activeLeads: LeadRow[];
  discardedLeads: LeadRow[];
  role: UserRole;
  currentUserId: string;
  currentUserNombre: string;
};

export function LeadsBoard({
  activeLeads,
  discardedLeads,
  role,
  currentUserId,
  currentUserNombre,
}: LeadsBoardProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadRow | null>(null);
  const [discardTarget, setDiscardTarget] = useState<LeadRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeadRow | null>(null);
  const [discardedOpen, setDiscardedOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convertErrorLeadId, setConvertErrorLeadId] = useState<string | null>(
    null,
  );
  const errorBannerRef = useRef<HTMLParagraphElement | null>(null);
  const [driveWarning, setDriveWarning] = useState<string | null>(null);
  const [form, setForm] = useState<LeadFormState>(emptyLeadForm);
  const [fechaConflicto, setFechaConflicto] = useState<string[]>([]);
  const [anticipoTouched, setAnticipoTouched] = useState(false);
  const [iaPrompt, setIaPrompt] = useState<{
    bodaId: string;
    leadNombre: string;
    items: Array<{
      directorio_proveedor_id: string | null;
      nombre_proveedor: string;
      categoria: string;
      instagram: string | null;
      orden: number;
    }>;
  } | null>(null);
  const [iaSubmitting, setIaSubmitting] = useState(false);
  const canManageAcuerdos = role === "admin" || role === "lider";
  const canManageLeads = hasPermission(role, "leads.create");

  const sortByCreated = (list: LeadRow[]) =>
    [...list].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  const sortedActiveLeads = useMemo(
    () => sortByCreated(activeLeads),
    [activeLeads],
  );
  const sortedDiscardedLeads = useMemo(
    () => sortByCreated(discardedLeads),
    [discardedLeads],
  );

  function openCreateModal() {
    setError(null);
    setForm(emptyLeadForm);
    setFechaConflicto([]);
    setAnticipoTouched(false);
    setCreateOpen(true);
  }

  useEffect(() => {
    if ((!createOpen && !editOpen) || !form.fechaTentativa) {
      setFechaConflicto([]);
      return;
    }

    let cancelled = false;

    async function checkFechaConflicto() {
      if (!supabase) return;

      const { data } = await supabase
        .from("bodas")
        .select("nombre_pareja")
        .eq("fecha_boda", form.fechaTentativa);

      if (cancelled) return;

      if (data && data.length > 0) {
        setFechaConflicto(data.map((boda) => boda.nombre_pareja));
      } else {
        setFechaConflicto([]);
      }
    }

    void checkFechaConflicto();

    return () => {
      cancelled = true;
    };
  }, [createOpen, editOpen, form.fechaTentativa]);

  function openEditModal(lead: LeadRow) {
    setError(null);
    setEditingLead(lead);
    setAnticipoTouched(true);
    setForm({
      nombrePareja: lead.nombre_pareja,
      fechaTentativa: lead.fecha_tentativa ?? "",
      ciudad: lead.ciudad ?? "",
      presupuestoEstimado: formatInputCurrencyFromNumber(
        lead.presupuesto_estimado,
      ),
      cantidadInvitados:
        lead.cantidad_invitados === null ? "" : String(lead.cantidad_invitados),
      tipoCeremonia: lead.tipo_ceremonia ?? "",
      paisOrigenNovios: lead.pais_origen_novios ?? "",
      ciudadResidenciaActual: lead.ciudad_residencia_actual ?? "",
      conceptoBoda: lead.concepto_boda ?? "",
      prioridades: lead.prioridades ?? "",
      comoNosConocieron: lead.como_nos_conocieron ?? "",
      estadoSeguimiento: lead.estado_seguimiento,
      notas: lead.notas ?? "",
      honorariosAcordados: formatInputCurrencyFromNumber(
        lead.honorarios_acordados,
      ),
      anticipoAcordado: formatInputCurrencyFromNumber(lead.anticipo_acordado),
      lugarVenue: lead.lugar_venue ?? "",
      telefono: lead.telefono ?? "",
      email: lead.email ?? "",
    });
    setEditOpen(true);
  }

  function parseAcuerdosFields():
    | { honorarios: number | null; anticipo: number | null; lugarVenue: string | null }
    | { error: string } {
    const honorarios = form.honorariosAcordados.trim()
      ? parseInputCurrency(form.honorariosAcordados)
      : null;
    const anticipo = form.anticipoAcordado.trim()
      ? parseInputCurrency(form.anticipoAcordado)
      : null;
    const lugarVenue = form.lugarVenue.trim() || null;

    if (
      honorarios !== null &&
      (!Number.isFinite(honorarios) || honorarios < 0)
    ) {
      return { error: "Ingresa honorarios acordados válidos (>= 0)." };
    }
    if (anticipo !== null && (!Number.isFinite(anticipo) || anticipo < 0)) {
      return { error: "Ingresa un anticipo válido (>= 0)." };
    }

    return { honorarios, anticipo, lugarVenue };
  }

  async function handleCreate(e: React.FormEvent) {
    if (!hasPermission(role, "leads.create")) {
      setError("No tienes permisos para crear leads.");
      return;
    }
    e.preventDefault();
    setError(null);
    if (!supabase) return setError("Supabase no está configurado.");

    const nombrePareja = form.nombrePareja.trim();
    const email = form.email.trim();
    const telefono = form.telefono.trim();
    const fechaTentativa = form.fechaTentativa.trim() || null;
    const ciudad = form.ciudad?.trim() || null;
    const presupuesto = form.presupuestoEstimado.trim()
      ? parseInputCurrency(form.presupuestoEstimado)
      : null;
    const cantidadInvitados = form.cantidadInvitados.trim()
      ? Number(form.cantidadInvitados)
      : null;
    const tipoCeremonia = form.tipoCeremonia.trim();
    const paisOrigenNovios = form.paisOrigenNovios.trim();
    const ciudadResidenciaActual = form.ciudadResidenciaActual.trim();
    const conceptoBoda = form.conceptoBoda.trim();
    const prioridades = form.prioridades.trim();
    const comoNosConocieron = form.comoNosConocieron.trim();
    const notas = form.notas.trim();

    if (!nombrePareja) return setError("Ingresa el nombre de la pareja.");
    if (!email) return setError("Ingresa el email.");
    if (presupuesto !== null && (!Number.isFinite(presupuesto) || presupuesto < 0)) {
      return setError("Ingresa un presupuesto válido (>= 0).");
    }
    if (
      cantidadInvitados !== null &&
      (!Number.isFinite(cantidadInvitados) || cantidadInvitados < 0)
    ) {
      return setError("Ingresa una cantidad de invitados válida (>= 0).");
    }

    const acuerdos = canManageAcuerdos ? parseAcuerdosFields() : null;
    if (acuerdos && "error" in acuerdos) {
      return setError(acuerdos.error);
    }

    setSubmitting(true);
    try {
      const { data: nuevoLead, error: insertError } = await insertLeadRow(
        supabase,
        {
          nombre_pareja: nombrePareja,
          fecha_tentativa: fechaTentativa,
          ciudad,
          presupuesto_estimado: presupuesto,
          cantidad_invitados: cantidadInvitados,
          tipo_ceremonia: tipoCeremonia || null,
          pais_origen_novios: paisOrigenNovios || null,
          ciudad_residencia_actual: ciudadResidenciaActual || null,
          concepto_boda: conceptoBoda || null,
          prioridades: prioridades || null,
          como_nos_conocieron: comoNosConocieron || null,
          estado_seguimiento: form.estadoSeguimiento,
          notas: notas || null,
          telefono: telefono || null,
          email,
          ...(canManageAcuerdos && acuerdos && !("error" in acuerdos)
            ? {
                honorarios_acordados: acuerdos.honorarios,
                anticipo_acordado: acuerdos.anticipo,
                lugar_venue: acuerdos.lugarVenue,
              }
            : {}),
        },
      );
      if (insertError) return setError(insertError.message);

      await logAuditoria({
        accion: AUDITORIA_ACCIONES.LEAD_CREADO,
        entidad: "lead",
        entidadId: nuevoLead.id,
        detalle: ciudad
          ? `${nombrePareja} · ${ciudad}`
          : `${nombrePareja} · ${email}`,
      });

      setCreateOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabase || !editingLead) return setError("Supabase no está configurado.");

    const nombrePareja = form.nombrePareja.trim();
    const email = form.email.trim();
    const telefono = form.telefono.trim();
    const fechaTentativa = form.fechaTentativa.trim();
    const ciudad = form.ciudad.trim();
    const presupuesto = form.presupuestoEstimado.trim()
      ? parseInputCurrency(form.presupuestoEstimado)
      : null;
    const cantidadInvitados = form.cantidadInvitados.trim()
      ? Number(form.cantidadInvitados)
      : null;
    const comoNosConocieron = form.comoNosConocieron.trim();
    const notas = form.notas.trim();
    const tipoCeremonia = form.tipoCeremonia.trim();
    const paisOrigenNovios = form.paisOrigenNovios.trim();
    const ciudadResidenciaActual = form.ciudadResidenciaActual.trim();
    const conceptoBoda = form.conceptoBoda.trim();
    const prioridades = form.prioridades.trim();

    if (!nombrePareja) return setError("Ingresa el nombre de la pareja.");
    if (
      presupuesto !== null &&
      (!Number.isFinite(presupuesto) || presupuesto < 0)
    ) {
      return setError("Ingresa un presupuesto válido (>= 0).");
    }
    if (
      cantidadInvitados !== null &&
      (!Number.isFinite(cantidadInvitados) || cantidadInvitados < 0)
    ) {
      return setError("Ingresa una cantidad de invitados válida (>= 0).");
    }

    const acuerdos = canManageAcuerdos ? parseAcuerdosFields() : null;
    if (acuerdos && "error" in acuerdos) {
      return setError(acuerdos.error);
    }

    const extra: Record<string, unknown> = { nombre_pareja: nombrePareja };
    if (email) extra.email = email;
    if (telefono) extra.telefono = telefono;
    if (fechaTentativa) extra.fecha_tentativa = fechaTentativa;
    if (ciudad) extra.ciudad = ciudad;
    if (presupuesto !== null) extra.presupuesto_estimado = presupuesto;
    if (cantidadInvitados !== null) extra.cantidad_invitados = cantidadInvitados;
    if (comoNosConocieron) extra.como_nos_conocieron = comoNosConocieron;
    if (notas) extra.notas = notas;
    if (tipoCeremonia) extra.tipo_ceremonia = tipoCeremonia;
    if (paisOrigenNovios) extra.pais_origen_novios = paisOrigenNovios;
    if (ciudadResidenciaActual) {
      extra.ciudad_residencia_actual = ciudadResidenciaActual;
    }
    if (conceptoBoda) extra.concepto_boda = conceptoBoda;
    if (prioridades) extra.prioridades = prioridades;
    if (acuerdos && !("error" in acuerdos)) {
      if (acuerdos.honorarios !== null) {
        extra.honorarios_acordados = acuerdos.honorarios;
      }
      if (acuerdos.anticipo !== null) extra.anticipo_acordado = acuerdos.anticipo;
      if (acuerdos.lugarVenue) extra.lugar_venue = acuerdos.lugarVenue;
    }

    const estadoSeguimiento =
      form.estadoSeguimiento || editingLead.estado_seguimiento;

    setSubmitting(true);
    try {
      const { error: updateError } = await updateLeadSeguimiento(
        supabase,
        editingLead.id,
        estadoSeguimiento,
        extra,
      );
      if (updateError) return setError(updateError.message);
      setEditOpen(false);
      setEditingLead(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateCotizacion(lead: LeadRow) {
    setError(null);
    if (!supabase) return setError("Supabase no está configurado.");

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const result = await createCotizacionForLead(
        supabase,
        lead,
        user?.id ?? null,
      );

      if ("error" in result) {
        setError(result.error);
        return;
      }

      router.push(`/cotizaciones/${result.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDiscardConfirm() {
    if (!discardTarget || !supabase) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("leads")
        .update({ estado: "descartado" })
        .eq("id", discardTarget.id);
      if (updateError) return setError(updateError.message);

      await logAuditoria({
        accion: AUDITORIA_ACCIONES.LEAD_DESCARTADO,
        entidad: "lead",
        entidadId: discardTarget.id,
        detalle: `${discardTarget.nombre_pareja} · ${discardTarget.ciudad ?? ""}`,
      });

      setDiscardTarget(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReactivate(lead: LeadRow) {
    if (!supabase) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("leads")
        .update({ estado: "activo" })
        .eq("id", lead.id);
      if (updateError) return setError(updateError.message);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletePermanent() {
    if (!deleteTarget || !supabase) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from("leads")
        .delete()
        .eq("id", deleteTarget.id);
      if (deleteError) return setError(deleteError.message);
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function showConvertError(leadId: string, message: string) {
    setConvertErrorLeadId(leadId);
    setError(message);
    queueMicrotask(() => {
      errorBannerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }

  async function handleConvert(lead: LeadRow) {
    console.log(
      "[convert] lead:",
      lead.id,
      lead.nombre_pareja,
      lead.estado,
    );
    console.log(
      "[convert] fecha_tentativa:",
      lead.fecha_tentativa,
      "ciudad:",
      lead.ciudad,
    );

    setError(null);
    setConvertErrorLeadId(null);
    setDriveWarning(null);

    if (!hasPermission(role, "weddings.create")) {
      console.warn("[convert] blocked: missing weddings.create permission");
      showConvertError(lead.id, "No tienes permisos para crear bodas.");
      return;
    }
    if (!supabase) {
      console.warn("[convert] blocked: supabase not configured");
      showConvertError(lead.id, "Supabase no está configurado.");
      return;
    }

    const fechaTentativa = lead.fecha_tentativa?.trim() || null;
    const ciudad = lead.ciudad?.trim() || null;

    setSubmitting(true);
    try {
      console.log("[convert] inserting boda…", { fechaTentativa, ciudad });
      const { data: nuevaBoda, error: insertError } = await supabase
        .from("bodas")
        .insert({
          lead_id: lead.id,
          nombre_pareja: lead.nombre_pareja,
          fecha_boda: fechaTentativa,
          ciudad,
          num_invitados: lead.cantidad_invitados,
          telefono_novia: lead.telefono,
          email_novia: lead.email,
          total_proveedores: 0,
          proveedores_contratados: 0,
          honorarios: lead.honorarios_acordados,
          anticipo_honorarios: lead.anticipo_acordado,
          lugar_venue: lead.lugar_venue,
        })
        .select("id")
        .single();
      if (insertError) {
        console.error("[convert] insert boda failed:", insertError);
        showConvertError(lead.id, insertError.message);
        return;
      }
      console.log("[convert] boda created:", nuevaBoda.id);

      const leadNotas = lead.notas?.trim();
      if (leadNotas) {
        const { error: notaError } = await supabase.from("notas_boda").insert({
          boda_id: nuevaBoda.id,
          contenido: `📋 Notas del lead:\n${leadNotas}`,
          created_by: currentUserId,
          created_by_nombre: currentUserNombre.trim() || null,
        });
        if (notaError) {
          console.error("[convert] insert nota failed:", notaError);
          showConvertError(lead.id, notaError.message);
          return;
        }
      }

      // El cronograma necesita fecha de boda para calcular hitos; si no hay, se omite.
      if (fechaTentativa) {
        const cronogramaResult = await insertarCronograma(
          supabase,
          nuevaBoda.id,
          fechaTentativa,
        );
        if (!cronogramaResult.ok) {
          console.error(
            "[convert] cronograma failed:",
            cronogramaResult.message,
          );
          showConvertError(lead.id, cronogramaResult.message);
          return;
        }
      } else {
        console.log(
          "[convert] skipping cronograma: no fecha_tentativa on lead",
        );
      }

      const importResult = await importarCotizacionLeadABoda(
        supabase,
        lead.id,
        nuevaBoda.id,
      );
      if (!importResult.ok) {
        console.error("[convert] import cotizacion failed:", importResult.message);
        showConvertError(lead.id, importResult.message);
        return;
      }

      // Wedding planner propio: siempre en la boda al convertir el lead.
      const { data: existingCelestia, error: celestiaCheckError } = await supabase
        .from("proveedores")
        .select("id")
        .eq("boda_id", nuevaBoda.id)
        .ilike("nombre", "CELESTIA EVENTS")
        .limit(1)
        .maybeSingle();
      if (celestiaCheckError) {
        console.error(
          "[convert] check CELESTIA EVENTS failed:",
          celestiaCheckError,
        );
        showConvertError(lead.id, celestiaCheckError.message);
        return;
      }
      if (!existingCelestia) {
        const { error: celestiaInsertError } = await supabase
          .from("proveedores")
          .insert({
            boda_id: nuevaBoda.id,
            nombre: "CELESTIA EVENTS",
            categoria: "Wedding Planner",
            estado: "en_negociacion",
            sin_costo: false,
          });
        if (celestiaInsertError) {
          console.error(
            "[convert] insert CELESTIA EVENTS failed:",
            celestiaInsertError,
          );
          showConvertError(lead.id, celestiaInsertError.message);
          return;
        }
        console.log("[convert] CELESTIA EVENTS provider created");
      } else {
        console.log(
          "[convert] CELESTIA EVENTS already exists, skipping insert",
        );
      }

      await logAuditoria({
        accion: AUDITORIA_ACCIONES.LEAD_CONVERTIDO,
        entidad: "lead",
        entidadId: lead.id,
        bodaNombre: lead.nombre_pareja,
        detalle: `Nueva boda: ${lead.nombre_pareja}`,
      });

      const driveResult = await ensureBodaDriveFolder(nuevaBoda.id);
      if (!driveResult.ok) {
        console.warn("[convert] drive folder warning:", driveResult);
        setDriveWarning(DRIVE_FOLDER_CREATE_WARNING);
      }

      const sugerencias = await fetchSugerenciasBodasSimilares(supabase, lead);
      const items = sugerenciasBodasSimilaresToInsertItems(sugerencias);

      if (items.length > 0) {
        console.log("[convert] showing IA suggestions prompt", {
          count: items.length,
        });
        setIaPrompt({
          bodaId: nuevaBoda.id,
          leadNombre: lead.nombre_pareja,
          items,
        });
        return;
      }

      console.log("[convert] done, refreshing");
      router.refresh();
    } catch (err) {
      console.error("[convert] unexpected error:", err);
      showConvertError(
        lead.id,
        err instanceof Error
          ? err.message
          : "No se pudo convertir el lead a boda.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmIaSuggestions() {
    if (!iaPrompt || !supabase) return;
    setIaSubmitting(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: insertError } = await supabase
        .from("proveedores_sugeridos")
        .insert(
          iaPrompt.items.map((item) => ({
            boda_id: iaPrompt.bodaId,
            directorio_proveedor_id: item.directorio_proveedor_id,
            nombre_proveedor: item.nombre_proveedor,
            categoria: item.categoria,
            instagram: item.instagram,
            ronda: 1,
            orden: item.orden,
            sugerido_por_ia: true,
            created_by: user?.id ?? null,
          })),
        );

      if (insertError) {
        setError(insertError.message);
        return;
      }

      await logAuditoria({
        accion: AUDITORIA_ACCIONES.PROVEEDOR_SUGERIDO_AGREGADO,
        entidad: "proveedor_sugerido",
        bodaNombre: iaPrompt.leadNombre,
        detalle: `Sugerencias inteligentes por bodas similares · ${iaPrompt.items.length} proveedores`,
      });

      setIaPrompt(null);
      router.refresh();
    } finally {
      setIaSubmitting(false);
    }
  }

  function handleDismissIaSuggestions() {
    setIaPrompt(null);
    router.refresh();
  }

  return (
    <section className="mt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-3xl text-bloom-ink">Leads</h2>
          <p className="mt-1 text-bloom-muted">
            {sortedActiveLeads.length}{" "}
            {sortedActiveLeads.length === 1 ? "lead activo" : "leads activos"}
            {sortedDiscardedLeads.length > 0 &&
              ` · ${sortedDiscardedLeads.length} descartado${sortedDiscardedLeads.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {hasPermission(role, "leads.create") && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-bloom-accent px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover"
          >
            Nuevo lead
          </button>
        )}
      </div>

      {error && (
        <p
          ref={errorBannerRef}
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}

      {driveWarning && (
        <p
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
          role="status"
        >
          {driveWarning}
        </p>
      )}

      {sortedActiveLeads.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-bloom-border bg-bloom-surface px-5 py-10 text-center text-sm text-bloom-muted">
          No hay leads activos.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {sortedActiveLeads.map((lead) => (
            <li
              key={lead.id}
              className="rounded-2xl border border-bloom-border bg-bloom-surface p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-medium text-bloom-ink transition-colors hover:text-bloom-accent"
                    >
                      {lead.nombre_pareja}
                    </Link>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${LEAD_SEGUIMIENTO_STYLES[lead.estado_seguimiento]}`}
                    >
                      {LEAD_SEGUIMIENTO_LABELS[lead.estado_seguimiento]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-bloom-muted">
                    {formatLeadMeta(lead)}
                  </p>
                  {(lead.telefono || lead.email) && (
                    <p className="mt-1 text-sm text-bloom-muted">
                      {lead.telefono && (
                        <span>
                          Tel:{" "}
                          <a
                            href={`tel:${lead.telefono}`}
                            className="text-bloom-ink hover:text-bloom-accent"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {lead.telefono}
                          </a>
                        </span>
                      )}
                      {lead.telefono && lead.email && " · "}
                      {lead.email && (
                        <span>
                          Email:{" "}
                          <a
                            href={`mailto:${lead.email}`}
                            className="text-bloom-ink hover:text-bloom-accent"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {lead.email}
                          </a>
                        </span>
                      )}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-bloom-ink">
                    Presupuesto:{" "}
                    {lead.presupuesto_estimado === null
                      ? "No definido"
                      : formatCurrency(lead.presupuesto_estimado)}
                  </p>
                  {lead.notas && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-bloom-muted">
                      {lead.notas}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 border-t border-bloom-border/70 pt-3">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="rounded-full border border-bloom-border bg-bloom-canvas px-4 py-2 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
                  >
                    Ver cotizaciones
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleCreateCotizacion(lead)}
                    disabled={submitting}
                    className="rounded-full border border-green-500 bg-green-50 px-4 py-2 text-xs font-medium text-green-800 transition-colors hover:bg-green-100 disabled:opacity-60"
                  >
                    Crear cotización
                  </button>
                  <LeadAgendarReunionButton
                    lead={lead}
                    role={role}
                    currentUserId={currentUserId}
                    currentUserNombre={currentUserNombre}
                  />
                  <button
                    type="button"
                    onClick={() => openEditModal(lead)}
                    disabled={submitting}
                    className="rounded-full border border-bloom-border bg-bloom-canvas px-4 py-2 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
                  >
                    Editar
                  </button>
                  {hasPermission(role, "weddings.create") && (
                    <button
                      type="button"
                      onClick={() => void handleConvert(lead)}
                      disabled={submitting}
                      className="rounded-full bg-bloom-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
                    >
                      Convertir a boda
                    </button>
                  )}
                  {canManageLeads ? (
                    <button
                      type="button"
                      onClick={() => setDiscardTarget(lead)}
                      disabled={submitting}
                      className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-800 transition-colors hover:bg-red-100 disabled:opacity-60"
                    >
                      Descartar lead
                    </button>
                  ) : null}
                </div>
                {convertErrorLeadId === lead.id && error ? (
                  <p
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
              {(lead.cantidad_invitados !== null ||
                lead.tipo_ceremonia ||
                lead.pais_origen_novios ||
                lead.ciudad_residencia_actual ||
                lead.concepto_boda ||
                lead.prioridades) && (
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  {lead.cantidad_invitados !== null && (
                    <div>
                      <dt className="text-bloom-muted">Invitados</dt>
                      <dd className="font-medium text-bloom-ink">
                        {lead.cantidad_invitados}
                      </dd>
                    </div>
                  )}
                  {lead.tipo_ceremonia && (
                    <div>
                      <dt className="text-bloom-muted">Tipo de ceremonia</dt>
                      <dd className="font-medium text-bloom-ink">
                        {lead.tipo_ceremonia}
                      </dd>
                    </div>
                  )}
                  {lead.pais_origen_novios && (
                    <div>
                      <dt className="text-bloom-muted">País de origen</dt>
                      <dd className="font-medium text-bloom-ink">
                        {lead.pais_origen_novios}
                      </dd>
                    </div>
                  )}
                  {lead.ciudad_residencia_actual && (
                    <div>
                      <dt className="text-bloom-muted">Ciudad residencia actual</dt>
                      <dd className="font-medium text-bloom-ink">
                        {lead.ciudad_residencia_actual}
                      </dd>
                    </div>
                  )}
                  {lead.concepto_boda && (
                    <div className="sm:col-span-2">
                      <dt className="text-bloom-muted">Concepto de la boda</dt>
                      <dd className="whitespace-pre-wrap text-bloom-ink">
                        {lead.concepto_boda}
                      </dd>
                    </div>
                  )}
                  {lead.prioridades && (
                    <div className="sm:col-span-2">
                      <dt className="text-bloom-muted">Prioridades</dt>
                      <dd className="whitespace-pre-wrap text-bloom-ink">
                        {lead.prioridades}
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </li>
          ))}
        </ul>
      )}

      {sortedDiscardedLeads.length > 0 && (
        <div className="mt-8 border-t border-bloom-border pt-6">
          <button
            type="button"
            onClick={() => setDiscardedOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-bloom-border bg-bloom-canvas/80 px-4 py-3 text-left transition-colors hover:bg-bloom-canvas"
            aria-expanded={discardedOpen}
          >
            <span className="font-medium text-bloom-ink">
              Descartados ({sortedDiscardedLeads.length})
            </span>
            <span className="text-sm text-bloom-muted">
              {discardedOpen ? "Ocultar" : "Mostrar"}
            </span>
          </button>

          {discardedOpen && (
            <ul className="mt-3 space-y-3">
              {sortedDiscardedLeads.map((lead) => (
                <li
                  key={lead.id}
                  className="rounded-2xl border border-bloom-border/80 bg-bloom-canvas/50 p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-bloom-ink">
                        {lead.nombre_pareja}
                      </p>
                      <p className="mt-1 text-sm text-bloom-muted">
                        {formatLeadMeta(lead)}
                      </p>
                      <p className="mt-1 text-xs text-bloom-muted">
                        {LEAD_SEGUIMIENTO_LABELS[lead.estado_seguimiento]}
                      </p>
                    </div>
                    {canManageLeads && (
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleReactivate(lead)}
                          disabled={submitting}
                          className="rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas disabled:opacity-60"
                        >
                          Reactivar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(lead)}
                          disabled={submitting}
                          className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-800 transition-colors hover:bg-red-100 disabled:opacity-60"
                        >
                          Eliminar permanentemente
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {discardTarget && (
        <ConfirmModal
          title="¿Descartar este lead?"
          description="Esto indica que no contratará con Celestia."
          confirmLabel="Sí, descartar"
          busy={submitting}
          onCancel={() => setDiscardTarget(null)}
          onConfirm={handleDiscardConfirm}
        />
      )}

      {iaPrompt && (
        <IaSuggestionsModal
          count={iaPrompt.items.length}
          busy={iaSubmitting}
          onNo={handleDismissIaSuggestions}
          onYes={handleConfirmIaSuggestions}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="¿Eliminar este lead permanentemente?"
          description="Se borrarán también sus cotizaciones y citas vinculadas. Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          confirmDanger
          busy={submitting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeletePermanent}
        />
      )}

      {createOpen && (
        <ModalShell
          title="Nuevo lead"
          subtitle="Solo necesitas el nombre y el email para empezar"
          onClose={() => setCreateOpen(false)}
        >
          <form className="mt-4 flex min-h-0 flex-1 flex-col" onSubmit={handleCreate}>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
              <LeadCreateFields
                form={form}
                setForm={setForm}
                submitting={submitting}
                fechaConflicto={fechaConflicto}
                canManageAcuerdos={canManageAcuerdos}
                anticipoTouched={anticipoTouched}
                onAnticipoTouched={() => setAnticipoTouched(true)}
                onHonorariosChange={(value) => {
                  if (anticipoTouched) return;
                  if (!value.trim()) {
                    setForm((s) => ({ ...s, anticipoAcordado: "" }));
                    return;
                  }
                  const honorarios = parseInputCurrency(value);
                  if (!Number.isFinite(honorarios) || honorarios < 0) {
                    setForm((s) => ({ ...s, anticipoAcordado: "" }));
                    return;
                  }
                  setForm((s) => ({
                    ...s,
                    anticipoAcordado: formatInputCurrencyFromNumber(
                      Math.round(honorarios * 0.5),
                    ),
                  }));
                }}
              />
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            <ActionRow
              submitting={submitting}
              onCancel={() => setCreateOpen(false)}
              submitLabel="Guardar lead"
            />
          </form>
        </ModalShell>
      )}

      {editOpen && (
        <ModalShell
          title="Editar lead"
          subtitle="Actualiza la información del lead"
          onClose={() => setEditOpen(false)}
        >
          <form className="mt-4 flex min-h-0 flex-1 flex-col" onSubmit={handleEdit}>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
              <LeadEditFields
                form={form}
                setForm={setForm}
                submitting={submitting}
                fechaConflicto={fechaConflicto}
                canManageAcuerdos={canManageAcuerdos}
                anticipoTouched={anticipoTouched}
                onAnticipoTouched={() => setAnticipoTouched(true)}
                onHonorariosChange={(value) => {
                  if (anticipoTouched) return;
                  if (!value.trim()) {
                    setForm((s) => ({ ...s, anticipoAcordado: "" }));
                    return;
                  }
                  const honorarios = parseInputCurrency(value);
                  if (!Number.isFinite(honorarios) || honorarios < 0) {
                    setForm((s) => ({ ...s, anticipoAcordado: "" }));
                    return;
                  }
                  setForm((s) => ({
                    ...s,
                    anticipoAcordado: formatInputCurrencyFromNumber(
                      Math.round(honorarios * 0.5),
                    ),
                  }));
                }}
              />
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            <ActionRow
              submitting={submitting}
              onCancel={() => setEditOpen(false)}
              submitLabel="Guardar cambios"
            />
          </form>
        </ModalShell>
      )}
    </section>
  );
}


function formatLeadMeta(
  lead: Pick<LeadRow, "ciudad" | "fecha_tentativa">,
): string {
  const parts: string[] = [];
  const ciudad = lead.ciudad?.trim();
  if (ciudad) parts.push(ciudad);
  if (lead.fecha_tentativa) {
    parts.push(formatShortDateStable(lead.fecha_tentativa));
  }
  return parts.length > 0 ? parts.join(" · ") : "Sin fecha ni ciudad";
}


function ConfirmModal({
  title,
  description,
  confirmLabel,
  confirmDanger = false,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmDanger?: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="alertdialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-xl">
        <h3 className="font-display text-lg text-bloom-ink">{title}</h3>
        <p className="mt-2 text-sm text-bloom-muted">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-bloom-border px-4 py-2 text-sm font-medium text-bloom-ink disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
              confirmDanger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-bloom-accent hover:bg-bloom-accent-hover"
            }`}
          >
            {busy ? "Procesando…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function IaSuggestionsModal({
  count,
  busy,
  onNo,
  onYes,
}: {
  count: number;
  busy: boolean;
  onNo: () => void;
  onYes: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="alertdialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onNo();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-xl">
        <h3 className="font-display text-lg text-bloom-ink">
          Sugerencias inteligentes disponibles
        </h3>
        <p className="mt-2 text-sm text-bloom-muted">
          ¿Quieres agregar las sugerencias inteligentes al módulo de Proveedores
          Sugeridos de esta boda?
        </p>
        <p className="mt-2 text-xs text-bloom-muted">
          {count} {count === 1 ? "proveedor sugerido" : "proveedores sugeridos"}{" "}
          a partir de bodas similares.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onNo}
            disabled={busy}
            className="rounded-full border border-bloom-border px-4 py-2 text-sm font-medium text-bloom-ink disabled:opacity-60"
          >
            No
          </button>
          <button
            type="button"
            onClick={onYes}
            disabled={busy}
            className="rounded-full bg-bloom-accent px-4 py-2 text-sm font-medium text-white hover:bg-bloom-accent-hover disabled:opacity-60"
          >
            {busy ? "Agregando…" : "Sí, agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex min-h-0 max-h-[100dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-bloom-border bg-bloom-surface shadow-lg sm:max-h-[90vh] sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 px-4 pt-4 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            <h3 className="font-display text-xl text-bloom-ink break-words">
              {title}
            </h3>
            <p className="mt-1 text-sm text-bloom-muted">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-bloom-muted transition-colors hover:bg-bloom-border hover:text-bloom-ink"
            aria-label="Cerrar"
          >
            <XIcon />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function ActionRow({
  submitting,
  onCancel,
  submitLabel,
}: {
  submitting: boolean;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="mt-3 flex shrink-0 flex-col-reverse gap-2 border-t border-bloom-border bg-bloom-surface pt-3 sm:flex-row sm:justify-end">
      <button
        type="button"
        className="w-full rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60 sm:w-auto"
        onClick={onCancel}
        disabled={submitting}
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover disabled:opacity-60 sm:w-auto"
      >
        {submitting ? "Guardando..." : submitLabel}
      </button>
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
