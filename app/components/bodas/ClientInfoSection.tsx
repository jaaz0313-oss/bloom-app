"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { BodaRow } from "@/app/data/weddings";
import type { ProveedorRow } from "@/app/data/providers";
import type { PagoRow } from "@/app/data/pagos";
import { SendWhatsAppButton } from "@/app/components/bodas/SendWhatsAppButton";
import { BodaDriveFolderButton } from "@/app/components/bodas/BodaDriveFolderButton";
import { supabase } from "@/lib/supabase";
import { hasPermission, type UserRole } from "@/lib/auth/roles";

const DOCUMENT_TYPES = ["Cédula", "Pasaporte", "ID extranjero"] as const;

type ClientInfoSectionProps = {
  bodaId: string;
  boda: BodaRow;
  role: UserRole;
  plannerName?: string;
  providers?: ProveedorRow[];
  pagosByProveedor?: Record<string, PagoRow[]>;
  embedded?: boolean;
  canManageDrive?: boolean;
  driveFolderUrl?: string | null;
};

type ClientInfoForm = {
  nombreNovia: string;
  nombreNovio: string;
  telefonoNovia: string;
  telefonoNovio: string;
  emailNovia: string;
  emailNovio: string;
  direccion: string;
  tipoDocumentoNovia: string;
  tipoDocumentoNovio: string;
  documentoNovia: string;
  documentoNovio: string;
};

export function ClientInfoSection({
  bodaId,
  boda,
  role,
  plannerName,
  providers = [],
  pagosByProveedor = {},
  embedded = false,
  canManageDrive = false,
  driveFolderUrl = null,
}: ClientInfoSectionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [grupoLinkOpen, setGrupoLinkOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [grupoLinkSubmitting, setGrupoLinkSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grupoLinkError, setGrupoLinkError] = useState<string | null>(null);
  const [form, setForm] = useState<ClientInfoForm>(toForm(boda));
  const [grupoLink, setGrupoLink] = useState(boda.whatsapp_grupo_link ?? "");

  useEffect(() => {
    if (!open) return;
    setForm(toForm(boda));
  }, [open, boda]);

  useEffect(() => {
    setGrupoLink(boda.whatsapp_grupo_link ?? "");
  }, [boda.whatsapp_grupo_link]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!grupoLinkOpen) return;
    setGrupoLink(boda.whatsapp_grupo_link ?? "");
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGrupoLinkOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [grupoLinkOpen, boda.whatsapp_grupo_link]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!hasPermission(role, "providers.manage")) {
      setError("No tienes permisos para editar esta información.");
      return;
    }

    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from("bodas")
        .update({
          nombre_novia: form.nombreNovia.trim() || null,
          nombre_novio: form.nombreNovio.trim() || null,
          telefono_novia: form.telefonoNovia.trim() || null,
          telefono_novio: form.telefonoNovio.trim() || null,
          email_novia: form.emailNovia.trim() || null,
          email_novio: form.emailNovio.trim() || null,
          direccion: form.direccion.trim() || null,
          tipo_documento_novia: form.tipoDocumentoNovia.trim() || null,
          tipo_documento_novio: form.tipoDocumentoNovio.trim() || null,
          documento_novia: form.documentoNovia.trim() || null,
          documento_novio: form.documentoNovio.trim() || null,
        })
        .eq("id", bodaId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveGrupoLink(e: React.FormEvent) {
    e.preventDefault();
    setGrupoLinkError(null);
    if (!hasPermission(role, "whatsapp.send")) {
      setGrupoLinkError("No tienes permisos para esta acción.");
      return;
    }

    if (!supabase) {
      setGrupoLinkError("Supabase no está configurado.");
      return;
    }

    setGrupoLinkSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from("bodas")
        .update({
          whatsapp_grupo_link: grupoLink.trim() || null,
        })
        .eq("id", bodaId);

      if (updateError) {
        setGrupoLinkError(updateError.message);
        return;
      }

      setGrupoLinkOpen(false);
      router.refresh();
    } finally {
      setGrupoLinkSubmitting(false);
    }
  }

  const shellClass = embedded
    ? ""
    : "rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-sm";
  const Shell = embedded ? "div" : "section";

  return (
    <Shell className={shellClass}>
      <div
        className={`flex flex-col gap-4 sm:flex-row sm:items-end ${
          embedded ? "sm:justify-end" : "sm:justify-between"
        }`}
      >
        {!embedded && (
          <div>
            <h2 className="font-display text-xl text-bloom-ink">
              Información de los clientes
            </h2>
            <p className="mt-1 text-sm text-bloom-muted">
              Datos de contacto y documentación de los novios.
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {hasPermission(role, "whatsapp.send") && (
            <SendWhatsAppButton
              boda={boda}
              plannerName={plannerName}
              providers={providers}
              pagosByProveedor={pagosByProveedor}
            />
          )}
          {hasPermission(role, "providers.manage") && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setOpen(true);
              }}
              className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover"
            >
              Editar información
            </button>
          )}
        </div>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <InfoItem label="Nombre completo novia" value={boda.nombre_novia} />
        <InfoItem label="Nombre completo novio" value={boda.nombre_novio} />
        <InfoItem label="Teléfono novia" value={boda.telefono_novia} />
        <InfoItem label="Teléfono novio" value={boda.telefono_novio} />
        <InfoItem label="Email novia" value={boda.email_novia} />
        <InfoItem label="Email novio" value={boda.email_novio} />
        <InfoItem label="Dirección" value={boda.direccion} full />
        <InfoItem
          label="Tipo de documento novia"
          value={boda.tipo_documento_novia ?? boda.tipo_documento}
        />
        <InfoItem
          label="Tipo de documento novio"
          value={boda.tipo_documento_novio}
        />
        <InfoItem label="Número de documento novia" value={boda.documento_novia} />
        <InfoItem label="Número de documento novio" value={boda.documento_novio} />
      </dl>

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-bloom-border bg-bloom-canvas/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
            Link grupo WhatsApp
          </p>
          <p className="mt-1 truncate text-sm font-medium text-bloom-ink">
            {boda.whatsapp_grupo_link?.trim() || "—"}
          </p>
        </div>
        {hasPermission(role, "whatsapp.send") && (
          <button
            type="button"
            onClick={() => {
              setGrupoLinkError(null);
              setGrupoLinkOpen(true);
            }}
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
          >
            Editar
          </button>
        )}
      </div>

      {canManageDrive && (
        <BodaDriveFolderButton
          bodaId={bodaId}
          driveFolderUrl={driveFolderUrl}
        />
      )}

      {grupoLinkOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Editar link del grupo de WhatsApp"
          onClick={(e) => {
            if (e.target === e.currentTarget) setGrupoLinkOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl text-bloom-ink">
                  Link grupo WhatsApp
                </h3>
                <p className="mt-1 text-sm text-bloom-muted">
                  Pega el enlace de invitación del grupo de la boda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGrupoLinkOpen(false)}
                className="rounded-full p-2 text-bloom-muted transition-colors hover:bg-bloom-border hover:text-bloom-ink"
                aria-label="Cerrar"
                disabled={grupoLinkSubmitting}
              >
                <XIcon />
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSaveGrupoLink}>
              <div className="space-y-1.5">
                <label
                  htmlFor="whatsapp-grupo-link"
                  className="text-sm font-medium text-bloom-ink"
                >
                  URL del grupo
                </label>
                <input
                  id="whatsapp-grupo-link"
                  type="url"
                  className={inputClass}
                  value={grupoLink}
                  onChange={(e) => setGrupoLink(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  disabled={grupoLinkSubmitting}
                />
              </div>

              {grupoLinkError && (
                <p className="text-sm text-red-700" role="alert">
                  {grupoLinkError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
                  onClick={() => setGrupoLinkOpen(false)}
                  disabled={grupoLinkSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={grupoLinkSubmitting}
                  className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
                >
                  {grupoLinkSubmitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Editar información de clientes"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl text-bloom-ink">
                  Editar información de clientes
                </h3>
                <p className="mt-1 text-sm text-bloom-muted">
                  Actualiza los datos de contacto y documentación.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-bloom-muted transition-colors hover:bg-bloom-border hover:text-bloom-ink"
                aria-label="Cerrar"
                disabled={submitting}
              >
                <XIcon />
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSave}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nombre completo novia">
                  <input
                    className={inputClass}
                    value={form.nombreNovia}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, nombreNovia: e.target.value }))
                    }
                    disabled={submitting}
                  />
                </Field>
                <Field label="Nombre completo novio">
                  <input
                    className={inputClass}
                    value={form.nombreNovio}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, nombreNovio: e.target.value }))
                    }
                    disabled={submitting}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Teléfono novia">
                  <input
                    className={inputClass}
                    value={form.telefonoNovia}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, telefonoNovia: e.target.value }))
                    }
                    disabled={submitting}
                  />
                </Field>
                <Field label="Teléfono novio">
                  <input
                    className={inputClass}
                    value={form.telefonoNovio}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, telefonoNovio: e.target.value }))
                    }
                    disabled={submitting}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Email novia">
                  <input
                    type="email"
                    className={inputClass}
                    value={form.emailNovia}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, emailNovia: e.target.value }))
                    }
                    disabled={submitting}
                  />
                </Field>
                <Field label="Email novio">
                  <input
                    type="email"
                    className={inputClass}
                    value={form.emailNovio}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, emailNovio: e.target.value }))
                    }
                    disabled={submitting}
                  />
                </Field>
              </div>

              <Field label="Dirección">
                <textarea
                  rows={2}
                  className={textareaClass}
                  value={form.direccion}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, direccion: e.target.value }))
                  }
                  disabled={submitting}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Tipo de documento novia">
                  <select
                    className={inputClass}
                    value={form.tipoDocumentoNovia}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        tipoDocumentoNovia: e.target.value,
                      }))
                    }
                    disabled={submitting}
                  >
                    <option value="">Seleccionar</option>
                    {DOCUMENT_TYPES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tipo de documento novio">
                  <select
                    className={inputClass}
                    value={form.tipoDocumentoNovio}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        tipoDocumentoNovio: e.target.value,
                      }))
                    }
                    disabled={submitting}
                  >
                    <option value="">Seleccionar</option>
                    {DOCUMENT_TYPES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Número de documento novia">
                  <input
                    className={inputClass}
                    value={form.documentoNovia}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, documentoNovia: e.target.value }))
                    }
                    disabled={submitting}
                  />
                </Field>
                <Field label="Número de documento novio">
                  <input
                    className={inputClass}
                    value={form.documentoNovio}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, documentoNovio: e.target.value }))
                    }
                    disabled={submitting}
                  />
                </Field>
              </div>

              {error && (
                <p className="text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
                >
                  {submitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}

function toForm(boda: BodaRow): ClientInfoForm {
  return {
    nombreNovia: boda.nombre_novia ?? "",
    nombreNovio: boda.nombre_novio ?? "",
    telefonoNovia: boda.telefono_novia ?? "",
    telefonoNovio: boda.telefono_novio ?? "",
    emailNovia: boda.email_novia ?? "",
    emailNovio: boda.email_novio ?? "",
    direccion: boda.direccion ?? "",
    tipoDocumentoNovia: boda.tipo_documento_novia ?? boda.tipo_documento ?? "",
    tipoDocumentoNovio: boda.tipo_documento_novio ?? "",
    documentoNovia: boda.documento_novia ?? "",
    documentoNovio: boda.documento_novio ?? "",
  };
}

function InfoItem({
  label,
  value,
  full = false,
}: {
  label: string;
  value: string | null;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-bloom-ink">{value || "—"}</dd>
    </div>
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

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

const textareaClass =
  "w-full resize-y rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

