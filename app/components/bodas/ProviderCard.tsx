"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getNextStatus,
  PROVIDER_STATUS_LABELS,
  PROVIDER_STATUS_STYLES,
  type ProveedorRow,
} from "@/app/data/providers";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { syncBodaProveedoresContratados } from "@/lib/sync-boda";
import type { PagoRow } from "@/app/data/pagos";
import { ProviderPayments } from "./ProviderPayments";

type ProviderCardProps = {
  provider: ProveedorRow;
  bodaId: string;
  pagos: PagoRow[];
};

export function ProviderCard({ provider, bodaId, pagos }: ProviderCardProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStatus = getNextStatus(provider.estado);

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
    notas: string;
  };

  const [editOpen, setEditOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
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
    notas: provider.notas ?? "",
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
      notas: provider.notas ?? "",
    });
  }, [editOpen, provider]);

  async function handleEditSave(e: React.FormEvent) {
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
          notas: notas || null,
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

  async function handleStatusChange() {
    setError(null);

    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    setUpdating(true);
    try {
      const { error: updateError } = await supabase
        .from("proveedores")
        .update({ estado: nextStatus })
        .eq("id", provider.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      await syncBodaProveedoresContratados(bodaId);
      router.refresh();
    } finally {
      setUpdating(false);
    }
  }

  return (
    <li className="rounded-2xl border border-bloom-border bg-bloom-surface p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-bloom-ink">{provider.nombre}</h3>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PROVIDER_STATUS_STYLES[provider.estado]}`}
            >
              {PROVIDER_STATUS_LABELS[provider.estado]}
            </span>
          </div>
          <p className="mt-1 text-sm text-bloom-muted">{provider.categoria}</p>

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

          {(provider.banco || provider.numero_cuenta) && (
            <p className="mt-2 text-xs text-bloom-muted">
              {[provider.banco, provider.numero_cuenta]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleStatusChange}
              disabled={updating || editSubmitting}
              className="rounded-full border border-bloom-border bg-bloom-canvas px-4 py-2 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
            >
              {updating
                ? "Actualizando..."
                : `Cambiar a ${PROVIDER_STATUS_LABELS[nextStatus]}`}
            </button>

            <button
              type="button"
              onClick={() => {
                setEditError(null);
                setEditOpen(true);
              }}
              disabled={updating || editSubmitting}
              className="rounded-full border-2 border-bloom-accent bg-bloom-surface px-4 py-2 text-xs font-semibold text-bloom-accent transition-colors hover:bg-bloom-accent hover:text-white disabled:opacity-60"
            >
              Editar
            </button>
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
                {formatShortDate(provider.fecha_saldo)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <ProviderPayments
        proveedorId={provider.id}
        pagos={pagos}
        anticipo={provider.anticipo}
        valorTotal={provider.valor_total}
      />

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
                <Field label="Tipo de cuenta">
                  <input
                    className={inputClass}
                    value={editForm.tipoCuenta}
                    onChange={(e) =>
                      setEditForm((s) => ({
                        ...s,
                        tipoCuenta: e.target.value,
                      }))
                    }
                    placeholder="Ej: Ahorros"
                    disabled={editSubmitting}
                  />
                </Field>
                <Field label="Titular de cuenta">
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
              </div>

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
    </li>
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
