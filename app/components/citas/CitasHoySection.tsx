import Link from "next/link";
import type { CitaRow } from "@/app/data/citas";
import { sortCitasBySchedule, type CitaWhatsAppLookupContext } from "@/lib/citas";
import { CitaHoyItem } from "./CitaHoyItem";

type CitasHoySectionProps = {
  citas: CitaRow[];
  context: CitaWhatsAppLookupContext;
};

export function CitasHoySection({ citas, context }: CitasHoySectionProps) {
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

      <ul className="mt-4 space-y-3">
        {sorted.map((cita) => (
          <li key={cita.id}>
            <CitaHoyItem cita={cita} context={context} />
          </li>
        ))}
      </ul>
    </section>
  );
}
