import Link from "next/link";
import type { CitaRow } from "@/app/data/citas";
import { sortCitasBySchedule } from "@/lib/citas";
import { CitaListItem } from "./CitaListItem";

type CitasHoySectionProps = {
  citas: CitaRow[];
  bodasById: Record<string, { nombre_pareja: string }>;
  leadsById: Record<string, { nombre_pareja: string }>;
};

export function CitasHoySection({
  citas,
  bodasById,
  leadsById,
}: CitasHoySectionProps) {
  const sorted = sortCitasBySchedule(citas);

  if (sorted.length === 0) return null;

  return (
    <section className="mb-8 rounded-2xl border border-bloom-accent/30 bg-bloom-accent/5 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-bloom-ink">Citas de hoy</h2>
          <p className="mt-1 text-sm text-bloom-muted">
            {sorted.length}{" "}
            {sorted.length === 1 ? "cita programada" : "citas programadas"}
          </p>
        </div>
        <Link
          href="/calendario"
          className="text-sm font-medium text-bloom-accent hover:text-bloom-accent-hover"
        >
          Ver calendario →
        </Link>
      </div>

      <ul className="mt-4 space-y-2">
        {sorted.map((cita) => (
          <li key={cita.id}>
            <CitaListItem
              cita={cita}
              bodasById={bodasById}
              leadsById={leadsById}
              compact
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
