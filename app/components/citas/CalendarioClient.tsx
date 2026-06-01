"use client";

import { useEffect, useMemo, useState } from "react";
import type { CitaRow } from "@/app/data/citas";
import {
  CITA_TIPO_DOT_STYLES,
  CITA_TIPO_LABELS,
  CITA_TIPO_STYLES,
} from "@/app/data/citas";
import {
  formatCitaHorario,
  getCitaRelacionLabel,
  normalizeCitaFecha,
  normalizeCitaRow,
  sortCitasBySchedule,
} from "@/lib/citas";
import {
  addDays,
  addMonthsAnchor,
  getMonthAnchor,
  getMonthLabel,
  getTodayIso,
  getWeekDays,
  getWeekdayShort,
  isToday,
  parseIsoDate,
  type CalendarView,
} from "@/lib/citas-calendar";
import { formatShortDateStable } from "@/lib/format";
import type { UserRole } from "@/lib/auth/roles";
import { CalendarioMensual } from "./CalendarioMensual";
import { CitaCalendarioDetalleModal } from "./CitaCalendarioDetalleModal";
import { CitaDiaOverflowModal } from "./CitaDiaOverflowModal";
import {
  CitaFormModal,
  type CitaLookupBoda,
  type CitaLookupEquipo,
  type CitaLookupLead,
} from "./CitaFormModal";
import { CitaConAcciones } from "./CitaConAcciones";

type CalendarioClientProps = {
  citas: CitaRow[];
  bodas: CitaLookupBoda[];
  leads: CitaLookupLead[];
  equipo: CitaLookupEquipo[];
  role: UserRole;
  currentUserId: string;
  currentUserNombre: string;
};

export function CalendarioClient({
  citas: initialCitas,
  bodas,
  leads,
  equipo,
  role,
  currentUserId,
  currentUserNombre,
}: CalendarioClientProps) {
  const [citas, setCitas] = useState(() => initialCitas.map(normalizeCitaRow));

  useEffect(() => {
    setCitas((prev) => {
      const merged = new Map<string, CitaRow>();
      for (const c of initialCitas.map(normalizeCitaRow)) {
        merged.set(c.id, c);
      }
      for (const c of prev) {
        if (!merged.has(c.id)) {
          merged.set(c.id, normalizeCitaRow(c));
        }
      }
      return sortCitasBySchedule(Array.from(merged.values()));
    });
  }, [initialCitas]);

  const [view, setView] = useState<CalendarView>("mes");
  const [anchorDate, setAnchorDate] = useState(() => getTodayIso());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCita, setSelectedCita] = useState<CitaRow | null>(null);
  const [overflowDay, setOverflowDay] = useState<{
    fecha: string;
    citas: CitaRow[];
  } | null>(null);

  const bodasById = useMemo(
    () => Object.fromEntries(bodas.map((b) => [b.id, b])),
    [bodas],
  );
  const leadsById = useMemo(
    () => Object.fromEntries(leads.map((l) => [l.id, l])),
    [leads],
  );

  const citasByDate = useMemo(() => {
    const map = new Map<string, CitaRow[]>();
    for (const cita of sortCitasBySchedule(citas)) {
      const fechaKey = normalizeCitaFecha(cita.fecha);
      if (!fechaKey) continue;
      const list = map.get(fechaKey) ?? [];
      list.push({ ...cita, fecha: fechaKey });
      map.set(fechaKey, list);
    }
    return map;
  }, [citas]);

  const monthAnchorIso = getMonthAnchor(anchorDate);
  const monthAnchor = parseIsoDate(monthAnchorIso);
  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();
  const weekDays = getWeekDays(anchorDate);
  const todayIso = getTodayIso();

  function goToToday() {
    setAnchorDate(todayIso);
  }

  function navigate(delta: number) {
    if (view === "mes") {
      setAnchorDate(addMonthsAnchor(anchorDate, delta));
    } else if (view === "semana") {
      setAnchorDate(addDays(anchorDate, delta * 7));
    } else {
      setAnchorDate(addDays(anchorDate, delta));
    }
  }

  const headerLabel =
    view === "mes"
      ? getMonthLabel(year, month)
      : view === "semana"
        ? `${formatShortDateStable(weekDays[0])} – ${formatShortDateStable(weekDays[6])}`
        : formatShortDateStable(anchorDate);

  const dayCitas = citasByDate.get(normalizeCitaFecha(anchorDate)) ?? [];

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

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-full border border-bloom-border bg-bloom-surface p-1">
          {(["mes", "semana", "dia"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
                view === v
                  ? "bg-bloom-accent text-white"
                  : "text-bloom-ink hover:bg-bloom-canvas"
              }`}
            >
              {v === "mes" ? "Mes" : v === "semana" ? "Semana" : "Día"}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-bloom-accent-hover"
        >
          Nueva cita
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-bloom-border bg-bloom-surface px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full border border-bloom-border px-3 py-1.5 text-sm font-medium text-bloom-ink hover:bg-bloom-canvas"
        >
          ←
        </button>
        <div className="text-center">
          <p className="font-display text-lg text-bloom-ink">{headerLabel}</p>
          <button
            type="button"
            onClick={goToToday}
            className="mt-0.5 text-xs font-medium text-bloom-accent hover:text-bloom-accent-hover"
          >
            Hoy
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate(1)}
          className="rounded-full border border-bloom-border px-3 py-1.5 text-sm font-medium text-bloom-ink hover:bg-bloom-canvas"
        >
          →
        </button>
      </div>

      {view === "mes" && (
        <CalendarioMensual
          year={year}
          month={month}
          citasByDate={citasByDate}
          onDayClick={(fechaKey) => {
            setAnchorDate(fechaKey);
            setView("dia");
          }}
          onCitaClick={(cita) => setSelectedCita(cita)}
          onVerMasClick={(fechaKey, dayCitas) =>
            setOverflowDay({ fecha: fechaKey, citas: dayCitas })
          }
        />
      )}

      {view === "semana" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
          {weekDays.map((iso) => {
            const list = citasByDate.get(normalizeCitaFecha(iso)) ?? [];
            return (
              <div
                key={iso}
                className={`rounded-xl border border-bloom-border bg-bloom-surface p-2 ${
                  isToday(iso) ? "ring-2 ring-bloom-accent/30" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAnchorDate(iso);
                    setView("dia");
                  }}
                  className="w-full text-left"
                >
                  <p className="text-xs font-medium text-bloom-muted">
                    {getWeekdayShort(
                      (parseIsoDate(iso).getDay() + 6) % 7,
                    )}
                  </p>
                  <p className="text-sm font-medium text-bloom-ink">
                    {parseIsoDate(iso).getDate()}
                  </p>
                </button>
                <ul className="mt-2 space-y-1.5">
                  {list.map((c) => (
                    <li
                      key={c.id}
                      className={`rounded-lg border px-2 py-1.5 text-xs ${CITA_TIPO_STYLES[c.tipo]}`}
                    >
                      <p className="font-medium">{c.titulo}</p>
                      <p className="mt-0.5 opacity-80">{formatCitaHorario(c)}</p>
                      {getCitaRelacionLabel(c, bodasById, leadsById) && (
                        <p className="mt-0.5 truncate opacity-80">
                          {getCitaRelacionLabel(c, bodasById, leadsById)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {view === "dia" && (
        <div className="space-y-3">
          {dayCitas.length === 0 ? (
            <p className="rounded-xl border border-dashed border-bloom-border px-6 py-10 text-center text-sm text-bloom-muted">
              No hay citas este día.
            </p>
          ) : (
            dayCitas.map((c) => (
              <CitaConAcciones
                key={c.id}
                cita={c}
                bodas={bodas}
                leads={leads}
                equipo={equipo}
                role={role}
                currentUserId={currentUserId}
                currentUserNombre={currentUserNombre}
                onChange={(next) => handleCitaChange(c.id, next)}
              />
            ))
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-bloom-muted">
        {(
          Object.entries(CITA_TIPO_LABELS) as [keyof typeof CITA_TIPO_LABELS, string][]
        ).map(([tipo, label]) => (
          <span key={tipo} className="inline-flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${CITA_TIPO_DOT_STYLES[tipo as keyof typeof CITA_TIPO_DOT_STYLES]}`}
            />
            {label}
          </span>
        ))}
      </div>

      <CitaFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(cita) => {
          const normalized = normalizeCitaRow(cita);
          setCitas((prev) => sortCitasBySchedule([...prev, normalized]));
          const fecha = normalizeCitaFecha(normalized.fecha);
          setAnchorDate(fecha);
          setView("mes");
        }}
        role={role}
        currentUserId={currentUserId}
        currentUserNombre={currentUserNombre}
        bodas={bodas}
        leads={leads}
        equipo={equipo}
        defaultFecha={anchorDate}
      />

      <CitaCalendarioDetalleModal
        cita={selectedCita}
        onClose={() => setSelectedCita(null)}
        bodas={bodas}
        leads={leads}
        equipo={equipo}
        role={role}
        currentUserId={currentUserId}
        currentUserNombre={currentUserNombre}
        onChange={(next) => {
          if (selectedCita) {
            handleCitaChange(selectedCita.id, next);
          }
        }}
      />

      <CitaDiaOverflowModal
        fecha={overflowDay?.fecha ?? null}
        citas={overflowDay?.citas ?? []}
        onClose={() => setOverflowDay(null)}
        onSelectCita={(cita) => {
          setOverflowDay(null);
          setSelectedCita(cita);
        }}
      />
    </div>
  );
}
