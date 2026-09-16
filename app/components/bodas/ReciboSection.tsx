"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContratoFirmante } from "@/app/data/contratos";
import { MEDIOS_PAGO, type MedioPago } from "@/app/data/pagos";
import {
  parseMetodoPagoForForm,
  RECIBO_ESTADO_LABELS,
  RECIBO_ESTADO_STYLES,
  resolveMetodoPagoToStore,
  type ReciboEstado,
  type ReciboPagoRow,
} from "@/app/data/recibos";
import type { BodaRow } from "@/app/data/weddings";
import { EmailShareModal } from "@/app/components/ui/EmailShareModal";
import { WhatsAppLocaleToggle } from "@/app/components/ui/WhatsAppLocaleToggle";
import { AUDITORIA_ACCIONES, logAuditoria } from "@/lib/auditoria";
import { downloadContratoFile } from "@/lib/download-contrato-docx";
import {
  formatCurrency,
  formatInputCurrency,
  formatInputCurrencyFromNumber,
  formatShortDate,
  parseInputCurrency,
} from "@/lib/format";
import {
  buildReciboClienteDefaults,
  reciboDocumentDataFromRow,
  type ReciboClienteSnapshot,
} from "@/lib/recibo-celestia-template";
import {
  buildReciboShareEmailMessage,
  buildReciboShareEmailSubject,
  buildReciboShareMessage,
  getReciboRecipientEmail,
  openReciboShareWhatsApp,
} from "@/lib/recibo-share";
import { supabase } from "@/lib/supabase";
import type { WhatsAppLocale } from "@/lib/whatsapp-locale";

type ReciboSectionProps = {
  embedded?: boolean;
  bodaId: string;
  boda: Pick<
    BodaRow,
    | "nombre_pareja"
    | "nombre_novia"
    | "nombre_novio"
    | "tipo_documento_novia"
    | "tipo_documento_novio"
    | "documento_novia"
    | "documento_novio"
    | "ciudad"
    | "fecha_boda"
    | "direccion"
    | "telefono_novia"
    | "telefono_novio"
    | "email_novia"
    | "email_novio"
    | "whatsapp_grupo_link"
  >;
  initialRecibos: ReciboPagoRow[];
  currentUserNombre: string;
  defaultFirmante?: ContratoFirmante;
};

type FormState = {
  fecha: string;
  metodoPago: MedioPago;
  metodoPagoOtro: string;
  cuenta: string;
  concepto: string;
  valor: string;
  estado: ReciboEstado;
  firmanteDefault: ContratoFirmante;
  cliente: ReciboClienteSnapshot;
};

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildNewForm(
  boda: ReciboSectionProps["boda"],
  firmante: ContratoFirmante,
): FormState {
  return {
    fecha: todayIsoDate(),
    metodoPago: "Transferencia Colombia",
    metodoPagoOtro: "",
    cuenta: "",
    concepto: "",
    valor: "",
    estado: "borrador",
    firmanteDefault: firmante,
    cliente: buildReciboClienteDefaults(boda, firmante),
  };
}

function buildFormFromRow(
  row: ReciboPagoRow,
  firmante: ContratoFirmante,
): FormState {
  const parsed = parseMetodoPagoForForm(row.metodo_pago);
  return {
    fecha: row.fecha,
    metodoPago: parsed.metodoPago,
    metodoPagoOtro: parsed.metodoPagoOtro,
    cuenta: row.cuenta ?? "",
    concepto: row.concepto,
    valor: formatInputCurrencyFromNumber(row.valor),
    estado: row.estado,
    firmanteDefault: firmante,
    cliente: {
      nombre: row.cliente_nombre,
      direccion: row.cliente_direccion ?? "",
      ciudad: row.cliente_ciudad ?? "",
      telefono: row.cliente_telefono ?? "",
      documento: row.cliente_documento ?? "",
    },
  };
}

function sortRecibos(list: ReciboPagoRow[]): ReciboPagoRow[] {
  return [...list].sort((a, b) => {
    const byFecha = b.fecha.localeCompare(a.fecha);
    if (byFecha !== 0) return byFecha;
    return b.created_at.localeCompare(a.created_at);
  });
}

export function ReciboSection({
  embedded = false,
  bodaId,
  boda,
  initialRecibos,
  currentUserNombre,
  defaultFirmante = "novia",
}: ReciboSectionProps) {
  const router = useRouter();
  const [recibos, setRecibos] = useState(() => sortRecibos(initialRecibos));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() =>
    buildNewForm(boda, defaultFirmante),
  );
  const [saving, setSaving] = useState(false);
  const [generatingFormat, setGeneratingFormat] = useState<
    "word" | "pdf" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [shareWarning, setShareWarning] = useState<string | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [whatsappLocale, setWhatsappLocale] = useState<WhatsAppLocale>("es");

  const valorNum = form.valor.trim() ? parseInputCurrency(form.valor) : null;
  const total = valorNum;
  const generating = generatingFormat !== null;

  const shareBoda = useMemo(
    () => ({
      nombre_pareja: boda.nombre_pareja,
      fecha_boda: boda.fecha_boda,
      ciudad: form.cliente.ciudad?.trim() || boda.ciudad,
      telefono_novia: boda.telefono_novia,
      email_novia: boda.email_novia,
      email_novio: boda.email_novio,
      whatsapp_grupo_link: boda.whatsapp_grupo_link,
    }),
    [boda, form.cliente.ciudad],
  );

  const shareOpts = useMemo(
    () => ({
      concepto: form.concepto,
      total: total ?? 0,
    }),
    [form.concepto, total],
  );

  const reciboShareMessage = useMemo(
    () => buildReciboShareMessage(shareBoda, shareOpts, whatsappLocale),
    [shareBoda, shareOpts, whatsappLocale],
  );

  const reciboEmailMessage = useMemo(
    () => buildReciboShareEmailMessage(shareBoda, shareOpts),
    [shareBoda, shareOpts],
  );

  const reciboEmailSubject = useMemo(
    () => buildReciboShareEmailSubject(boda.nombre_pareja),
    [boda.nombre_pareja],
  );

  const recipientEmail = useMemo(
    () =>
      getReciboRecipientEmail(
        shareBoda,
        form.firmanteDefault === "novio",
      ),
    [shareBoda, form.firmanteDefault],
  );

  const showShareActions = editingId !== null || recibos.length > 0;

  function handleNewRecibo() {
    setEditingId(null);
    setForm(buildNewForm(boda, defaultFirmante));
    setError(null);
    setSuccess(null);
    setShareWarning(null);
  }

  function handleSelectRecibo(row: ReciboPagoRow) {
    setEditingId(row.id);
    setForm(buildFormFromRow(row, defaultFirmante));
    setError(null);
    setSuccess(null);
    setShareWarning(null);
  }

  function applyFirmanteDefaults(firmante: ContratoFirmante) {
    setForm((s) => ({
      ...s,
      firmanteDefault: firmante,
      cliente: buildReciboClienteDefaults(boda, firmante),
    }));
  }

  function parseForm():
    | {
        fecha: string;
        metodoPago: string;
        cuenta: string | null;
        concepto: string;
        valor: number;
        total: number;
        estado: ReciboEstado;
        cliente: ReciboClienteSnapshot;
        createdBy: string;
      }
    | { error: string } {
    const fecha = form.fecha.trim();
    if (!fecha) return { error: "Indica la fecha del recibo." };

    const concepto = form.concepto.trim();
    if (!concepto) return { error: "Indica el concepto del recibo." };

    if (valorNum === null || !Number.isFinite(valorNum) || valorNum <= 0) {
      return { error: "Ingresa un valor válido mayor a 0." };
    }

    const clienteNombre = form.cliente.nombre.trim();
    if (!clienteNombre) {
      return { error: "Indica el nombre del señor(es) / cliente." };
    }

    if (form.metodoPago === "Otro" && !form.metodoPagoOtro.trim()) {
      return { error: "Describe el método de pago en \"Otro\"." };
    }

    return {
      fecha,
      metodoPago: resolveMetodoPagoToStore(
        form.metodoPago,
        form.metodoPagoOtro,
      ),
      cuenta: form.cuenta.trim() || null,
      concepto,
      valor: valorNum,
      total: valorNum,
      estado: form.estado,
      cliente: {
        nombre: clienteNombre,
        direccion: form.cliente.direccion.trim(),
        ciudad: form.cliente.ciudad.trim(),
        telefono: form.cliente.telefono.trim(),
        documento: form.cliente.documento.trim(),
      },
      createdBy: currentUserNombre.trim() || "Equipo Celestia",
    };
  }

  async function saveChanges(
    nextEstado: ReciboEstado = form.estado,
  ): Promise<ReciboPagoRow | null> {
    setError(null);
    setSuccess(null);
    if (!supabase) {
      setError("Supabase no está configurado.");
      return null;
    }

    const parsed = parseForm();
    if ("error" in parsed) {
      setError(parsed.error);
      return null;
    }

    setSaving(true);
    try {
      const payload = {
        boda_id: bodaId,
        fecha: parsed.fecha,
        metodo_pago: parsed.metodoPago,
        cuenta: parsed.cuenta,
        concepto: parsed.concepto,
        valor: parsed.valor,
        total: parsed.total,
        estado: nextEstado,
        created_by: parsed.createdBy,
        cliente_nombre: parsed.cliente.nombre,
        cliente_direccion: parsed.cliente.direccion || null,
        cliente_ciudad: parsed.cliente.ciudad || null,
        cliente_telefono: parsed.cliente.telefono || null,
        cliente_documento: parsed.cliente.documento || null,
      };

      if (editingId) {
        const { data, error: updateError } = await supabase
          .from("recibos_pago")
          .update(payload)
          .eq("id", editingId)
          .select("*")
          .single();
        if (updateError) {
          setError(updateError.message);
          return null;
        }
        const row = data as ReciboPagoRow;
        setRecibos((prev) =>
          sortRecibos(prev.map((item) => (item.id === row.id ? row : item))),
        );
        setForm((s) => ({ ...s, estado: nextEstado }));
        setSuccess("Recibo guardado.");
        router.refresh();
        return row;
      }

      const { data, error: insertError } = await supabase
        .from("recibos_pago")
        .insert(payload)
        .select("*")
        .single();
      if (insertError) {
        setError(insertError.message);
        return null;
      }
      const row = data as ReciboPagoRow;
      setEditingId(row.id);
      setRecibos((prev) => sortRecibos([row, ...prev]));
      setForm((s) => ({ ...s, estado: nextEstado }));
      setSuccess("Recibo creado.");
      router.refresh();
      return row;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveChanges(e: React.FormEvent) {
    e.preventDefault();
    await saveChanges();
  }

  async function handleEstadoChange(nextEstado: ReciboEstado) {
    if (nextEstado === form.estado) return;
    setForm((s) => ({ ...s, estado: nextEstado }));
    await saveChanges(nextEstado);
  }

  async function downloadFromData(
    documentData: ReturnType<typeof reciboDocumentDataFromRow>,
    format: "word" | "pdf",
    reciboId: string | null,
  ) {
    const endpoint =
      format === "pdf" ? "/api/recibo/generar-pdf" : "/api/recibo/generar";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(documentData),
    });

    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(
        errorPayload?.error ??
          (format === "pdf"
            ? "No se pudo generar el recibo en PDF."
            : "No se pudo generar el recibo."),
      );
    }

    const blob = await response.blob();
    const defaultExtension = format === "pdf" ? ".pdf" : ".docx";
    const filename =
      response.headers.get("X-Filename") ??
      `Recibo de pago - ${boda.nombre_pareja}${defaultExtension}`;
    downloadContratoFile(blob, filename);

    await logAuditoria({
      accion: AUDITORIA_ACCIONES.RECIBO_GENERADO,
      entidad: "recibo_pago",
      entidadId: reciboId ?? bodaId,
      bodaNombre: boda.nombre_pareja,
      detalle: `${documentData.cliente.nombre} · ${documentData.concepto} · ${formatCurrency(documentData.total)} · ${format.toUpperCase()}`,
    });
  }

  async function handleDownload(format: "word" | "pdf") {
    setError(null);
    setSuccess(null);
    setGeneratingFormat(format);
    try {
      const saved = await saveChanges();
      if (!saved) return;
      const documentData = reciboDocumentDataFromRow(saved, boda.nombre_pareja);
      await downloadFromData(documentData, format, saved.id);
      setSuccess(
        format === "pdf"
          ? "Recibo PDF generado y descargado."
          : "Recibo Word generado y descargado.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo generar el recibo.",
      );
    } finally {
      setGeneratingFormat(null);
    }
  }

  async function handleRedownload(row: ReciboPagoRow, format: "word" | "pdf") {
    setError(null);
    setSuccess(null);
    setGeneratingFormat(format);
    try {
      const documentData = reciboDocumentDataFromRow(row, boda.nombre_pareja);
      await downloadFromData(documentData, format, row.id);
      setSuccess(
        format === "pdf"
          ? "Recibo PDF descargado."
          : "Recibo Word descargado.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo generar el recibo.",
      );
    } finally {
      setGeneratingFormat(null);
    }
  }

  function handleShareWhatsApp() {
    setShareWarning(null);
    const opened = openReciboShareWhatsApp(shareBoda, reciboShareMessage);
    if (!opened) {
      setShareWarning(
        "No hay grupo de WhatsApp ni teléfono de la novia registrado. Agrégalos en información del cliente.",
      );
    }
  }

  function handleShareEmail() {
    setShareWarning(null);
    if (!recipientEmail) {
      setShareWarning(
        "No hay email del cliente registrado. Agrégalo en información del cliente.",
      );
      return;
    }
    setEmailModalOpen(true);
  }

  const shellClass = embedded
    ? ""
    : "rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-sm";
  const Shell = embedded ? "div" : "section";

  return (
    <Shell className={shellClass}>
      {!embedded && (
        <div className="mb-4">
          <h2 className="font-display text-xl text-bloom-ink">
            Recibos de pago
          </h2>
          <p className="mt-1 text-sm text-bloom-muted">
            Historial de recibos generados para esta boda
          </p>
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {success}
        </p>
      )}

      {recibos.length > 0 ? (
        <div className="mb-5 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-bloom-muted">
            Historial
          </p>
          <ul className="divide-y divide-bloom-border/70 overflow-hidden rounded-xl border border-bloom-border">
            {recibos.map((row) => {
              const selected = editingId === row.id;
              return (
                <li
                  key={row.id}
                  className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                    selected ? "bg-bloom-canvas" : "bg-bloom-surface"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectRecibo(row)}
                    className="min-w-0 flex-1 text-left"
                    disabled={saving || generating}
                  >
                    <p className="truncate text-sm font-medium text-bloom-ink">
                      {row.concepto}
                    </p>
                    <p className="mt-0.5 text-xs text-bloom-muted">
                      {formatShortDate(row.fecha)} ·{" "}
                      {formatCurrency(Number(row.total))} ·{" "}
                      {RECIBO_ESTADO_LABELS[row.estado]}
                    </p>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleRedownload(row, "word")}
                      disabled={saving || generating}
                      className="rounded-full border border-bloom-border px-3 py-1.5 text-xs font-medium text-bloom-ink hover:bg-bloom-border disabled:opacity-60"
                    >
                      Word
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRedownload(row, "pdf")}
                      disabled={saving || generating}
                      className="rounded-full border border-bloom-border px-3 py-1.5 text-xs font-medium text-bloom-ink hover:bg-bloom-border disabled:opacity-60"
                    >
                      PDF
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="mb-5 text-sm text-bloom-muted">
          Aún no hay recibos para esta boda. Completa el formulario para crear el
          primero.
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-bloom-ink">
          {editingId ? "Editar recibo" : "Nuevo recibo"}
        </p>
        {editingId ? (
          <button
            type="button"
            onClick={handleNewRecibo}
            disabled={saving || generating}
            className="text-sm font-medium text-bloom-accent hover:underline disabled:opacity-60"
          >
            + Crear otro recibo
          </button>
        ) : null}
      </div>

      <form className="space-y-4" onSubmit={handleSaveChanges}>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${RECIBO_ESTADO_STYLES[form.estado]}`}
          >
            {RECIBO_ESTADO_LABELS[form.estado]}
          </span>
        </div>

        <Field label="Prefill desde (novia / novio)">
          <select
            className={inputClass}
            value={form.firmanteDefault}
            onChange={(e) =>
              applyFirmanteDefaults(e.target.value as ContratoFirmante)
            }
            disabled={saving || generating}
          >
            <option value="novia">Novia</option>
            <option value="novio">Novio</option>
          </select>
          <p className="text-xs text-bloom-muted">
            Rellena los datos del cliente abajo. Puedes editarlos libremente
            antes de guardar (el recibo guarda un snapshot).
          </p>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="SEÑOR(ES)">
            <input
              className={inputClass}
              value={form.cliente.nombre}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  cliente: { ...s.cliente, nombre: e.target.value },
                }))
              }
              disabled={saving || generating}
            />
          </Field>
          <Field label="DOCUMENTO">
            <input
              className={inputClass}
              value={form.cliente.documento}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  cliente: { ...s.cliente, documento: e.target.value },
                }))
              }
              disabled={saving || generating}
            />
          </Field>
          <Field label="DIRECCIÓN">
            <input
              className={inputClass}
              value={form.cliente.direccion}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  cliente: { ...s.cliente, direccion: e.target.value },
                }))
              }
              disabled={saving || generating}
            />
          </Field>
          <Field label="CIUDAD">
            <input
              className={inputClass}
              value={form.cliente.ciudad}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  cliente: { ...s.cliente, ciudad: e.target.value },
                }))
              }
              disabled={saving || generating}
            />
          </Field>
          <Field label="TELÉFONO">
            <input
              className={inputClass}
              value={form.cliente.telefono}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  cliente: { ...s.cliente, telefono: e.target.value },
                }))
              }
              disabled={saving || generating}
            />
          </Field>
          <Field label="FECHA">
            <input
              type="date"
              className={inputClass}
              value={form.fecha}
              onChange={(e) =>
                setForm((s) => ({ ...s, fecha: e.target.value }))
              }
              disabled={saving || generating}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Método de pago">
            <select
              className={inputClass}
              value={form.metodoPago}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  metodoPago: e.target.value as MedioPago,
                }))
              }
              disabled={saving || generating}
            >
              {MEDIOS_PAGO.map((medio) => (
                <option key={medio} value={medio}>
                  {medio}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cuenta">
            <input
              className={inputClass}
              value={form.cuenta}
              onChange={(e) =>
                setForm((s) => ({ ...s, cuenta: e.target.value }))
              }
              disabled={saving || generating}
              placeholder="Ej. Bancolombia"
            />
          </Field>
        </div>

        {form.metodoPago === "Otro" ? (
          <Field label="Método de pago (otro)">
            <input
              className={inputClass}
              value={form.metodoPagoOtro}
              onChange={(e) =>
                setForm((s) => ({ ...s, metodoPagoOtro: e.target.value }))
              }
              disabled={saving || generating}
              placeholder="Describe el método"
            />
          </Field>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Concepto">
            <input
              className={inputClass}
              value={form.concepto}
              onChange={(e) =>
                setForm((s) => ({ ...s, concepto: e.target.value }))
              }
              disabled={saving || generating}
              placeholder="Ej. 50% Servicios Wedding Planner"
            />
          </Field>
          <Field label="Valor (COP)">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              className={inputClass}
              value={form.valor}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  valor: formatInputCurrency(e.target.value),
                }))
              }
              disabled={saving || generating}
            />
          </Field>
        </div>

        <Field label="Total / Subtotal (calculado)">
          <div className="rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm font-medium text-bloom-ink">
            {total === null ? "—" : formatCurrency(total)}
          </div>
        </Field>

        <Field label="Elaborado por">
          <div className="rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink">
            {currentUserNombre.trim() || "Equipo Celestia"}
          </div>
        </Field>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-sm font-medium text-bloom-ink">Estado:</span>
          {(["borrador", "enviado", "emitido"] as ReciboEstado[]).map(
            (option) => (
              <button
                key={option}
                type="button"
                onClick={() => void handleEstadoChange(option)}
                disabled={saving || generating}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                  form.estado === option
                    ? RECIBO_ESTADO_STYLES[option]
                    : "border-bloom-border bg-bloom-canvas text-bloom-muted hover:bg-bloom-border"
                }`}
              >
                {RECIBO_ESTADO_LABELS[option]}
              </button>
            ),
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-bloom-border/70 pt-4">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="submit"
              disabled={saving || generating}
              className="inline-flex items-center justify-center rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => void handleDownload("word")}
              disabled={saving || generating}
              className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
            >
              {generatingFormat === "word" ? "Generando..." : "Descargar Word"}
            </button>
            <button
              type="button"
              onClick={() => void handleDownload("pdf")}
              disabled={saving || generating}
              className="inline-flex items-center justify-center rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
            >
              {generatingFormat === "pdf" ? "Generando..." : "Descargar PDF"}
            </button>
          </div>

          {showShareActions ? (
            <div className="flex flex-col items-end gap-2">
              <p className="text-xs text-bloom-muted">
                Descarga el recibo en Word o PDF y adjunta el archivo al
                enviarlo.
              </p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  disabled={saving || generating}
                  className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 transition-colors hover:bg-green-100 disabled:opacity-60"
                >
                  <WhatsAppIcon />
                  Enviar por WhatsApp
                </button>
                <WhatsAppLocaleToggle
                  locale={whatsappLocale}
                  onChange={setWhatsappLocale}
                />
                <button
                  type="button"
                  onClick={handleShareEmail}
                  disabled={saving || generating}
                  className="inline-flex items-center gap-1.5 rounded-full border border-bloom-border bg-bloom-canvas px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
                >
                  <EmailIcon />
                  Enviar por Email
                </button>
              </div>
            </div>
          ) : null}

          {shareWarning ? (
            <p
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
              role="alert"
            >
              {shareWarning}
            </p>
          ) : null}
        </div>
      </form>

      {recipientEmail ? (
        <EmailShareModal
          open={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          recipientEmail={recipientEmail}
          subject={reciboEmailSubject}
          initialMessage={reciboEmailMessage}
          instructions="1. Descarga el recibo en Word o PDF 2. Copia el mensaje 3. Abre Gmail 4. Pega el mensaje 5. Adjunta el archivo descargado"
        />
      ) : null}
    </Shell>
  );
}

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

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

function WhatsAppIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M3 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v.4l-7 4.375L3 4.4V4Zm0 2.236V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6.236l-6.445 4.028a1 1 0 0 1-1.11 0L3 6.236Z" />
    </svg>
  );
}
