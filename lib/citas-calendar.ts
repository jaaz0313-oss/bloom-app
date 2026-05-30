export type CalendarView = "mes" | "semana" | "dia";

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function getTodayIso(): string {
  return toIsoDate(new Date());
}

/** Primer día del mes de la fecha dada (ancla estable para vista mensual). */
export function getMonthAnchor(iso: string): string {
  const d = parseIsoDate(iso);
  return toIsoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function addMonths(iso: string, months: number): string {
  const d = parseIsoDate(iso);
  d.setMonth(d.getMonth() + months);
  return toIsoDate(d);
}

/** Navegación mensual sin desbordar días (ej. 31 → mes siguiente). */
export function addMonthsAnchor(iso: string, months: number): string {
  const anchor = parseIsoDate(getMonthAnchor(iso));
  return toIsoDate(
    new Date(anchor.getFullYear(), anchor.getMonth() + months, 1),
  );
}

export function startOfWeek(iso: string): string {
  const d = parseIsoDate(iso);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toIsoDate(d);
}

export function getWeekDays(iso: string): string[] {
  const start = startOfWeek(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function getMonthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const offset = startDay === 0 ? 6 : startDay - 1;
  const daysInMonth = last.getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toIsoDate(new Date(year, month, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const WEEKDAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function getMonthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

export function getWeekdayShort(index: number): string {
  return WEEKDAY_SHORT[index] ?? "";
}

export function isToday(iso: string): boolean {
  const normalized = iso.includes("T") ? iso.split("T")[0] : iso;
  return normalized === getTodayIso();
}

export function isSameMonth(iso: string, year: number, month: number): boolean {
  const d = parseIsoDate(iso);
  return d.getFullYear() === year && d.getMonth() === month;
}
