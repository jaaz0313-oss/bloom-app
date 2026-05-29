"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PagoRow } from "@/app/data/pagos";
import { computeTotalPagado } from "@/app/data/pagos";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { AUDITORIA_ACCIONES, logAuditoria } from "@/lib/auditoria";
import { supabase } from "@/lib/supabase";
import { hasPermission, type UserRole } from "@/lib/auth/roles";

type ProviderPaymentsProps = {
  proveedorId: string;
  proveedorNombre: string;
  bodaNombre: string;
  pagos: PagoRow[];
  anticipo: number;
  valorTotal: number;
  role: UserRole;
};

type PaymentFormState = {
  monto: string;
  fechaPago: string;
  concepto: string;
  comprobanteUrl: string;
};

const emptyPaymentForm: PaymentFormState = {
  monto: "",
  fechaPago: "",
  concepto: "",
  comprobanteUrl: "",
};

export function ProviderPayments({
  proveedorId,
  proveedorNombre,
  bodaNombre,
  pagos,
  anticipo,
  valorTotal,
  role,
}: ProviderPaymentsProps) {
  const router = useRouter();
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingPago, setEditingPago] = useState<PagoRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingPagoId, setDeletingPagoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentFormState>(emptyPaymentForm);

  const totalPagosRegistrados = computeTotalPagado(pagos);
  const totalPagado = anticipo + totalPagosRegistrados;
  const saldoPendiente = Math.max(0, valorTotal - totalPagado);
  const sortedPagos = [...pagos].sort(
    (a, b) =>
      new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime(),
  );

  useEffect(() => {
    if (!openCreate && !openEdit) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenCreate(false);
        setOpenEdit(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openCreate, openEdit]);

  async function handleCreateSubmit(e: React.FormEvent) {
    if (!hasPermission(role, "payments.manage")) {
      setError("No tienes permisos para registrar pagos.");
      return;
    }
    e.preventDefault();
    setError(null);

    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    const monto = Number(form.monto);
    const fechaPago = form.fechaPago;
    const concepto = form.concepto.trim();
    const comprobanteUrl = form.comprobanteUrl.trim();

    if (!Number.isFinite(monto) || monto <= 0) {
      return setError("Ingresa un monto válido mayor a 0.");
    }
    if (!fechaPago) {
      return setError("Ingresa la fecha del pago.");
    }

    setSubmitting(true);
    try {
      const { data: nuevoPago, error: insertError } = await supabase
        .from("pagos")
        .insert({
          proveedor_id: proveedorId,
          monto,
          fecha_pago: fechaPago,
          concepto: concepto || null,
          comprobante_url: comprobanteUrl || null,
        })
        .select("id")
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      await logAuditoria({
        accion: AUDITORIA_ACCIONES.PAGO_REGISTRADO,
        entidad: "pago",
        entidadId: nuevoPago.id,
        bodaNombre,
        detalle: `${proveedorNombre}: ${formatCurrency(monto)}`,
      });

      setOpenCreate(false);
      setForm(emptyPaymentForm);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    if (!hasPermission(role, "payments.manage")) {
      setError("No tienes permisos para editar pagos.");
      return;
    }
    e.preventDefault();
    setError(null);

    if (!supabase || !editingPago) {
      setError("Supabase no está configurado.");
      return;
    }

    const monto = Number(form.monto);
    const fechaPago = form.fechaPago;
    const concepto = form.concepto.trim();
    const comprobanteUrl = form.comprobanteUrl.trim();

    if (!Number.isFinite(monto) || monto <= 0) {
      return setError("Ingresa un monto válido mayor a 0.");
    }
    if (!fechaPago) {
      return setError("Ingresa la fecha del pago.");
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from("pagos")
        .update({
          monto,
          fecha_pago: fechaPago,
          concepto: concepto || null,
          comprobante_url: comprobanteUrl || null,
        })
        .eq("id", editingPago.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setOpenEdit(false);
      setEditingPago(null);
      setForm(emptyPaymentForm);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(pago: PagoRow) {
    if (!hasPermission(role, "payments.manage")) {
      setError("No tienes permisos para eliminar pagos.");
      return;
    }
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    const confirmed = window.confirm("¿Seguro que deseas eliminar este pago?");
    if (!confirmed) return;

    setError(null);
    setDeletingPagoId(pago.id);
    try {
      const { error: deleteError } = await supabase
        .from("pagos")
        .delete()
        .eq("id", pago.id);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      await logAuditoria({
        accion: AUDITORIA_ACCIONES.PAGO_ELIMINADO,
        entidad: "pago",
        entidadId: pago.id,
        bodaNombre,
        detalle: `${proveedorNombre}: ${formatCurrency(Number(pago.monto))}`,
      });

      router.refresh();
    } finally {
      setDeletingPagoId(null);
    }
  }

  function openEditModal(pago: PagoRow) {
    setError(null);
    setEditingPago(pago);
    setForm({
      monto: String(pago.monto),
      fechaPago: pago.fecha_pago,
      concepto: pago.concepto ?? "",
      comprobanteUrl: pago.comprobante_url ?? "",
    });
    setOpenEdit(true);
  }

  return (
    <section className="mt-5 border-t border-bloom-border pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-medium text-bloom-ink">
            Pagos registrados
          </h4>
          <p className="mt-0.5 text-sm text-bloom-muted">
            Total pagado:{" "}
            <span className="font-semibold text-bloom-success">
              {formatCurrency(totalPagado)}
            </span>
          </p>
          <p className="text-sm text-bloom-muted">
            Saldo pendiente:{" "}
            <span className="font-semibold text-bloom-ink">
              {formatCurrency(saldoPendiente)}
            </span>
          </p>
        </div>
        {hasPermission(role, "payments.manage") && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setOpenCreate(true);
            }}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-bloom-accent px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover"
          >
            Registrar pago
          </button>
        )}
      </div>

      {sortedPagos.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-bloom-border bg-bloom-canvas/50 px-4 py-3 text-sm text-bloom-muted">
          Aún no hay pagos registrados para este proveedor.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {sortedPagos.map((pago) => (
            <li key={pago.id} className="rounded-xl border border-bloom-border bg-bloom-canvas/50 px-4 py-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium text-bloom-ink">
                  {formatCurrency(pago.monto)}
                </p>
                <p className="text-bloom-muted">
                  {formatShortDate(pago.fecha_pago)}
                </p>
              </div>
              {pago.concepto && (
                <p className="mt-1 text-bloom-muted">{pago.concepto}</p>
              )}
              <div className="mt-2 flex gap-2">
                {pago.comprobante_url && (
                  <a
                    href={pago.comprobante_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-bloom-border bg-bloom-surface px-3 py-1 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
                  >
                    Ver comprobante
                  </a>
                )}
                {hasPermission(role, "payments.manage") && (
                  <>
                    <button
                      type="button"
                      onClick={() => openEditModal(pago)}
                      disabled={submitting || deletingPagoId === pago.id}
                      className="rounded-full border border-bloom-border bg-bloom-surface px-3 py-1 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(pago)}
                      disabled={submitting || deletingPagoId === pago.id}
                      className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
                    >
                      {deletingPagoId === pago.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {openCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Registrar pago"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpenCreate(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl text-bloom-ink">
                  Registrar pago
                </h2>
                <p className="mt-1 text-sm text-bloom-muted">
                  Añade un pago parcial o adicional al proveedor.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-bloom-muted transition-colors hover:bg-bloom-border hover:text-bloom-ink"
                onClick={() => setOpenCreate(false)}
                aria-label="Cerrar"
                disabled={submitting}
              >
                <XIcon />
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleCreateSubmit}>
              <Field label="Monto">
                <input
                  type="number"
                  min={1}
                  step={1}
                  className={inputClass}
                  value={form.monto}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, monto: e.target.value }))
                  }
                  placeholder="Ej: 500000"
                  required
                  disabled={submitting}
                />
              </Field>

              <Field label="Fecha del pago">
                <input
                  type="date"
                  className={inputClass}
                  value={form.fechaPago}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, fechaPago: e.target.value }))
                  }
                  required
                  disabled={submitting}
                />
              </Field>

              <Field label="Concepto">
                <input
                  className={inputClass}
                  value={form.concepto}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, concepto: e.target.value }))
                  }
                  placeholder="Ej: Anticipo, saldo final"
                  disabled={submitting}
                />
              </Field>

              <Field label="Link del comprobante">
                <input
                  type="url"
                  className={inputClass}
                  value={form.comprobanteUrl}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, comprobanteUrl: e.target.value }))
                  }
                  placeholder="https://..."
                  disabled={submitting}
                />
              </Field>

              {error && (
                <p className="text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
                  onClick={() => setOpenCreate(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
                >
                  {submitting ? "Guardando..." : "Guardar pago"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {openEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Editar pago"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpenEdit(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl text-bloom-ink">Editar pago</h2>
                <p className="mt-1 text-sm text-bloom-muted">
                  Actualiza monto, fecha y concepto del pago.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-bloom-muted transition-colors hover:bg-bloom-border hover:text-bloom-ink"
                onClick={() => setOpenEdit(false)}
                aria-label="Cerrar"
                disabled={submitting}
              >
                <XIcon />
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleEditSubmit}>
              <Field label="Monto">
                <input
                  type="number"
                  min={1}
                  step={1}
                  className={inputClass}
                  value={form.monto}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, monto: e.target.value }))
                  }
                  required
                  disabled={submitting}
                />
              </Field>

              <Field label="Fecha del pago">
                <input
                  type="date"
                  className={inputClass}
                  value={form.fechaPago}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, fechaPago: e.target.value }))
                  }
                  required
                  disabled={submitting}
                />
              </Field>

              <Field label="Concepto">
                <input
                  className={inputClass}
                  value={form.concepto}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, concepto: e.target.value }))
                  }
                  disabled={submitting}
                />
              </Field>

              <Field label="Link del comprobante">
                <input
                  type="url"
                  className={inputClass}
                  value={form.comprobanteUrl}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, comprobanteUrl: e.target.value }))
                  }
                  placeholder="https://..."
                  disabled={submitting}
                />
              </Field>

              {error && (
                <p className="text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
                  onClick={() => setOpenEdit(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
                >
                  {submitting ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

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
