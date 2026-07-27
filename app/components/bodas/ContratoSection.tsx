"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  computeContratoSaldo,
  CONTRATO_ESTADO_LABELS,
  CONTRATO_ESTADO_STYLES,
  type ContratoEstado,
  type ContratoFirmante,
  type ContratoRow,
} from "@/app/data/contratos";
import type { BodaRow } from "@/app/data/weddings";
import { formatCurrency, formatInputCurrency, formatInputCurrencyFromNumber, parseInputCurrency } from "@/lib/format";
import {
  resolveClienteFromBoda,
} from "@/lib/contrato-celestia-template";
import { downloadContratoFile } from "@/lib/download-contrato-docx";
import { WhatsAppLocaleToggle } from "@/app/components/ui/WhatsAppLocaleToggle";
import { EmailShareModal } from "@/app/components/ui/EmailShareModal";
import {
  buildContratoShareEmailMessage,
  buildContratoShareEmailSubject,
  buildContratoShareMessage,
  getContratoRecipientEmail,
  openContratoShareWhatsApp,
} from "@/lib/contrato-share";
import { supabase } from "@/lib/supabase";
import { AUDITORIA_ACCIONES, logAuditoria } from "@/lib/auditoria";
import type { WhatsAppLocale } from "@/lib/whatsapp-locale";

type ContratoSectionProps = {
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
    | "honorarios"
    | "anticipo_honorarios"
    | "direccion"
    | "telefono_novia"
    | "telefono_novio"
    | "email_novia"
    | "email_novio"
    | "whatsapp_grupo_link"
  >;
  initialContrato: ContratoRow | null;
};

type FormState = {
  honorarios: string;
  anticipo: string;
  ciudad: string;
  fechaFirma: string;
  firmante: ContratoFirmante;
};

function buildInitialForm(
  boda: ContratoSectionProps["boda"],
  contrato: ContratoRow | null,
): FormState {
  const honorarios = contrato?.honorarios ?? boda.honorarios ?? null;
  const anticipo = contrato?.anticipo ?? boda.anticipo_honorarios ?? null;
  const ciudad = contrato?.ciudad ?? boda.ciudad ?? "";

  return {
    honorarios: formatInputCurrencyFromNumber(honorarios),
    anticipo: formatInputCurrencyFromNumber(anticipo),
    ciudad,
    fechaFirma: contrato?.fecha_firma ?? "",
    firmante: contrato?.firmante ?? "novia",
  };
}

export function ContratoSection({
  embedded = false,
  bodaId,
  boda,
  initialContrato,
}: ContratoSectionProps) {
  const router = useRouter();
  const [contratoId, setContratoId] = useState<string | null>(
    initialContrato?.id ?? null,
  );
  const [estado, setEstado] = useState<ContratoEstado>(
    initialContrato?.estado ?? "borrador",
  );
  const [form, setForm] = useState<FormState>(() =>
    buildInitialForm(boda, initialContrato),
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
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(
    () => (initialContrato?.estado ?? "borrador") !== "borrador",
  );

  const honorariosNum = form.honorarios.trim()
    ? parseInputCurrency(form.honorarios)
    : null;
  const anticipoNum = form.anticipo.trim()
    ? parseInputCurrency(form.anticipo)
    : null;
  const saldo = useMemo(
    () => computeContratoSaldo(honorariosNum, anticipoNum),
    [honorariosNum, anticipoNum],
  );

  const firmantePreview = useMemo(
    () => resolveClienteFromBoda(boda, form.firmante),
    [boda, form.firmante],
  );

  const shareBoda = useMemo(
    () => ({
      nombre_pareja: boda.nombre_pareja,
      fecha_boda: boda.fecha_boda,
      ciudad: form.ciudad.trim() || boda.ciudad,
      telefono_novia: boda.telefono_novia,
      email_novia: boda.email_novia,
      email_novio: boda.email_novio,
      whatsapp_grupo_link: boda.whatsapp_grupo_link,
    }),
    [boda, form.ciudad],
  );

  const contratoShareMessage = useMemo(
    () => buildContratoShareMessage(shareBoda, whatsappLocale),
    [shareBoda, whatsappLocale],
  );

  const contratoEmailMessage = useMemo(
    () => buildContratoShareEmailMessage(shareBoda),
    [shareBoda],
  );

  const contratoEmailSubject = useMemo(
    () => buildContratoShareEmailSubject(boda.nombre_pareja),
    [boda.nombre_pareja],
  );

  const contratoRecipientEmail = useMemo(
    () => getContratoRecipientEmail(shareBoda, form.firmante),
    [shareBoda, form.firmante],
  );

  const showShareActions = hasGeneratedOnce || estado !== "borrador";

  const generating = generatingFormat !== null;

  function handleShareWhatsApp() {
    setShareWarning(null);
    const opened = openContratoShareWhatsApp(shareBoda, contratoShareMessage);
    if (!opened) {
      setShareWarning(
        "No hay grupo de WhatsApp ni teléfono de la novia registrado. Agrégalos en información del cliente.",
      );
    }
  }

  function handleShareEmail() {
    setShareWarning(null);
    if (!contratoRecipientEmail) {
      setShareWarning(
        `No hay email del ${form.firmante === "novio" ? "novio" : "novia"} registrado. Agrégalo en información del cliente.`,
      );
      return;
    }
    setEmailModalOpen(true);
  }

  function parseForm():
    | {
        honorarios: number | null;
        anticipo: number | null;
        saldo: number | null;
        ciudad: string | null;
        fechaFirma: string | null;
        firmante: ContratoFirmante;
      }
    | { error: string } {
    const ciudad = form.ciudad.trim() || null;
    const fechaFirma = form.fechaFirma.trim() || null;

    if (
      honorariosNum !== null &&
      (!Number.isFinite(honorariosNum) || honorariosNum < 0)
    ) {
      return { error: "Ingresa honorarios válidos (>= 0)." };
    }
    if (
      anticipoNum !== null &&
      (!Number.isFinite(anticipoNum) || anticipoNum < 0)
    ) {
      return { error: "Ingresa un anticipo válido (>= 0)." };
    }
    if (honorariosNum !== null && anticipoNum !== null && anticipoNum > honorariosNum) {
      return { error: "El anticipo no puede ser mayor que los honorarios." };
    }

    return {
      honorarios: honorariosNum,
      anticipo: anticipoNum,
      saldo: computeContratoSaldo(honorariosNum, anticipoNum),
      ciudad,
      fechaFirma,
      firmante: form.firmante,
    };
  }

  async function saveChanges(
    nextEstado: ContratoEstado = estado,
  ): Promise<boolean> {
    setError(null);
    setSuccess(null);
    if (!supabase) {
      setError("Supabase no está configurado.");
      return false;
    }

    const parsed = parseForm();
    if ("error" in parsed) {
      setError(parsed.error);
      return false;
    }

    setSaving(true);
    try {
      const payload = {
        boda_id: bodaId,
        honorarios: parsed.honorarios,
        anticipo: parsed.anticipo,
        saldo: parsed.saldo,
        ciudad: parsed.ciudad,
        firmante: parsed.firmante,
        fecha_firma: parsed.fechaFirma,
        estado: nextEstado,
      };

      if (contratoId) {
        const { error: updateError } = await supabase
          .from("contratos")
          .update(payload)
          .eq("id", contratoId);
        if (updateError) {
          setError(updateError.message);
          return false;
        }
      } else {
        const { data, error: insertError } = await supabase
          .from("contratos")
          .insert(payload)
          .select("id")
          .single();
        if (insertError) {
          setError(insertError.message);
          return false;
        }
        setContratoId(data.id);
      }

      const { error: bodaError } = await supabase
        .from("bodas")
        .update({
          honorarios: parsed.honorarios,
          anticipo_honorarios: parsed.anticipo,
          ciudad: parsed.ciudad,
        })
        .eq("id", bodaId);
      if (bodaError) {
        setError(bodaError.message);
        return false;
      }

      setEstado(nextEstado);
      setSuccess("Cambios guardados.");
      router.refresh();
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveChanges(e: React.FormEvent) {
    e.preventDefault();
    await saveChanges();
  }

  async function handleEstadoChange(nextEstado: ContratoEstado) {
    if (nextEstado === estado) return;
    await saveChanges(nextEstado);
  }

  async function handleDownloadContrato(format: "word" | "pdf") {
    setError(null);
    setSuccess(null);

    const parsed = parseForm();
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    if (parsed.honorarios === null) {
      setError("Ingresa los honorarios antes de generar el contrato.");
      return;
    }
    if (!parsed.ciudad) {
      setError("Ingresa la ciudad de la boda antes de generar el contrato.");
      return;
    }

    setGeneratingFormat(format);
    try {
      const saved = await saveChanges();
      if (!saved) return;

      const bodaForDoc = { ...boda, ciudad: parsed.ciudad };
      const cliente = resolveClienteFromBoda(bodaForDoc, parsed.firmante);
      const payload = {
        boda: bodaForDoc,
        firmante: parsed.firmante,
        cliente,
        honorarios: parsed.honorarios,
        anticipo: parsed.anticipo ?? 0,
        saldo: parsed.saldo ?? parsed.honorarios,
        fechaFirma: parsed.fechaFirma,
      };

      const endpoint =
        format === "pdf" ? "/api/contrato/generar-pdf" : "/api/contrato/generar";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(
          errorPayload?.error ??
            (format === "pdf"
              ? "No se pudo generar el contrato en PDF."
              : "No se pudo generar el contrato."),
        );
        return;
      }

      const blob = await response.blob();
      const defaultExtension = format === "pdf" ? ".pdf" : ".docx";
      const filename =
        response.headers.get("X-Filename") ??
        `Contrato_Celestia_${bodaForDoc.nombre_pareja.replace(/\s+/g, "_")}${defaultExtension}`;
      downloadContratoFile(blob, filename);
      await logAuditoria({
        accion: AUDITORIA_ACCIONES.CONTRATO_GENERADO,
        entidad: "contrato",
        entidadId: contratoId ?? bodaId,
        bodaNombre: bodaForDoc.nombre_pareja,
        detalle: `${cliente.nombre} · ${formatCurrency(parsed.honorarios)} · ${parsed.ciudad} · ${format.toUpperCase()}`,
      });
      setHasGeneratedOnce(true);
      setSuccess(
        format === "pdf"
          ? "Contrato PDF generado y descargado."
          : "Contrato Word generado y descargado.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo generar el contrato.",
      );
    } finally {
      setGeneratingFormat(null);
    }
  }

  const shellClass = embedded
    ? ""
    : "rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-sm";
  const Shell = embedded ? "div" : "section";

  return (
    <Shell className={shellClass}>
      <div
        className={`flex flex-col gap-4 sm:flex-row sm:items-start ${
          embedded ? "sm:justify-end" : "sm:justify-between"
        }`}
      >
        {!embedded && (
          <div>
            <h2 className="font-display text-xl text-bloom-ink">Contrato</h2>
            <p className="mt-1 text-sm text-bloom-muted">
              Honorarios, anticipo y generación del documento para firma
            </p>
          </div>
        )}
        <span
          className={`inline-flex self-start rounded-full border px-3 py-1 text-xs font-medium ${CONTRATO_ESTADO_STYLES[estado]}`}
        >
          {CONTRATO_ESTADO_LABELS[estado]}
        </span>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {success}
        </p>
      )}

      <form
        className={`space-y-4 ${embedded ? "mt-4" : "mt-5"}`}
        onSubmit={handleSaveChanges}
      >
        <Field label="¿Quién firma el contrato?">
          <select
            className={inputClass}
            value={form.firmante}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                firmante: e.target.value as ContratoFirmante,
              }))
            }
            disabled={saving || generating}
          >
            <option value="novia">Novia</option>
            <option value="novio">Novio</option>
          </select>
        </Field>

        <div className="rounded-xl border border-bloom-border bg-bloom-canvas/60 px-4 py-3 text-sm text-bloom-muted">
          <p className="font-medium text-bloom-ink">Datos del firmante</p>
          <dl className="mt-2 grid gap-1 sm:grid-cols-2">
            <div>
              <dt>Nombre</dt>
              <dd className="font-medium text-bloom-ink">{firmantePreview.nombre || "—"}</dd>
            </div>
            <div>
              <dt>Documento</dt>
              <dd className="font-medium text-bloom-ink">
                {firmantePreview.numeroDocumento}
              </dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd className="font-medium text-bloom-ink">{firmantePreview.telefono}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd className="font-medium text-bloom-ink">{firmantePreview.email}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs">
            Edita los datos del firmante en la sección de información del cliente.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Honorarios (COP)">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              className={inputClass}
              value={form.honorarios}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  honorarios: formatInputCurrency(e.target.value),
                }))
              }
              disabled={saving || generating}
            />
          </Field>
          <Field label="Anticipo (COP)">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              className={inputClass}
              value={form.anticipo}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  anticipo: formatInputCurrency(e.target.value),
                }))
              }
              disabled={saving || generating}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Saldo (calculado)">
            <div className="rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm font-medium text-bloom-ink">
              {saldo === null ? "—" : formatCurrency(saldo)}
            </div>
          </Field>
          <Field label="Fecha de firma">
            <input
              type="date"
              className={inputClass}
              value={form.fechaFirma}
              onChange={(e) =>
                setForm((s) => ({ ...s, fechaFirma: e.target.value }))
              }
              disabled={saving || generating}
            />
            <p className="text-xs text-bloom-muted">
              Si no se indica, se usa la fecha actual al generar el contrato.
            </p>
          </Field>
        </div>

        <Field label="Ciudad de la boda">
          <input
            className={inputClass}
            value={form.ciudad}
            onChange={(e) =>
              setForm((s) => ({ ...s, ciudad: e.target.value }))
            }
            disabled={saving || generating}
            placeholder="Ej. Medellín"
          />
        </Field>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="text-sm font-medium text-bloom-ink">Estado:</span>
          {(["borrador", "enviado", "firmado"] as ContratoEstado[]).map(
            (option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleEstadoChange(option)}
                disabled={saving || generating}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                  estado === option
                    ? CONTRATO_ESTADO_STYLES[option]
                    : "border-bloom-border bg-bloom-canvas text-bloom-muted hover:bg-bloom-border"
                }`}
              >
                {CONTRATO_ESTADO_LABELS[option]}
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
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={() => handleDownloadContrato("word")}
              disabled={saving || generating}
              className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
            >
              {generatingFormat === "word" ? "Generando..." : "Descargar Word"}
            </button>
            <button
              type="button"
              onClick={() => handleDownloadContrato("pdf")}
              disabled={saving || generating}
              className="inline-flex items-center justify-center rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
            >
              {generatingFormat === "pdf" ? "Generando..." : "Descargar PDF"}
            </button>
          </div>

          {showShareActions && (
            <div className="flex flex-col items-end gap-2">
              <p className="text-xs text-bloom-muted">
                Descarga el contrato en Word o PDF y adjunta el archivo que prefieras
                al enviarlo.
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
          )}

          {shareWarning && (
            <p
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
              role="alert"
            >
              {shareWarning}
            </p>
          )}
        </div>
      </form>

      {contratoRecipientEmail && (
        <EmailShareModal
          open={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          recipientEmail={contratoRecipientEmail}
          subject={contratoEmailSubject}
          initialMessage={contratoEmailMessage}
          instructions="1. Descarga el contrato en Word o PDF 2. Copia el mensaje 3. Abre Gmail 4. Pega el mensaje 5. Adjunta el archivo descargado"
        />
      )}
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
      <path d="M2.003 5.884c.753-1.107 2-1.777 3.4-1.777h9.194c1.4 0 2.647.67 3.4 1.777L10 10.582 2.003 5.884Z" />
      <path d="M17 6.25V14a2.75 2.75 0 0 1-2.75 2.75H5.75A2.75 2.75 0 0 1 3 14V6.25l7.47 4.588a1.75 1.75 0 0 0 2.06 0L17 6.25Z" />
    </svg>
  );
}
