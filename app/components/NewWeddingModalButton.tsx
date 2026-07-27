"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AUDITORIA_ACCIONES, logAuditoria } from "@/lib/auditoria";
import { insertarCronograma } from "@/lib/cronograma";
import {
  DRIVE_FOLDER_CREATE_WARNING,
  ensureBodaDriveFolder,
} from "@/lib/ensure-boda-drive-folder";
import { supabase } from "@/lib/supabase";

type FormState = {
  nombrePareja: string;
  fechaBoda: string; // "YYYY-MM-DD"
  ciudad: string;
  totalProveedores: string; // controlled input
};

export function NewWeddingModalButton() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [driveWarning, setDriveWarning] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    nombrePareja: "",
    fechaBoda: "",
    ciudad: "",
    totalProveedores: "",
  });

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!supabase) {
      setError(
        "Supabase no está configurado. Revisa las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    const nombrePareja = form.nombrePareja.trim();
    const ciudad = form.ciudad.trim();
    const fechaBoda = form.fechaBoda;
    const totalProveedores = Number(form.totalProveedores);

    if (!nombrePareja) return setError("Ingresa el nombre de la pareja.");
    if (!fechaBoda) return setError("Ingresa la fecha de la boda.");
    if (!ciudad) return setError("Ingresa la ciudad.");
    if (!Number.isFinite(totalProveedores) || totalProveedores < 0) {
      return setError(
        "Ingresa un total de proveedores estimado válido (>= 0).",
      );
    }

    setSubmitting(true);
    try {
      const { data: nuevaBoda, error: insertError } = await supabase
        .from("bodas")
        .insert({
          nombre_pareja: nombrePareja,
          fecha_boda: fechaBoda,
          ciudad: ciudad,
          total_proveedores: Math.round(totalProveedores),
          // Mantener consistente con el UI: al crear, inicia en 0 contratados.
          proveedores_contratados: 0,
        })
        .select("id")
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      const cronogramaResult = await insertarCronograma(
        supabase,
        nuevaBoda.id,
        fechaBoda,
      );
      if (!cronogramaResult.ok) {
        setError(cronogramaResult.message);
        return;
      }

      await logAuditoria({
        accion: AUDITORIA_ACCIONES.BODA_CREADA,
        entidad: "boda",
        entidadId: nuevaBoda.id,
        bodaNombre: nombrePareja,
        detalle: `${ciudad} · ${fechaBoda}`,
      });

      const driveResult = await ensureBodaDriveFolder(nuevaBoda.id);
      setDriveWarning(driveResult.ok ? null : DRIVE_FOLDER_CREATE_WARNING);

      setOpen(false);
      setForm({
        nombrePareja: "",
        fechaBoda: "",
        ciudad: "",
        totalProveedores: "",
      });
      router.refresh(); // vuelve a ejecutar el Server Component de la página
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex flex-col items-stretch gap-2 sm:items-end">
        <button
          type="button"
          onClick={() => {
            setDriveWarning(null);
            setOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-bloom-accent px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bloom-accent"
        >
          <PlusIcon />
          Nueva boda
        </button>
        {driveWarning && (
          <p
            className="max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs text-amber-900 sm:text-right"
            role="status"
          >
            {driveWarning}
          </p>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Nueva boda"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl text-bloom-ink">
                  Crear nueva boda
                </h2>
                <p className="mt-1 text-sm text-bloom-muted">
                  Completa la información para iniciar el plan.
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
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-bloom-ink">
                  Nombre de la pareja
                </label>
                <input
                  className="w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30"
                  value={form.nombrePareja}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, nombrePareja: e.target.value }))
                  }
                  placeholder="Ej: Valentina & Andrés"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-bloom-ink">
                    Fecha de la boda
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30"
                    value={form.fechaBoda}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, fechaBoda: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-bloom-ink">
                    Ciudad
                  </label>
                  <input
                    className="w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30"
                    value={form.ciudad}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, ciudad: e.target.value }))
                    }
                    placeholder="Ej: Medellín"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-bloom-ink">
                  Total de proveedores estimado
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  className="w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30"
                  value={form.totalProveedores}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      totalProveedores: e.target.value,
                    }))
                  }
                  placeholder="Ej: 18"
                  required
                />
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

