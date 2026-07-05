import type { LeadRow } from "@/app/data/leads";

export type LeadInactivityUrgency = "urgent" | "warning";

export type LeadInactivityAlert = {
  leadId: string;
  nombrePareja: string;
  diasSinAvanzar: number;
  urgency: LeadInactivityUrgency;
};

export const LEAD_INACTIVITY_URGENCY_LABELS: Record<
  LeadInactivityUrgency,
  string
> = {
  urgent: "🔴 Sin avanzar",
  warning: "🟡 Sin avanzar",
};

export const LEAD_INACTIVITY_URGENCY_STYLES: Record<
  LeadInactivityUrgency,
  string
> = {
  urgent: "bg-red-100 text-red-800",
  warning: "bg-amber-100 text-amber-900",
};

export function getDaysSince(
  isoDateTime: string,
  fromDate = new Date(),
): number {
  const created = new Date(isoDateTime);
  created.setHours(0, 0, 0, 0);
  const today = new Date(fromDate);
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - created.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function getLeadInactivityUrgency(
  diasSinAvanzar: number,
): LeadInactivityUrgency | null {
  if (diasSinAvanzar >= 8) return "urgent";
  if (diasSinAvanzar >= 3) return "warning";
  return null;
}

export function buildLeadInactivityAlerts(
  activeLeads: LeadRow[],
  fromDate = new Date(),
): LeadInactivityAlert[] {
  const alerts: LeadInactivityAlert[] = [];

  for (const lead of activeLeads) {
    const diasSinAvanzar = getDaysSince(lead.created_at, fromDate);
    const urgency = getLeadInactivityUrgency(diasSinAvanzar);
    if (!urgency) continue;

    alerts.push({
      leadId: lead.id,
      nombrePareja: lead.nombre_pareja,
      diasSinAvanzar,
      urgency,
    });
  }

  const urgencyOrder: Record<LeadInactivityUrgency, number> = {
    urgent: 0,
    warning: 1,
  };

  return alerts.sort((a, b) => {
    const byUrgency = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (byUrgency !== 0) return byUrgency;
    return b.diasSinAvanzar - a.diasSinAvanzar;
  });
}
