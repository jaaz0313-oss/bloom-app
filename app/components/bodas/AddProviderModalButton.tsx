"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { hasPermission, type UserRole } from "@/lib/auth/roles";

type FormState = {
  nombre: string;
  categoria: string;
  valorTotal: string;
  anticipo: string;
  fechaSaldo: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  titular: string;
  documentoNit: string;
  telefono: string;
  email: string;
  direccion: string;
  descripcionServicio: string;
  notas: string;
};

const emptyForm: FormState = {
  nombre: "",
  categoria: "",
  valorTotal: "",
  anticipo: "",
  fechaSaldo: "",
  banco: "",
  tipoCuenta: "",
  numeroCuenta: "",
  titular: "",
  documentoNit: "",
  telefono: "",
  email: "",
  direccion: "",
  descripcionServicio: "",
  notas: "",
};

type AddProviderModalButtonProps = {
  bodaId: string;
  role: UserRole;
};

export function AddProviderModalButton({ bodaId, role }: AddProviderModalButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    if (!hasPermission(role, "providers.manage")) {
      setError("No tienes permisos para agregar proveedores.");
      return;
    }
    e.preventDefault();
    setError(null);

    if (!supabase) {
      setError(
        "Supabase no está configurado. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    const nombre = form.nombre.trim();
    const categoria = form.categoria.trim();
    const valorTotal = Number(form.valorTotal);
    const anticipo = Number(form.anticipo || "0");
    const banco = form.banco.trim();
    const numeroCuenta = form.numeroCuenta.trim();
    const titular = form.titular.trim();
    const tipoCuenta = form.tipoCuenta.trim();
    const documentoNit = form.documentoNit.trim();
    const telefono = form.telefono.trim();
    const email = form.email.trim();
    const direccion = form.direccion.trim();
    const descripcionServicio = form.descripcionServicio.trim();
    const notas = form.notas.trim();

    if (!nombre) return setError("Ingresa el nombre del proveedor.");
    if (!categoria) return setError("Ingresa la categoría.");
    if (!Number.isFinite(valorTotal) || valorTotal < 0) {
      return setError("Ingresa un valor total válido (>= 0).");
    }
    if (!Number.isFinite(anticipo) || anticipo < 0) {
      return setError("Ingresa un anticipo válido (>= 0).");
    }
    if (anticipo > valorTotal) {
      return setError("El anticipo no puede ser mayor que el valor total.");
    }

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("proveedores").insert({
        boda_id: bodaId,
        nombre,
        categoria,
        valor_total: valorTotal,
        anticipo,
        fecha_saldo: form.fechaSaldo || null,
        banco: banco || null,
        tipo_cuenta: tipoCuenta || null,
        numero_cuenta: numeroCuenta || null,
        titular_cuenta: titular || null,
        documento_nit: documentoNit || null,
        telefono: telefono || null,
        email: email || null,
        direccion: direccion || null,
        descripcion_servicio: descripcionServicio || null,
        notas: notas || null,
        estado: "pendiente",
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setOpen(false);
      setForm(emptyForm);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-bloom-accent px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bloom-accent"
      >
        <PlusIcon />
        Agregar proveedor
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Agregar proveedor"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl text-bloom-ink">
                  Nuevo proveedor
                </h2>
                <p className="mt-1 text-sm text-bloom-muted">
                  Registra los datos del proveedor y su proyección de pago.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-bloom-muted transition-colors hover:bg-bloom-border hover:text-bloom-ink"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                <XIcon />
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={onSubmit}>
              <Field label="Nombre">
                <input
                  className={inputClass}
                  value={form.nombre}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, nombre: e.target.value }))
                  }
                  placeholder="Ej: Fotografía Luna"
                  required
                />
              </Field>

              <Field label="Categoría">
                <input
                  className={inputClass}
                  value={form.categoria}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, categoria: e.target.value }))
                  }
                  placeholder="Ej: Fotografía"
                  required
                />
              </Field>

              <Field label="Descripción del servicio">
                <textarea
                  className={textareaClass}
                  value={form.descripcionServicio}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      descripcionServicio: e.target.value,
                    }))
                  }
                  placeholder="Ej: Paquete premium 8 horas, álbum digital y 2 fotógrafos"
                  rows={3}
                />
              </Field>

              <Field label="Notas">
                <textarea
                  className={textareaClass}
                  value={form.notas}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, notas: e.target.value }))
                  }
                  placeholder="Ej: Cotización ajustada por hora extra de cobertura"
                  rows={3}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Valor total">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={inputClass}
                    value={form.valorTotal}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, valorTotal: e.target.value }))
                    }
                    placeholder="Ej: 3500000"
                    required
                  />
                </Field>

                <Field label="Anticipo">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={inputClass}
                    value={form.anticipo}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, anticipo: e.target.value }))
                    }
                    placeholder="Ej: 1000000"
                  />
                </Field>
              </div>

              <Field label="Fecha de saldo">
                <input
                  type="date"
                  className={inputClass}
                  value={form.fechaSaldo}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, fechaSaldo: e.target.value }))
                  }
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Banco">
                  <input
                    className={inputClass}
                    value={form.banco}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, banco: e.target.value }))
                    }
                    placeholder="Ej: Bancolombia"
                  />
                </Field>

                <Field label="Tipo de cuenta">
                  <select
                    className={inputClass}
                    value={form.tipoCuenta}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, tipoCuenta: e.target.value }))
                    }
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
                    value={form.numeroCuenta}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, numeroCuenta: e.target.value }))
                    }
                    placeholder="Ej: 12345678901"
                  />
                </Field>

                <Field label="Titular">
                  <input
                    className={inputClass}
                    value={form.titular}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, titular: e.target.value }))
                    }
                    placeholder="Ej: Juan Pérez"
                  />
                </Field>
              </div>

              <Field label="Documento / NIT">
                <input
                  className={inputClass}
                  value={form.documentoNit}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, documentoNit: e.target.value }))
                  }
                  placeholder="Ej: 900123456-7"
                />
              </Field>

              <div className="space-y-3 rounded-xl border border-bloom-border bg-bloom-canvas/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
                  Contacto del proveedor
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Teléfono">
                    <input
                      className={inputClass}
                      value={form.telefono}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, telefono: e.target.value }))
                      }
                      placeholder="Ej: 3001234567"
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      className={inputClass}
                      value={form.email}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, email: e.target.value }))
                      }
                      placeholder="correo@proveedor.com"
                    />
                  </Field>
                </div>
                <Field label="Dirección / Residencia">
                  <input
                    className={inputClass}
                    value={form.direccion}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, direccion: e.target.value }))
                    }
                    placeholder="Ej: Calle 10 #20-30, Medellín"
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
                  className="rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
                >
                  {submitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
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

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
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
