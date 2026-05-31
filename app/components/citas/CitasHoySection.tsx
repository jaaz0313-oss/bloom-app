import Link from "next/link";
import { DashboardAccordionSection } from "@/app/components/DashboardAccordionSection";
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
    <DashboardAccordionSection
      title="Citas de hoy"
      count={sorted.length}
      subtitle={
        sorted.length === 1 ? "1 cita programada" : `${sorted.length} citas programadas`
      }
    >
      <div className="mb-4 flex justify-end">
        <Link
          href="/calendario"
          className="text-sm font-medium text-bloom-accent hover:text-bloom-accent-hover"
        >
          Ver calendario →
        </Link>
      </div>
      <ul className="space-y-3">
        {sorted.map((cita) => (
          <li key={cita.id}>
            <CitaHoyItem cita={cita} context={context} />
          </li>
        ))}
      </ul>
    </DashboardAccordionSection>
  );
}
