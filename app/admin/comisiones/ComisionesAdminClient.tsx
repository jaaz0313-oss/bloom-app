"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProveedorRow } from "@/app/data/providers";
import {
  calcularResumenComisiones,
  getPorcentajeComisionProveedor,
  getValorComisionProveedor,
} from "@/lib/comisiones";
import { formatCurrency, formatShortDateStable } from "@/lib/format";
import { supabase } from "@/lib/supabase";

export type BodaComisionOption = {
  id: string;
  nombre_pareja: string;
  fecha_boda: string;
};

export type ProveedorComisionRow = ProveedorRow & {
  bodas: BodaComisionOption | null;
};

type ComisionesAdminClientProps = {
  bodas: BodaComisionOption[];
  proveedores: ProveedorComisionRow[];
};

const ALL_BODAS = "";

export function ComisionesAdminClient({
  bodas,
  proveedores,
}: ComisionesAdminClientProps) {
  const router = useRouter();
  const [bodaFilter, setBodaFilter] = useState(ALL_BODAS);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const proveedoresByBoda = useMemo(() => {
    const map = new Map<string, ProveedorComisionRow[]>();
    for (const p of proveedores) {
      const list = map.get(p.boda_id) ?? [];
      list.push(p);
      map.set(p.boda_id, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    }
    return map;
  }, [proveedores]);

  const bodasToShow = useMemo(() => {
    if (bodaFilter === ALL_BODAS) {
      const idsWithComision = new Set(proveedores.map((p) => p.boda_id));
      return bodas.filter((b) => idsWithComision.has(b.id));
    }
    const boda = bodas.find((b) => b.id === bodaFilter);
    return boda ? [boda] : [];
  }, [bodaFilter, bodas, proveedores]);

  const resumenGeneral = useMemo(
    () => calcularResumenComisiones(proveedores),
    [proveedores],
  );

  const filteredResumen = useMemo(() => {
    if (bodaFilter === ALL_BODAS) return resumenGeneral;
    const filtered = proveedores.filter((p) => p.boda_id === bodaFilter);
    return calcularResumenComisiones(filtered);
  }, [bodaFilter, proveedores, resumenGeneral]);

  async function handleMarcarRecibida(proveedorId: string) {
    if (!supabase || updatingId) return;

    setUpdatingId(proveedorId);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("proveedores")
        .update({
          comision_recibida: true,
          comision_recibida_at: new Date().toISOString(),
        })
        .eq("id", proveedorId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      router.refresh();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-2xl border border-bloom-border bg-bloom-surface p-4 shadow-sm sm:p-5">
        <label
          htmlFor="boda-filter"
          className="text-sm font-medium text-bloom-ink"
        >
          Filtrar por boda
        </label>
        <select
          id="boda-filter"
          value={bodaFilter}
          onChange={(e) => setBodaFilter(e.target.value)}
          className="mt-2 w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2.5 text-sm text-bloom-ink focus:border-bloom-accent focus:outline-none focus:ring-2 focus:ring-bloom-accent/20"
        >
          <option value={ALL_BODAS}>Todas las bodas</option>
          {bodas.map((boda) => (
            <option key={boda.id} value={boda.id}>
              {boda.nombre_pareja}
              {boda.fecha_boda
                ? ` · ${formatShortDateStable(boda.fecha_boda)}`
                : ""}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {bodasToShow.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-bloom-border bg-bloom-surface/60 px-6 py-12 text-center">
          <p className="text-sm text-bloom-muted">
            No hay proveedores con comisión registrados
            {bodaFilter !== ALL_BODAS ? " para esta boda" : ""}.
          </p>
        </div>
      ) : (
        bodasToShow.map((boda) => {
          const lista = proveedoresByBoda.get(boda.id) ?? [];
          const resumenBoda = calcularResumenComisiones(lista);

          return (
            <section
              key={boda.id}
              className="rounded-2xl border border-bloom-border bg-bloom-surface shadow-sm"
            >
              <div className="flex flex-col gap-2 border-b border-bloom-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-xl text-bloom-ink">
                    {boda.nombre_pareja}
                  </h2>
                  {boda.fecha_boda && (
                    <p className="text-sm text-bloom-muted">
                      {formatShortDateStable(boda.fecha_boda)}
                    </p>
                  )}
                </div>
                <Link
                  href={`/bodas/${boda.id}`}
                  className="text-sm font-medium text-bloom-accent hover:text-bloom-accent-hover"
                >
                  Ver boda →
                </Link>
              </div>

              {lista.length === 0 ? (
                <p className="px-5 py-8 text-sm text-bloom-muted">
                  Sin proveedores con comisión en esta boda.
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-bloom-border bg-bloom-canvas/60 text-xs font-medium uppercase tracking-wider text-bloom-muted">
                          <th className="px-5 py-3">Proveedor</th>
                          <th className="px-5 py-3">Categoría</th>
                          <th className="px-5 py-3 text-right">Contrato</th>
                          <th className="px-5 py-3 text-right">%</th>
                          <th className="px-5 py-3 text-right">Comisión</th>
                          <th className="px-5 py-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-bloom-border">
                        {lista.map((p) => {
                          const pct = getPorcentajeComisionProveedor(p);
                          const valorComision = getValorComisionProveedor(p);
                          const isUpdating = updatingId === p.id;

                          return (
                            <tr key={p.id} className="text-bloom-ink">
                              <td className="px-5 py-3 font-medium">
                                {p.nombre}
                              </td>
                              <td className="px-5 py-3 text-bloom-muted">
                                {p.categoria}
                              </td>
                              <td className="px-5 py-3 text-right tabular-nums">
                                {formatCurrency(p.valor_total)}
                              </td>
                              <td className="px-5 py-3 text-right tabular-nums">
                                {pct}%
                              </td>
                              <td className="px-5 py-3 text-right font-medium tabular-nums">
                                {formatCurrency(valorComision)}
                              </td>
                              <td className="px-5 py-3">
                                {p.comision_recibida ? (
                                  <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                    Recibida
                                  </span>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                                      Pendiente
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleMarcarRecibida(p.id)
                                      }
                                      disabled={isUpdating}
                                      className="rounded-full border border-bloom-border px-2.5 py-0.5 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas disabled:opacity-60"
                                    >
                                      {isUpdating
                                        ? "Guardando..."
                                        : "Marcar recibida"}
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid gap-3 border-t border-bloom-border bg-bloom-canvas/40 px-5 py-4 sm:grid-cols-3">
                    <ResumenItem
                      label="Total esperado"
                      value={formatCurrency(resumenBoda.totalEsperado)}
                    />
                    <ResumenItem
                      label="Total recibido"
                      value={formatCurrency(resumenBoda.totalRecibido)}
                    />
                    <ResumenItem
                      label="Pendiente"
                      value={formatCurrency(resumenBoda.totalPendiente)}
                    />
                  </div>
                </>
              )}
            </section>
          );
        })
      )}

      {proveedores.length > 0 && (
        <div className="rounded-2xl border border-bloom-border bg-bloom-accent/5 p-5 shadow-sm">
          <h2 className="font-display text-lg text-bloom-ink">
            {bodaFilter === ALL_BODAS
              ? "Resumen general"
              : "Resumen de la boda seleccionada"}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <ResumenItem
              label="Comisiones esperadas"
              value={formatCurrency(filteredResumen.totalEsperado)}
              large
            />
            <ResumenItem
              label="Comisiones recibidas"
              value={formatCurrency(filteredResumen.totalRecibido)}
              large
            />
            <ResumenItem
              label="Pendiente por cobrar"
              value={formatCurrency(filteredResumen.totalPendiente)}
              large
            />
          </div>
          {bodaFilter !== ALL_BODAS && (
            <p className="mt-4 text-xs text-bloom-muted">
              Cambia el filtro a «Todas las bodas» para ver el resumen global (
              {formatCurrency(resumenGeneral.totalEsperado)} esperadas).
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ResumenItem({
  label,
  value,
  large = false,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
        {label}
      </p>
      <p
        className={`mt-1 font-medium tabular-nums text-bloom-ink ${large ? "text-xl" : "text-base"}`}
      >
        {value}
      </p>
    </div>
  );
}
