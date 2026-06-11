import type { ClienteCronogramaHitoEstado } from "@/lib/cliente-cronograma";
import type { ClientePagoUrgency } from "@/lib/cliente-pagos";

export type ClienteLocale = "es" | "en";

export const CLIENTE_DEFAULT_LOCALE: ClienteLocale = "es";

export function formatClienteWeddingDate(
  isoDate: string,
  locale: ClienteLocale,
): string {
  const date = new Date(isoDate + "T12:00:00");
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatClienteShortDate(
  isoDate: string,
  locale: ClienteLocale,
): string {
  const date = new Date(isoDate + "T12:00:00");
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatClienteCurrency(
  amount: number,
  locale: ClienteLocale,
): string {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getClienteMensajeMotivacional(
  diasParaBoda: number,
  locale: ClienteLocale,
): string {
  if (locale === "en") {
    if (diasParaBoda > 180) {
      return "You're at the start of this adventure — everything is on track 🌸";
    }
    if (diasParaBoda >= 90) {
      return "You're making great progress! We're working to make everything perfect 🌸";
    }
    if (diasParaBoda >= 30) {
      return "Almost there! The final details are coming together 🌸";
    }
    return "Your big day is very close — everything is ready to celebrate 🌸";
  }

  if (diasParaBoda > 180) {
    return "¡Están en el inicio de esta aventura! Todo va marchando bien 🌸";
  }
  if (diasParaBoda >= 90) {
    return "¡Van a buen ritmo! Estamos trabajando para que todo sea perfecto 🌸";
  }
  if (diasParaBoda >= 30) {
    return "¡Ya casi! Los detalles finales están tomando forma 🌸";
  }
  return "¡Su gran día está muy cerca! Todo está listo para celebrar 🌸";
}

export function formatClienteDiasParaBoda(
  dias: number,
  locale: ClienteLocale,
): { display: number; label: string; todayLabel: string } {
  if (locale === "en") {
    if (dias === 0) {
      return {
        display: 0,
        label: "Today is your big day!",
        todayLabel: "Today",
      };
    }
    if (dias < 0) {
      return {
        display: 0,
        label: "Your wedding has been celebrated",
        todayLabel: "—",
      };
    }
    if (dias === 1) {
      return { display: 1, label: "day until your wedding", todayLabel: "1" };
    }
    return {
      display: dias,
      label: "days until your wedding",
      todayLabel: String(dias),
    };
  }

  if (dias === 0) {
    return {
      display: 0,
      label: "¡Hoy es su gran día!",
      todayLabel: "Hoy",
    };
  }
  if (dias < 0) {
    return {
      display: 0,
      label: "Su boda ya fue celebrada",
      todayLabel: "—",
    };
  }
  if (dias === 1) {
    return { display: 1, label: "día para su boda", todayLabel: "1" };
  }
  return {
    display: dias,
    label: "días para su boda",
    todayLabel: String(dias),
  };
}

export function getClienteCronogramaMensajeAliento(
  porcentaje: number,
  locale: ClienteLocale,
): string {
  if (locale === "en") {
    if (porcentaje >= 100) {
      return "Everything is confirmed! Your timeline is complete and ready to celebrate 🌸";
    }
    if (porcentaje >= 67) {
      return "Almost there! Just a few details left to confirm 🌸";
    }
    if (porcentaje >= 34) {
      return "You're doing great! Your wedding is taking shape step by step 🌸";
    }
    if (porcentaje > 0) {
      return "Great start! Each confirmed category brings you closer to your big day 🌸";
    }
    return "We're here for you! You'll see progress in each category soon 🌸";
  }

  if (porcentaje >= 100) {
    return "¡Todo confirmado! Su cronograma está completo y listo para celebrar 🌸";
  }
  if (porcentaje >= 67) {
    return "¡Casi listos! Solo faltan algunos detalles por confirmar 🌸";
  }
  if (porcentaje >= 34) {
    return "¡Van muy bien! Su boda está tomando forma paso a paso 🌸";
  }
  if (porcentaje > 0) {
    return "¡Buen comienzo! Cada categoría confirmada los acerca a su gran día 🌸";
  }
  return "¡Estamos aquí para acompañarlos! Pronto verán avances en cada categoría 🌸";
}

export function getClienteCronogramaEstadoLabel(
  estado: ClienteCronogramaHitoEstado,
  locale: ClienteLocale,
): string {
  if (locale === "en") {
    if (estado === "confirmado") return "Confirmed";
    if (estado === "en_proceso") return "In progress";
    return "Pending";
  }
  if (estado === "confirmado") return "Confirmado";
  if (estado === "en_proceso") return "En proceso";
  return "Pendiente";
}

export function getClientePagoUrgencyLabel(
  urgency: ClientePagoUrgency,
  locale: ClienteLocale,
): string {
  if (locale === "en") {
    return urgency === "esta_semana" ? "Due this week" : "Due soon";
  }
  return urgency === "esta_semana" ? "Vence esta semana" : "Vence pronto";
}

export type ClienteUiCopy = {
  brandTagline: string;
  estadoBodaTitle: string;
  countdown: string;
  providersReady: string;
  providersReadySub: (contratados: number, total: number) => string;
  paymentsCompleted: string;
  paymentsCompletedSub: string;
  cronogramaTitle: string;
  cronogramaEmpty: string;
  cronogramaProgress: (done: number, total: number) => string;
  cronogramaProgressAria: (done: number, total: number, percent: number) => string;
  cronogramaGroupCompleted: string;
  cronogramaGroupInProgress: string;
  cronogramaGroupPending: string;
  cronogramaWithProvider: string;
  paymentOverviewTitle: string;
  paymentOverviewSubtitle: string;
  paymentCompleted: string;
  paymentProgressAria: (percent: number) => string;
  totalContracted: string;
  totalPaid: string;
  balanceDue: string;
  upcomingPaymentsTitle: string;
  upcomingPaymentsSubtitle: string;
  upcomingPaymentsCount: (count: number) => string;
  pendingAmount: string;
  paymentDueDate: string;
  toBeConfirmed: string;
  transferDetails: string;
  bank: string;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
  documentNit: string;
  providersTitle: string;
  providersSubtitle: (count: number) => string;
  providersEmpty: string;
  totalValue: string;
  depositPaid: string;
  pendingBalance: string;
  balanceDueDate: string;
  paymentHistory: string;
  noPaymentsRecorded: string;
  noConcept: string;
  seatingTitle: string;
  seatingSubtitle: string;
  viewSeatingPlan: string;
  downloadQuote: string;
  downloadProjection: string;
  generatingPdf: string;
  downloadQuoteError: string;
  downloadProjectionError: string;
  languageToggleLabel: string;
};

const UI_ES: ClienteUiCopy = {
  brandTagline: "Bloom by Celestia",
  estadoBodaTitle: "Estado de tu boda",
  countdown: "Cuenta regresiva",
  providersReady: "Proveedores listos",
  providersReadySub: (c, t) => `${c} de ${t} categorías`,
  paymentsCompleted: "Pagos completados",
  paymentsCompletedSub: "del total contratado",
  cronogramaTitle: "Tu cronograma",
  cronogramaEmpty:
    "Estamos preparando el cronograma de contratación de su boda. Muy pronto podrán ver aquí el avance de cada categoría.",
  cronogramaProgress: (done, total) => `${done} de ${total} confirmados`,
  cronogramaProgressAria: (done, total, percent) =>
    `${done} de ${total} confirmados, ${percent}% completado`,
  cronogramaGroupCompleted: "Completados",
  cronogramaGroupInProgress: "En proceso",
  cronogramaGroupPending: "Pendientes",
  cronogramaWithProvider: "con",
  paymentOverviewTitle: "Proyección de pagos",
  paymentOverviewSubtitle: "Resumen de lo contratado y el avance de tus pagos",
  paymentCompleted: "completado",
  paymentProgressAria: (percent) => `${percent}% de pagos completados`,
  totalContracted: "Total contratado",
  totalPaid: "Total pagado",
  balanceDue: "Saldo pendiente",
  upcomingPaymentsTitle: "Próximos pagos",
  upcomingPaymentsSubtitle: "Pagos pendientes ordenados por fecha más próxima",
  upcomingPaymentsCount: (count) =>
    count === 1 ? "1 pago pendiente" : `${count} pagos pendientes`,
  pendingAmount: "Monto pendiente",
  paymentDueDate: "Fecha límite de pago",
  toBeConfirmed: "Por confirmar",
  transferDetails: "Datos para transferencia",
  bank: "Banco",
  accountType: "Tipo de cuenta",
  accountNumber: "Número de cuenta",
  accountHolder: "Titular",
  documentNit: "Documento / NIT",
  providersTitle: "Proveedores contratados",
  providersSubtitle: (count) =>
    count === 1
      ? "1 proveedor confirmado para su celebración"
      : `${count} proveedores confirmados para su celebración`,
  providersEmpty: "Aún no hay proveedores contratados para mostrar.",
  totalValue: "Valor total",
  depositPaid: "Anticipo pagado",
  pendingBalance: "Saldo pendiente",
  balanceDueDate: "Fecha de pago del saldo",
  paymentHistory: "Historial de pagos",
  noPaymentsRecorded: "No hay pagos registrados.",
  noConcept: "Sin concepto",
  seatingTitle: "Seating Plan",
  seatingSubtitle: "Distribución de mesas e invitados para su celebración",
  viewSeatingPlan: "Ver seating plan",
  downloadQuote: "Descargar cotización",
  downloadProjection: "Descargar proyección actual",
  generatingPdf: "Generando PDF…",
  downloadQuoteError: "No se pudo descargar la cotización.",
  downloadProjectionError: "No se pudo descargar la proyección.",
  languageToggleLabel: "Idioma",
};

const UI_EN: ClienteUiCopy = {
  brandTagline: "Bloom by Celestia",
  estadoBodaTitle: "Your wedding status",
  countdown: "Countdown",
  providersReady: "Vendors ready",
  providersReadySub: (c, t) => `${c} of ${t} categories`,
  paymentsCompleted: "Payments completed",
  paymentsCompletedSub: "of total contracted",
  cronogramaTitle: "Your timeline",
  cronogramaEmpty:
    "We're preparing your wedding booking timeline. You'll soon see progress for each category here.",
  cronogramaProgress: (done, total) => `${done} of ${total} confirmed`,
  cronogramaProgressAria: (done, total, percent) =>
    `${done} of ${total} confirmed, ${percent}% complete`,
  cronogramaGroupCompleted: "Completed",
  cronogramaGroupInProgress: "In progress",
  cronogramaGroupPending: "Pending",
  cronogramaWithProvider: "with",
  paymentOverviewTitle: "Payment overview",
  paymentOverviewSubtitle: "Summary of what's contracted and your payment progress",
  paymentCompleted: "completed",
  paymentProgressAria: (percent) => `${percent}% of payments completed`,
  totalContracted: "Total contracted",
  totalPaid: "Total paid",
  balanceDue: "Balance due",
  upcomingPaymentsTitle: "Upcoming payments",
  upcomingPaymentsSubtitle: "Pending payments sorted by nearest due date",
  upcomingPaymentsCount: (count) =>
    count === 1 ? "1 pending payment" : `${count} pending payments`,
  pendingAmount: "Amount due",
  paymentDueDate: "Payment due date",
  toBeConfirmed: "To be confirmed",
  transferDetails: "Bank transfer details",
  bank: "Bank",
  accountType: "Account type",
  accountNumber: "Account number",
  accountHolder: "Account holder",
  documentNit: "ID / Tax ID",
  providersTitle: "Booked vendors",
  providersSubtitle: (count) =>
    count === 1
      ? "1 vendor confirmed for your celebration"
      : `${count} vendors confirmed for your celebration`,
  providersEmpty: "No booked vendors to show yet.",
  totalValue: "Total amount",
  depositPaid: "Deposit paid",
  pendingBalance: "Balance due",
  balanceDueDate: "Balance due date",
  paymentHistory: "Payment history",
  noPaymentsRecorded: "No payments recorded.",
  noConcept: "No description",
  seatingTitle: "Seating Plan",
  seatingSubtitle: "Table layout and guest seating for your celebration",
  viewSeatingPlan: "View seating plan",
  downloadQuote: "Download quote",
  downloadProjection: "Download current projection",
  generatingPdf: "Generating PDF…",
  downloadQuoteError: "Could not download the quote.",
  downloadProjectionError: "Could not download the projection.",
  languageToggleLabel: "Language",
};

export function getClienteUiCopy(locale: ClienteLocale): ClienteUiCopy {
  return locale === "en" ? UI_EN : UI_ES;
}
