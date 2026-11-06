export const CUENTA_CALENDARIO_CELESTIA = "celestiaandevents@gmail.com";

export type CitaCalendarAccion = "crear" | "actualizar" | "eliminar";

export type CitaCalendarSyncResult = {
  accion: CitaCalendarAccion;
  citaGuardada: boolean;
  eventoCreado: boolean;
  eventoActualizado: boolean;
  eventoEliminado: boolean;
  invitados: string[];
  htmlLink: string | null;
  eventId: string | null;
  meetLink: string | null;
  organizerEmail: string | null;
  accesoConfigurado: boolean;
  error: string | null;
  mensaje: string;
  puedeReintentar: boolean;
};

type EventoEscrito = {
  googleError: string | null;
  accesoConfigurado: boolean;
  eventId: string | null;
  htmlLink: string | null;
  meetLink: string | null;
  organizerEmail: string | null;
  esperados: string[];
  confirmados: string[];
  avisoSolicitado: boolean;
};

function base(
  accion: CitaCalendarAccion,
  input: EventoEscrito,
  extra: Partial<CitaCalendarSyncResult>,
): CitaCalendarSyncResult {
  return {
    accion,
    citaGuardada: true,
    eventoCreado: false,
    eventoActualizado: false,
    eventoEliminado: false,
    invitados: [],
    htmlLink: input.htmlLink,
    eventId: input.eventId,
    meetLink: input.meetLink,
    organizerEmail: input.organizerEmail,
    accesoConfigurado: input.accesoConfigurado,
    error: null,
    mensaje: "",
    puedeReintentar: false,
    ...extra,
  };
}

function falloCrear(motivo: string): string {
  return `La cita se guardó, pero no se pudo crear el evento en el calendario: ${motivo}`;
}

function falloActualizar(motivo: string): string {
  return `La cita se guardó, pero no se pudo actualizar el evento en el calendario: ${motivo}`;
}

function correos(emails: string[]): string {
  return emails.join(", ");
}

function organizadorIncorrecto(email: string | null): string | null {
  if (!email) return "Google no confirmó el organizador del evento.";
  if (email === CUENTA_CALENDARIO_CELESTIA) return null;
  return `el organizador es ${email}, no ${CUENTA_CALENDARIO_CELESTIA}.`;
}

function invitadosCompletos(esperados: string[], confirmados: string[]): boolean {
  if (esperados.length === 0) return false;
  if (confirmados.length !== esperados.length) return false;
  const vistos = new Set(confirmados);
  return esperados.every((email) => vistos.has(email));
}

export function mensajeCrearCita(input: EventoEscrito): CitaCalendarSyncResult {
  if (input.googleError || !input.eventId) {
    const motivo = input.googleError ?? "Google no devolvió el evento.";
    return base("crear", input, {
      error: motivo,
      mensaje: falloCrear(motivo),
      puedeReintentar: true,
    });
  }

  if (input.accesoConfigurado) {
    const organizador = organizadorIncorrecto(input.organizerEmail);
    if (organizador) {
      const mensaje = falloCrear(organizador);
      return base("crear", input, {
        eventoCreado: true,
        error: organizador,
        mensaje,
        puedeReintentar: !input.organizerEmail,
      });
    }
  }

  if (!input.accesoConfigurado) {
    return base("crear", input, {
      eventoCreado: true,
      mensaje:
        "Cita creada sin invitación: el acceso de celestiaandevents no está configurado",
    });
  }

  if (input.esperados.length === 0) {
    return base("crear", input, {
      eventoCreado: true,
      mensaje: "Cita creada. Sin correo del cliente: no se envió invitación",
    });
  }

  if (!invitadosCompletos(input.esperados, input.confirmados)) {
    const motivo = "Google no confirmó los invitados.";
    return base("crear", input, {
      eventoCreado: true,
      error: motivo,
      mensaje: falloCrear(motivo),
      puedeReintentar: true,
    });
  }

  return base("crear", input, {
    eventoCreado: true,
    invitados: input.confirmados,
    mensaje: `Cita creada. Invitación enviada a ${correos(input.confirmados)}`,
  });
}

export function mensajeActualizarCita(input: EventoEscrito): CitaCalendarSyncResult {
  if (input.googleError || !input.eventId) {
    const motivo = input.googleError ?? "Google no devolvió el evento.";
    return base("actualizar", input, {
      error: motivo,
      mensaje: falloActualizar(motivo),
      puedeReintentar: true,
    });
  }

  if (input.accesoConfigurado) {
    const organizador = organizadorIncorrecto(input.organizerEmail);
    if (organizador) {
      return base("actualizar", input, {
        eventoActualizado: true,
        error: organizador,
        mensaje: falloActualizar(organizador),
        puedeReintentar: !input.organizerEmail,
      });
    }
  }

  if (!input.accesoConfigurado) {
    return base("actualizar", input, {
      eventoActualizado: true,
      mensaje:
        "Cita actualizada sin invitación: el acceso de celestiaandevents no está configurado",
    });
  }

  if (input.esperados.length === 0) {
    return base("actualizar", input, {
      eventoActualizado: true,
      mensaje:
        "Cita actualizada. Sin correo del cliente: no se envió invitación",
    });
  }

  if (input.avisoSolicitado && invitadosCompletos(input.esperados, input.confirmados)) {
    return base("actualizar", input, {
      eventoActualizado: true,
      invitados: input.confirmados,
      mensaje: `Cita actualizada. Invitación enviada a ${correos(input.confirmados)}`,
    });
  }

  if (input.avisoSolicitado) {
    const motivo = "Google no confirmó los invitados.";
    return base("actualizar", input, {
      eventoActualizado: true,
      error: motivo,
      mensaje: falloActualizar(motivo),
      puedeReintentar: true,
    });
  }

  return base("actualizar", input, {
    eventoActualizado: true,
    mensaje: "Cita actualizada",
  });
}

export function mensajeEliminarCita(input: {
  googleError: string | null;
  accesoConfigurado: boolean;
  eventoEliminado: boolean;
  alreadyGone: boolean;
  invitadosAvisados: string[];
  eventId: string | null;
}): CitaCalendarSyncResult {
  const shell: EventoEscrito = {
    googleError: input.googleError,
    accesoConfigurado: input.accesoConfigurado,
    eventId: input.eventId,
    htmlLink: null,
    meetLink: null,
    organizerEmail: null,
    esperados: [],
    confirmados: [],
    avisoSolicitado: false,
  };

  if (input.googleError || !input.eventoEliminado) {
    const motivo = input.googleError ?? "Google Calendar no respondió.";
    return base("eliminar", shell, {
      error: motivo,
      mensaje: `No se pudo eliminar el evento en el calendario: ${motivo}`,
      puedeReintentar: true,
    });
  }

  if (!input.accesoConfigurado && !input.alreadyGone) {
    return base("eliminar", shell, {
      eventoEliminado: true,
      mensaje:
        "Cita eliminada sin aviso: el acceso de celestiaandevents no está configurado",
    });
  }

  if (input.invitadosAvisados.length > 0) {
    return base("eliminar", shell, {
      eventoEliminado: true,
      invitados: input.invitadosAvisados,
      mensaje: `Cita eliminada. Se avisó la cancelación a ${correos(input.invitadosAvisados)}`,
    });
  }

  return base("eliminar", shell, {
    eventoEliminado: true,
    mensaje: "Cita eliminada",
  });
}

export function mensajeEliminarSinEvento(): CitaCalendarSyncResult {
  return {
    accion: "eliminar",
    citaGuardada: true,
    eventoCreado: false,
    eventoActualizado: false,
    eventoEliminado: false,
    invitados: [],
    htmlLink: null,
    eventId: null,
    meetLink: null,
    organizerEmail: null,
    accesoConfigurado: false,
    error: null,
    mensaje: "",
    puedeReintentar: false,
  };
}
