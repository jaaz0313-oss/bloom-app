/** Opciones de hora cada 30 min de 6:00 a 23:00 (valor HH:mm para formulario/DB). */
export function buildCitaTimeSlotOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];

  for (let hour = 6; hour <= 23; hour++) {
    for (const minute of [0, 30] as const) {
      if (hour === 23 && minute === 30) continue;
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      options.push({ value, label: formatTimeSlotLabel(hour, minute) });
    }
  }

  return options;
}

export const CITA_TIME_SLOT_OPTIONS = buildCitaTimeSlotOptions();

function formatTimeSlotLabel(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const mm = minute === 0 ? "00" : "30";
  return `${hour12}:${mm} ${period}`;
}

/** Convierte HH:mm del selector a time de Postgres (HH:mm:ss). */
export function citaTimeToDb(value: string): string {
  if (!value) return value;
  return value.length === 5 ? `${value}:00` : value;
}

/** Convierte time de Postgres a HH:mm para el selector. */
export function citaTimeFromDb(value: string): string {
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  const hours = match[1].padStart(2, "0");
  return `${hours}:${match[2]}`;
}
