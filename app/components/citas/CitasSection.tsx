"use client";

import { useEffect, useMemo, useState } from "react";
import type { CitaRow } from "@/app/data/citas";
import {
  filterCitasFuturas,
  normalizeCitaRow,
  sortCitasBySchedule,
} from "@/lib/citas";
import type { UserRole } from "@/lib/auth/roles";
import {
  CitaFormModal,
  type CitaLookupBoda,
  type CitaLookupEquipo,
  type CitaLookupLead,
} from "./CitaFormModal";
import { CitaConAcciones } from "./CitaConAcciones";

type CitasSectionProps = {
  initialCitas: CitaRow[];
  bodas: CitaLookupBoda[];
  leads: CitaLookupLead[];
  equipo: CitaLookupEquipo[];
  role: UserRole;
  currentUserId: string;
  currentUserNombre: string;
  defaultBodaId?: string | null;
  defaultLeadId?: string | null;
  embedded?: boolean;
  futureOnly?: boolean;
};

export function CitasSection({
  initialCitas,
  bodas,
  leads,
  equipo,
  role,
  currentUserId,
  currentUserNombre,
  defaultBodaId = null,
  defaultLeadId = null,
  embedded = false,
  futureOnly = false,
}: CitasSectionProps) {
  const [citas, setCitas] = useState(() => initialCitas.map(normalizeCitaRow));
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setCitas(initialCitas.map(normalizeCitaRow));
  }, [initialCitas]);

  const sorted = useMemo(() => {
    const list = futureOnly ? filterCitasFuturas(citas) : citas;
    return sortCitasBySchedule(list);
  }, [citas, futureOnly]);

  function handleCitaChange(citaId: string, next: CitaRow | null) {
    setCitas((prev) => {
      if (!next) {
        return prev.filter((c) => c.id !== citaId);
      }
      return sortCitasBySchedule(
        prev.map((c) => (c.id === citaId ? normalizeCitaRow(next) : c)),
      );
    });
  }

  const shellClass = embedded
    ? ""
    : "rounded-2xl border border-bloom-border bg-bloom-surface p-5 shadow-sm";
  const Shell = embedded ? "div" : "section";

  return (
    <Shell className={shellClass}>
      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center ${
          embedded ? "sm:justify-end" : "sm:justify-between"
        }`}
      >
        {!embedded && (
          <div>
            <h2 className="font-display text-xl text-bloom-ink">Citas</h2>
            <p className="mt-1 text-sm text-bloom-muted">
              Reuniones y compromisos relacionados.
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center rounded-full border border-bloom-border bg-bloom-canvas px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
        >
          Agendar cita
        </button>
      </div>

      {sorted.length === 0 ? (
        <p
          className={`rounded-xl border border-dashed border-bloom-border bg-bloom-canvas/60 px-4 py-8 text-center text-sm text-bloom-muted ${
            embedded ? "mt-4" : "mt-6"
          }`}
        >
          {futureOnly
            ? "No hay citas próximas programadas"
            : "No hay citas programadas."}
        </p>
      ) : (
        <ul className={`space-y-3 ${embedded ? "mt-4" : "mt-5"}`}>
          {sorted.map((cita) => (
            <li key={cita.id}>
              <CitaConAcciones
                cita={cita}
                bodas={bodas}
                leads={leads}
                equipo={equipo}
                role={role}
                currentUserId={currentUserId}
                currentUserNombre={currentUserNombre}
                showDate
                onChange={(next) => handleCitaChange(cita.id, next)}
              />
            </li>
          ))}
        </ul>
      )}

      <CitaFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(cita) =>
          setCitas((prev) =>
            sortCitasBySchedule([...prev, normalizeCitaRow(cita)]),
          )
        }
        role={role}
        currentUserId={currentUserId}
        currentUserNombre={currentUserNombre}
        bodas={bodas}
        leads={leads}
        equipo={equipo}
        defaultBodaId={defaultBodaId}
        defaultLeadId={defaultLeadId}
      />
    </Shell>
  );
}
