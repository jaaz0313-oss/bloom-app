"use client";

import { useMemo, useState } from "react";
import type { AuditoriaRow } from "@/app/data/auditoria";
import { formatDateTimeStable } from "@/lib/format";

type AuditoriaAdminClientProps = {
  registros: AuditoriaRow[];
};

const ALL = "";

export function AuditoriaAdminClient({ registros }: AuditoriaAdminClientProps) {
  const [bodaFilter, setBodaFilter] = useState(ALL);
  const [usuarioFilter, setUsuarioFilter] = useState(ALL);
  const [accionFilter, setAccionFilter] = useState(ALL);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const bodasOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of registros) {
      if (r.boda_nombre?.trim()) set.add(r.boda_nombre.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [registros]);

  const usuariosOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of registros) {
      if (r.usuario_nombre?.trim()) set.add(r.usuario_nombre.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [registros]);

  const accionesOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of registros) {
      if (r.accion?.trim()) set.add(r.accion.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [registros]);

  const filtered = useMemo(() => {
    return registros.filter((r) => {
      if (bodaFilter !== ALL && r.boda_nombre !== bodaFilter) return false;
      if (usuarioFilter !== ALL && r.usuario_nombre !== usuarioFilter) {
        return false;
      }
      if (accionFilter !== ALL && r.accion !== accionFilter) return false;

      const fecha = r.created_at.slice(0, 10);
      if (fechaDesde && fecha < fechaDesde) return false;
      if (fechaHasta && fecha > fechaHasta) return false;

      return true;
    });
  }, [registros, bodaFilter, usuarioFilter, accionFilter, fechaDesde, fechaHasta]);

  function clearFilters() {
    setBodaFilter(ALL);
    setUsuarioFilter(ALL);
    setAccionFilter(ALL);
    setFechaDesde("");
    setFechaHasta("");
  }

  const hasActiveFilters =
    bodaFilter !== ALL ||
    usuarioFilter !== ALL ||
    accionFilter !== ALL ||
    fechaDesde !== "" ||
    fechaHasta !== "";

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-2xl border border-bloom-border bg-bloom-surface p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-sm font-medium text-bloom-ink">Filtros</p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-bloom-accent hover:text-bloom-accent-hover"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FilterSelect
            id="auditoria-boda"
            label="Boda"
            value={bodaFilter}
            onChange={setBodaFilter}
            options={bodasOptions}
          />
          <FilterSelect
            id="auditoria-usuario"
            label="Usuario"
            value={usuarioFilter}
            onChange={setUsuarioFilter}
            options={usuariosOptions}
          />
          <FilterSelect
            id="auditoria-accion"
            label="Tipo de acción"
            value={accionFilter}
            onChange={setAccionFilter}
            options={accionesOptions}
          />
          <div className="space-y-1.5">
            <label
              htmlFor="auditoria-desde"
              className="text-sm font-medium text-bloom-ink"
            >
              Desde
            </label>
            <input
              id="auditoria-desde"
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="auditoria-hasta"
              className="text-sm font-medium text-bloom-ink"
            >
              Hasta
            </label>
            <input
              id="auditoria-hasta"
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <p className="text-sm text-bloom-muted">
        {filtered.length}{" "}
        {filtered.length === 1 ? "registro" : "registros"}
        {hasActiveFilters ? " (filtrados)" : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-bloom-border bg-bloom-surface/60 px-6 py-12 text-center">
          <p className="text-sm text-bloom-muted">
            No hay registros de auditoría
            {hasActiveFilters ? " con estos filtros" : ""}.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-bloom-border bg-bloom-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-bloom-border bg-bloom-canvas/60 text-xs font-medium uppercase tracking-wider text-bloom-muted">
                  <th className="px-5 py-3">Fecha y hora</th>
                  <th className="px-5 py-3">Usuario</th>
                  <th className="px-5 py-3">Acción</th>
                  <th className="px-5 py-3">Boda</th>
                  <th className="px-5 py-3">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bloom-border">
                {filtered.map((r) => (
                  <tr key={r.id} className="text-bloom-ink">
                    <td className="whitespace-nowrap px-5 py-3 text-bloom-muted">
                      {formatDateTimeStable(r.created_at)}
                    </td>
                    <td className="px-5 py-3 font-medium">
                      {r.usuario_nombre || "—"}
                    </td>
                    <td className="px-5 py-3">{r.accion}</td>
                    <td className="px-5 py-3 text-bloom-muted">
                      {r.boda_nombre || "—"}
                    </td>
                    <td className="max-w-xs px-5 py-3 text-bloom-muted">
                      {r.detalle || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-bloom-ink">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        <option value={ALL}>Todas</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2.5 text-sm text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/20";
