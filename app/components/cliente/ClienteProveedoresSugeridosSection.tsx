"use client";

import { useId, useMemo, useState } from "react";
import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import {
  sortProveedoresSugeridos,
  type ProveedorSugeridoWithSelection,
} from "@/app/data/proveedores-sugeridos";
import {
  buildInstagramUrl,
  formatInstagramDisplay,
  groupProveedoresSugeridosByCategoria,
} from "@/lib/proveedores-sugeridos";

type ClienteProveedoresSugeridosSectionProps = {
  bodaId: string;
  initialProveedores: ProveedorSugeridoWithSelection[];
};

export function ClienteProveedoresSugeridosSection({
  bodaId,
  initialProveedores,
}: ClienteProveedoresSugeridosSectionProps) {
  const panelId = useId();
  const { t } = useClienteLocale();
  const [open, setOpen] = useState(true);
  const [proveedores, setProveedores] = useState(() =>
    sortProveedoresSugeridos(initialProveedores),
  );
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(
    () => groupProveedoresSugeridosByCategoria(proveedores),
    [proveedores],
  );

  const seleccionadosCount = useMemo(
    () => proveedores.filter((item) => item.seleccionado).length,
    [proveedores],
  );

  if (proveedores.length === 0) {
    return null;
  }

  async function toggleSeleccion(proveedor: ProveedorSugeridoWithSelection) {
    const nextSeleccionado = !proveedor.seleccionado;
    const previous = proveedores;

    setProveedores((current) =>
      current.map((item) =>
        item.id === proveedor.id
          ? { ...item, seleccionado: nextSeleccionado }
          : item,
      ),
    );
    setSavingIds((current) => new Set(current).add(proveedor.id));
    setError(null);

    try {
      const response = await fetch(
        `/api/cliente/${bodaId}/proveedores-sugeridos-seleccion`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proveedor_sugerido_id: proveedor.id,
            seleccionado: nextSeleccionado,
          }),
        },
      );

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? t.proveedoresSugeridosSaveError);
      }
    } catch (toggleError) {
      setProveedores(previous);
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : t.proveedoresSugeridosSaveError,
      );
    } finally {
      setSavingIds((current) => {
        const next = new Set(current);
        next.delete(proveedor.id);
        return next;
      });
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-bloom-border bg-bloom-surface shadow-sm">
      <button
        type="button"
        id={`${panelId}-trigger`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[52px] w-full touch-manipulation flex-col gap-3 bg-gradient-to-br from-bloom-canvas to-[#f3ebe3] px-5 py-4 text-left transition-colors hover:from-bloom-canvas hover:to-[#efe6dc] active:bg-bloom-canvas/80 sm:px-8 sm:py-5"
      >
        <span className="flex w-full items-start justify-between gap-4">
          <span className="min-w-0 flex-1">
            <span className="font-display text-2xl text-bloom-ink sm:text-3xl">
              {t.proveedoresSugeridosTitle}
            </span>
          </span>
          <AccordionChevron open={open} />
        </span>
        <span className="block w-full text-sm font-medium text-bloom-muted">
          {t.proveedoresSugeridosSubtitle(
            seleccionadosCount,
            proveedores.length,
          )}
        </span>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={`${panelId}-trigger`}
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-8 border-t border-bloom-border/80 px-5 py-6 sm:px-8 sm:py-8">
            <p className="text-sm leading-relaxed text-bloom-muted">
              {t.proveedoresSugeridosIntro}
            </p>

            {grouped.map((categoriaGroup) => (
              <div key={categoriaGroup.categoria}>
                <h3 className="font-display text-xl text-bloom-accent">
                  {categoriaGroup.categoria}
                </h3>
                <ul className="mt-4 space-y-3">
                  {categoriaGroup.proveedores.map((proveedor) => {
                    const instagramUrl = buildInstagramUrl(proveedor.instagram);
                    const isSaving = savingIds.has(proveedor.id);

                    return (
                      <li key={proveedor.id}>
                        <div className="flex items-start gap-3 rounded-xl border border-bloom-border/80 bg-bloom-canvas/40 px-4 py-4 sm:px-5">
                          <button
                            type="button"
                            onClick={() => toggleSeleccion(proveedor)}
                            disabled={isSaving}
                            aria-pressed={proveedor.seleccionado}
                            aria-label={
                              proveedor.seleccionado
                                ? t.proveedoresSugeridosUnselect
                                : t.proveedoresSugeridosSelect
                            }
                            className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-base transition-colors disabled:opacity-60 ${
                              proveedor.seleccionado
                                ? "border-bloom-success bg-bloom-success text-white"
                                : "border-bloom-border bg-bloom-surface text-bloom-muted hover:border-bloom-accent hover:text-bloom-accent"
                            }`}
                          >
                            {proveedor.seleccionado ? "✓" : ""}
                          </button>

                          <div className="min-w-0 flex-1">
                            <p className="font-display text-lg text-bloom-ink">
                              {proveedor.nombre_proveedor}
                            </p>
                            <p className="mt-0.5 text-sm text-bloom-muted">
                              {proveedor.categoria}
                            </p>
                            {instagramUrl && (
                              <a
                                href={instagramUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-bloom-accent underline decoration-bloom-accent/40 underline-offset-2"
                              >
                                <InstagramIcon />
                                {formatInstagramDisplay(proveedor.instagram)}
                              </a>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {error && (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function AccordionChevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`mt-1 h-5 w-5 shrink-0 text-bloom-muted transition-transform duration-300 ${
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

function InstagramIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}
