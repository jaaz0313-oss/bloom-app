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
import { formatCurrency } from "@/lib/format";
import {
  resolveClienteFromBoda,
} from "@/lib/contrato-celestia-template";
import { downloadContratoDocx } from "@/lib/download-contrato-docx";
import { supabase } from "@/lib/supabase";

type ContratoSectionProps = {
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
    honorarios: honorarios === null ? "" : String(honorarios),
    anticipo: anticipo === null ? "" : String(anticipo),
    ciudad,
    fechaFirma: contrato?.fecha_firma ?? "",
    firmante: contrato?.firmante ?? "novia",
  };
}

export function ContratoSection({
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
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const honorariosNum = form.honorarios.trim()
    ? Number(form.honorarios)
    : null;
  const anticipoNum = form.anticipo.trim() ? Number(form.anticipo) : null;
  const saldo = useMemo(
    () => computeContratoSaldo(honorariosNum, anticipoNum),
    [honorariosNum, anticipoNum],
  );

  const firmantePreview = useMemo(
    () => resolveClienteFromBoda(boda, form.firmante),
    [boda, form.firmante],
  );

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

  async function handleGenerateDocx() {
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

    setGenerating(true);
    try {
      const saved = await saveChanges();
      if (!saved) return;

      const bodaForDoc = { ...boda, ciudad: parsed.ciudad };
      const cliente = resolveClienteFromBoda(bodaForDoc, parsed.firmante);

      const response = await fetch("/api/contrato/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boda: bodaForDoc,
          firmante: parsed.firmante,
          cliente,
          honorarios: parsed.honorarios,
          anticipo: parsed.anticipo ?? 0,
          saldo: parsed.saldo ?? parsed.honorarios,
          fechaFirma: parsed.fechaFirma,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(payload?.error ?? "No se pudo generar el contrato.");
        return;
      }

      const blob = await response.blob();
      const filename =
        response.headers.get("X-Filename") ??
        `Contrato_Celestia_${bodaForDoc.nombre_pareja.replace(/\s+/g, "_")}.docx`;
      downloadContratoDocx(blob, filename);
      setSuccess("Contrato generado y descargado.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo generar el contrato.",
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl text-bloom-ink">Contrato</h2>
          <p className="mt-1 text-sm text-bloom-muted">
            Honorarios, anticipo y generación del documento para firma
          </p>
        </div>
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

      <form className="mt-5 space-y-4" onSubmit={handleSaveChanges}>
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
              type="number"
              min={0}
              step={1}
              className={inputClass}
              value={form.honorarios}
              onChange={(e) =>
                setForm((s) => ({ ...s, honorarios: e.target.value }))
              }
              disabled={saving || generating}
            />
          </Field>
          <Field label="Anticipo (COP)">
            <input
              type="number"
              min={0}
              step={1}
              className={inputClass}
              value={form.anticipo}
              onChange={(e) =>
                setForm((s) => ({ ...s, anticipo: e.target.value }))
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

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || generating}
            className="inline-flex items-center justify-center rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          <button
            type="button"
            onClick={handleGenerateDocx}
            disabled={saving || generating}
            className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
          >
            {generating ? "Generando..." : "Generar contrato"}
          </button>
        </div>
      </form>
    </section>
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
