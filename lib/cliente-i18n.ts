import type { ClienteCronogramaHitoEstado } from "@/lib/cliente-cronograma";
import type { ClientePagoUrgency } from "@/lib/cliente-pagos";
import { formatCurrency } from "@/lib/format";
import { appendUsdApprox } from "@/lib/tasa-cambio";

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

export function getClienteTastingsDayLabel(
  isoDate: string,
  locale: ClienteLocale,
): string {
  const date = new Date(isoDate + "T12:00:00");
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CO", {
    weekday: "long",
  }).format(date);
}

export function formatClienteProveedorValue(
  amount: number | null | undefined,
  locale: ClienteLocale,
  copPorUsd?: number | null,
): string {
  if (amount == null) {
    return locale === "en" ? "To be defined" : "Por definir";
  }

  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return locale === "en" ? "To be defined" : "Por definir";
  }

  return appendUsdApprox(formatCurrency(value), value, copPorUsd);
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

/** Traduce nombres de hitos/categorías del cronograma (vienen en español desde la BD). */
const CRONOGRAMA_CATEGORIA_EN: Record<string, string> = {
  "Wedding Planner": "Wedding Planner",
  "Lugar del evento": "Venue",
  "Lugar de ceremonia": "Ceremony venue",
  "Save the date": "Save the date",
  Website: "Website",
  Fotografía: "Photography",
  Video: "Videography",
  DJ: "DJ",
  Banda: "Live band",
  Entretenimiento: "Entertainment",
  Decoración: "Decor",
  Producción: "Production",
  Catering: "Catering",
  Repostería: "Pastry / Cake",
  Coctelería: "Bar service",
  "Maquillaje y peinado": "Hair & makeup",
  "Músicos de ceremonia": "Ceremony musicians",
  "Músicos cóctel": "Cocktail musicians",
  Transporte: "Transportation",
  "Carro de la novia": "Bridal car",
  "Welcome party": "Welcome party",
  Licor: "Liquor",
  "Hora loca": "Party hour",
  "Foto cabina": "Photo booth",
  "Estación de café": "Coffee station",
  Oficiante: "Officiant",
  Ambulancia: "Ambulance",
  Otros: "Other",
  // Alias / legacy
  Música: "Music",
  Coordinadora: "Wedding Planner",
  "Fotografía y video": "Photography",
  "Fotografía y Video": "Photography",
  "DJ / Banda / Entretenimiento": "DJ",
  "Músicos ceremonia": "Ceremony musicians",
};

export function getClienteCronogramaCategoriaLabel(
  categoria: string,
  locale: ClienteLocale,
): string {
  const trimmed = categoria.trim();
  if (!trimmed || locale !== "en") return trimmed;

  const suffixMatch = trimmed.match(/^(.+?)\s+(\d+)$/);
  const base = suffixMatch ? suffixMatch[1].trim() : trimmed;
  const numberSuffix = suffixMatch ? suffixMatch[2] : null;
  const translated = CRONOGRAMA_CATEGORIA_EN[base] ?? base;

  return numberSuffix ? `${translated} ${numberSuffix}` : translated;
}

export function getClientePagoUrgencyLabel(
  urgency: ClientePagoUrgency,
  locale: ClienteLocale,
): string {
  if (locale === "en") {
    return urgency === "esta_semana" ? "🔴 Urgent" : "🟡 Due soon";
  }
  return urgency === "esta_semana" ? "🔴 Urgente" : "🟡 Vence pronto";
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
  tastingsTitle: string;
  tastingsSubtitle: (count: number, days: number) => string;
  tastingsNextItem: string;
  tastingsCost: string;
  tastingsNotes: string;
  tastingsNoProvider: string;
  tastingsPaymentReminder: string;
  tastingsTipoLabels: {
    tasting: string;
    visita: string;
    reunion: string;
  };
  downloadSchedule: string;
  downloadScheduleError: string;
  agendaPdfTitle: string;
  agendaPdfAddress: string;
  agendaPdfMeetLink: string;
  detallesCelebracionTitle: string;
  detallesCelebracionSubtitle: (filled: number, total: number) => string;
  detallesCelebracionIntro: string;
  detallesCelebracionSave: string;
  detallesCelebracionSaving: string;
  detallesCelebracionSaved: string;
  detallesCelebracionSaveError: string;
  detallesCelebracionUnsaved: string;
  detallesCelebracionDiscard: string;
  detallesCelebracionPinTitle: string;
  detallesCelebracionPinPrompt: string;
  detallesCelebracionPinSubmit: string;
  detallesCelebracionPinCancel: string;
  detallesCelebracionPinError: string;
  detallesCelebracionLockedHint: string;
  proveedoresSugeridosTitle: string;
  proveedoresSugeridosSubtitle: (selected: number, total: number) => string;
  proveedoresSugeridosIntro: string;
  proveedoresSugeridosSelect: string;
  proveedoresSugeridosUnselect: string;
  proveedoresSugeridosSaveError: string;
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
  upcomingPaymentsUrgentBanner: (count: number) => string;
  pendingAmount: string;
  paymentDueDate: string;
  toBeConfirmed: string;
  transferDetails: string;
  bank: string;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
  documentNit: string;
  address: string;
  phone: string;
  swiftCode: string;
  email: string;
  providersTitle: string;
  providersSubtitle: (count: number) => string;
  providersEmpty: string;
  providersEvaluationTitle: string;
  providersEvaluationSubtitle: (count: number) => string;
  providersEvaluationBadge: string;
  providersEvaluationQuotedValue: string;
  noCostBadge: string;
  sharedPriceWith: (categories: string) => string;
  contractedValue: string;
  serviceDescription: string;
  contactDetails: string;
  totalValue: string;
  depositPaid: string;
  refundableDeposit: (amount: string) => string;
  pendingBalance: string;
  includedInProvider: (primaryName: string) => string;
  balanceDueDate: string;
  paymentHistory: string;
  noPaymentsRecorded: string;
  noConcept: string;
  seatingTitle: string;
  seatingSubtitle: string;
  viewSeatingPlan: string;
  downloadQuote: string;
  downloadProjection: string;
  downloadProjectionExcel: string;
  generatingPdf: string;
  generatingExcel: string;
  downloadQuoteError: string;
  downloadProjectionError: string;
  languageToggleLabel: string;
  showUsdLabel: string;
  hideUsdLabel: string;
  includeUsdInExcelLabel: string;
  pwaInstallBannerIos: string;
  pwaInstallBannerAndroid: string;
  pwaInstallBannerOther: string;
  pwaInstallBannerDismiss: string;
  helpGuideTitle: string;
  helpGuideClose: string;
  helpGuideButtonLabel: string;
  helpGuideItems: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
};

const UI_ES: ClienteUiCopy = {
  brandTagline: "Bloom by Celestia",
  estadoBodaTitle: "Estado de tu boda",
  countdown: "Cuenta regresiva",
  providersReady: "Proveedores listos",
  providersReadySub: (c, t) => `${c} de ${t} ítems completados`,
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
  tastingsTitle: "Semana de tastings",
  tastingsSubtitle: (count, days) =>
    count === 1
      ? `1 cita · ${days === 1 ? "1 día" : `${days} días`}`
      : `${count} citas · ${days === 1 ? "1 día" : `${days} días`}`,
  tastingsNextItem: "Siguiente cita",
  tastingsCost: "Valor de la prueba",
  tastingsNotes: "Notas",
  tastingsNoProvider: "Sin proveedor",
  tastingsPaymentReminder: "💰 Recuerda realizar el pago de tu prueba",
  tastingsTipoLabels: {
    tasting: "Tasting",
    visita: "Visita",
    reunion: "Reunión",
  },
  downloadSchedule: "📅 Descargar agenda",
  downloadScheduleError: "No se pudo generar la agenda.",
  agendaPdfTitle: "Agenda de citas",
  agendaPdfAddress: "Dirección",
  agendaPdfMeetLink: "Meet",
  detallesCelebracionTitle: "Detalles de la boda",
  detallesCelebracionSubtitle: (filled, total) =>
    filled === 0
      ? `${total} preguntas por completar`
      : `${filled} de ${total} completadas`,
  detallesCelebracionIntro:
    "Compartan con nosotros las canciones y detalles de protocolo para que su celebración refleje su estilo.",
  detallesCelebracionSave: "Guardar",
  detallesCelebracionSaving: "Guardando…",
  detallesCelebracionSaved: "Detalles guardados correctamente",
  detallesCelebracionSaveError: "No se pudieron guardar los detalles.",
  detallesCelebracionUnsaved: "Cambios sin guardar",
  detallesCelebracionDiscard: "Descartar",
  detallesCelebracionPinTitle: "Ingresa tu PIN",
  detallesCelebracionPinPrompt:
    "Ingresa los últimos 3 dígitos del celular de la novia para editar.",
  detallesCelebracionPinSubmit: "Continuar",
  detallesCelebracionPinCancel: "Cancelar",
  detallesCelebracionPinError: "PIN incorrecto, inténtalo de nuevo",
  detallesCelebracionLockedHint:
    "Toca un campo para ingresar el PIN y editar los detalles.",
  proveedoresSugeridosTitle: "Selecciona tus favoritos",
  proveedoresSugeridosSubtitle: (selected, total) =>
    selected === 0
      ? `${total} opciones para explorar`
      : `${selected} de ${total} seleccionados`,
  proveedoresSugeridosIntro:
    "Marquen con ✓ los proveedores que les interesen. Su selección se guarda automáticamente.",
  proveedoresSugeridosSelect: "Marcar como favorito",
  proveedoresSugeridosUnselect: "Quitar de favoritos",
  proveedoresSugeridosSaveError: "No se pudo guardar su selección.",
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
  upcomingPaymentsUrgentBanner: (count) =>
    count === 1
      ? "⚠️ Tienes 1 pago con vencimiento próximo"
      : `⚠️ Tienes ${count} pagos con vencimiento próximo`,
  pendingAmount: "Monto pendiente",
  paymentDueDate: "Fecha límite de pago",
  toBeConfirmed: "Por confirmar",
  transferDetails: "Datos para transferencia",
  bank: "Banco",
  accountType: "Tipo de cuenta",
  accountNumber: "Número de cuenta",
  accountHolder: "Nombre completo (titular)",
  documentNit: "Documento / NIT",
  address: "Dirección",
  phone: "Teléfono",
  swiftCode: "Código Swift",
  email: "Email",
  providersTitle: "Proveedores contratados",
  providersSubtitle: (count) =>
    count === 1
      ? "1 proveedor confirmado para su celebración"
      : `${count} proveedores confirmados para su celebración`,
  providersEmpty: "Aún no hay proveedores contratados para mostrar.",
  providersEvaluationTitle: "En evaluación",
  providersEvaluationSubtitle: (count) =>
    count === 1
      ? "1 proveedor en evaluación"
      : `${count} proveedores en evaluación`,
  providersEvaluationBadge: "En evaluación",
  providersEvaluationQuotedValue: "Valor cotizado",
  noCostBadge: "Sin costo",
  sharedPriceWith: (categories) => `Precio compartido con ${categories}`,
  contractedValue: "Valor contratado",
  serviceDescription: "Descripción del servicio",
  contactDetails: "Datos de contacto",
  totalValue: "Valor total",
  depositPaid: "Anticipo pagado",
  refundableDeposit: (amount) => `Depósito reembolsable: ${amount}`,
  pendingBalance: "Saldo pendiente",
  includedInProvider: (primaryName) => `Incluido en ${primaryName}`,
  balanceDueDate: "Fecha de pago del saldo",
  paymentHistory: "Historial de pagos",
  noPaymentsRecorded: "No hay pagos registrados.",
  noConcept: "Sin concepto",
  seatingTitle: "Seating Plan",
  seatingSubtitle: "Distribución de mesas e invitados para su celebración",
  viewSeatingPlan: "Ver seating plan",
  downloadQuote: "Cotización inicial",
  downloadProjection: "Descargar PDF",
  downloadProjectionExcel: "Descargar Excel",
  generatingPdf: "Generando PDF…",
  generatingExcel: "Generando Excel…",
  downloadQuoteError: "No se pudo descargar la cotización.",
  downloadProjectionError: "No se pudo descargar la proyección.",
  languageToggleLabel: "Idioma",
  showUsdLabel: "Ver en USD",
  hideUsdLabel: "Ocultar USD",
  includeUsdInExcelLabel: "Incluir USD",
  pwaInstallBannerIos:
    "Para acceder fácilmente: toca el botón compartir (□↑) en Safari y selecciona 'Añadir a pantalla de inicio' 🌸",
  pwaInstallBannerAndroid:
    "Para acceder fácilmente: toca el menú (⋮) en Chrome y selecciona 'Añadir a pantalla de inicio' 🌸",
  pwaInstallBannerOther:
    "Guarda este link para acceder fácilmente a tu portal 🌸",
  pwaInstallBannerDismiss: "Ahora no",
  helpGuideTitle: "Guía rápida",
  helpGuideClose: "Cerrar",
  helpGuideButtonLabel: "Abrir guía del portal",
  helpGuideItems: [
    {
      icon: "📋",
      title: "Estado de tu boda",
      description: "Ve el avance general de tu planeación",
    },
    {
      icon: "📅",
      title: "Cronograma",
      description: "Los hitos importantes antes de tu boda",
    },
    {
      icon: "💳",
      title: "Próximos pagos",
      description: "Pagos pendientes con fechas y datos de transferencia",
    },
    {
      icon: "🤝",
      title: "Proveedores contratados",
      description: "Todos los proveedores con valores y saldos",
    },
    {
      icon: "🍽️",
      title: "Semana de tastings",
      description: "Tus citas de prueba agendadas",
    },
    {
      icon: "✏️",
      title: "Detalles de la boda",
      description:
        "Información editable de tu celebración (requiere PIN)",
    },
  ],
};

const UI_EN: ClienteUiCopy = {
  brandTagline: "Bloom by Celestia",
  estadoBodaTitle: "Your wedding status",
  countdown: "Countdown",
  providersReady: "Vendors ready",
  providersReadySub: (c, t) => `${c} of ${t} items completed`,
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
  tastingsTitle: "Tasting week",
  tastingsSubtitle: (count, days) =>
    count === 1
      ? `1 appointment · ${days === 1 ? "1 day" : `${days} days`}`
      : `${count} appointments · ${days === 1 ? "1 day" : `${days} days`}`,
  tastingsNextItem: "Next appointment",
  tastingsCost: "Tasting fee",
  tastingsNotes: "Notes",
  tastingsNoProvider: "No vendor",
  tastingsPaymentReminder: "💰 Remember to complete your tasting payment",
  tastingsTipoLabels: {
    tasting: "Tasting",
    visita: "Visit",
    reunion: "Meeting",
  },
  downloadSchedule: "📅 Download schedule",
  downloadScheduleError: "Could not generate the schedule.",
  agendaPdfTitle: "Appointment schedule",
  agendaPdfAddress: "Address",
  agendaPdfMeetLink: "Meet",
  detallesCelebracionTitle: "Wedding Details",
  detallesCelebracionSubtitle: (filled, total) =>
    filled === 0
      ? `${total} questions to complete`
      : `${filled} of ${total} completed`,
  detallesCelebracionIntro:
    "Share your songs and ceremony protocol details with us so your celebration reflects your style.",
  detallesCelebracionSave: "Save",
  detallesCelebracionSaving: "Saving…",
  detallesCelebracionSaved: "Details saved successfully",
  detallesCelebracionSaveError: "Could not save the details.",
  detallesCelebracionUnsaved: "Unsaved changes",
  detallesCelebracionDiscard: "Discard",
  detallesCelebracionPinTitle: "Enter your PIN",
  detallesCelebracionPinPrompt:
    "Enter the last 3 digits of the bride's phone number to edit.",
  detallesCelebracionPinSubmit: "Continue",
  detallesCelebracionPinCancel: "Cancel",
  detallesCelebracionPinError: "Incorrect PIN, please try again",
  detallesCelebracionLockedHint:
    "Tap a field to enter your PIN and edit the details.",
  proveedoresSugeridosTitle: "Select your favorites",
  proveedoresSugeridosSubtitle: (selected, total) =>
    selected === 0
      ? `${total} options to explore`
      : `${selected} of ${total} selected`,
  proveedoresSugeridosIntro:
    "Mark with ✓ the vendors you're interested in. Your selection saves automatically.",
  proveedoresSugeridosSelect: "Mark as favorite",
  proveedoresSugeridosUnselect: "Remove from favorites",
  proveedoresSugeridosSaveError: "Could not save your selection.",
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
  upcomingPaymentsUrgentBanner: (count) =>
    count === 1
      ? "⚠️ You have 1 upcoming payment due soon"
      : `⚠️ You have ${count} upcoming payments due soon`,
  pendingAmount: "Amount due",
  paymentDueDate: "Payment due date",
  toBeConfirmed: "To be confirmed",
  transferDetails: "Bank transfer details",
  bank: "Bank",
  accountType: "Account type",
  accountNumber: "Account number",
  accountHolder: "Full name (account holder)",
  documentNit: "ID / Tax ID",
  address: "Address",
  phone: "Phone",
  swiftCode: "Swift code",
  email: "Email",
  providersTitle: "Booked vendors",
  providersSubtitle: (count) =>
    count === 1
      ? "1 vendor confirmed for your celebration"
      : `${count} vendors confirmed for your celebration`,
  providersEmpty: "No booked vendors to show yet.",
  providersEvaluationTitle: "Under evaluation",
  providersEvaluationSubtitle: (count) =>
    count === 1
      ? "1 vendor under evaluation"
      : `${count} vendors under evaluation`,
  providersEvaluationBadge: "Under evaluation",
  providersEvaluationQuotedValue: "Quoted amount",
  noCostBadge: "No cost",
  sharedPriceWith: (categories) => `Shared price with ${categories}`,
  contractedValue: "Contracted amount",
  serviceDescription: "Service description",
  contactDetails: "Contact details",
  totalValue: "Total amount",
  depositPaid: "Deposit paid",
  refundableDeposit: (amount) => `Refundable deposit: ${amount}`,
  pendingBalance: "Balance due",
  includedInProvider: (primaryName) => `Included in ${primaryName}`,
  balanceDueDate: "Balance due date",
  paymentHistory: "Payment history",
  noPaymentsRecorded: "No payments recorded.",
  noConcept: "No description",
  seatingTitle: "Seating Plan",
  seatingSubtitle: "Table layout and guest seating for your celebration",
  viewSeatingPlan: "View seating plan",
  downloadQuote: "Initial quote",
  downloadProjection: "Download PDF",
  downloadProjectionExcel: "Download Excel",
  generatingPdf: "Generating PDF…",
  generatingExcel: "Generating Excel…",
  downloadQuoteError: "Could not download the quote.",
  downloadProjectionError: "Could not download the projection.",
  languageToggleLabel: "Language",
  showUsdLabel: "Show USD",
  hideUsdLabel: "Hide USD",
  includeUsdInExcelLabel: "Include USD",
  pwaInstallBannerIos:
    "For easy access: tap the share button (□↑) in Safari and select 'Add to Home Screen' 🌸",
  pwaInstallBannerAndroid:
    "For easy access: tap the menu (⋮) in Chrome and select 'Add to Home Screen' 🌸",
  pwaInstallBannerOther:
    "Save this link for easy access to your portal 🌸",
  pwaInstallBannerDismiss: "Not now",
  helpGuideTitle: "Quick guide",
  helpGuideClose: "Close",
  helpGuideButtonLabel: "Open portal guide",
  helpGuideItems: [
    {
      icon: "📋",
      title: "Wedding status",
      description: "See the overall progress of your planning",
    },
    {
      icon: "📅",
      title: "Timeline",
      description: "Key milestones before your wedding",
    },
    {
      icon: "💳",
      title: "Upcoming payments",
      description: "Pending payments with dates and transfer details",
    },
    {
      icon: "🤝",
      title: "Contracted vendors",
      description: "All your vendors with amounts and balances",
    },
    {
      icon: "🍽️",
      title: "Tasting week",
      description: "Your scheduled tasting appointments",
    },
    {
      icon: "✏️",
      title: "Wedding details",
      description:
        "Editable information about your celebration (PIN required)",
    },
  ],
};

export function getClienteUiCopy(locale: ClienteLocale): ClienteUiCopy {
  return locale === "en" ? UI_EN : UI_ES;
}
