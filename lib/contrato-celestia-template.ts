import type { BodaRow } from "@/app/data/weddings";
import type { ContratoFirmante } from "@/app/data/contratos";
import {
  formatCurrency,
  formatFechaFirmaEn,
  formatFechaFirmaEs,
  formatWeddingDate,
} from "@/lib/format";
import { numeroALetrasPesos, numeroALetrasPesosEn } from "@/lib/numero-a-letras";

export type ContratoClienteData = {
  nombre: string;
  tipoDocumento: string;
  tipoDocumentoEn: string;
  numeroDocumento: string;
  direccion: string;
  telefono: string;
  email: string;
  genero: "f" | "m";
};

export type ContratoDocumentData = {
  boda: Pick<
    BodaRow,
    | "nombre_pareja"
    | "nombre_novia"
    | "nombre_novio"
    | "tipo_documento_novia"
    | "tipo_documento_novio"
    | "documento_novia"
    | "documento_novio"
    | "ciudad"
    | "fecha_boda"
    | "direccion"
    | "telefono_novia"
    | "telefono_novio"
    | "email_novia"
    | "email_novio"
  >;
  firmante: ContratoFirmante;
  cliente: ContratoClienteData;
  honorarios: number;
  anticipo: number;
  saldo: number;
  fechaFirma?: string | null;
};

export type TextSegment = {
  text: string;
  bold?: boolean;
  caps?: boolean;
};

export type ContratoBlock =
  | { kind: "logo" }
  | { kind: "title"; text: string }
  | { kind: "rich"; segments: TextSegment[]; indent?: boolean }
  | { kind: "clause"; heading: string; body: string }
  | { kind: "paragraph"; text: string; indent?: boolean }
  | { kind: "labeled"; label: string; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "signature_date"; text: string }
  | { kind: "signature_block"; name: string; role: string; details: string[] }
  | { kind: "spacer" };

const ORGANIZADORA = {
  nombre: "LUISA FERNANDA BUSTAMANTE VANEGAS",
  documento: "1.037.580.461",
  equipo: "JAIME ANDRÉS ARISTIZÁBAL ZULUAGA Y JULIANA GÓMEZ",
  banco: "BANCOLOMBIA No 436-207-317-40",
  email: "celestiaandevents@gmail.com",
  direccion: "Diag 31 e 27 a sur 49, interior 12",
  celular: "3195538654",
};

function placeholder(value: string | null | undefined): string {
  return value?.trim() || "_______________";
}

function tipoDocumentoEs(tipo: string | null | undefined): string {
  const normalized = tipo?.trim();
  if (!normalized || normalized.toUpperCase() === "CC") {
    return "la cédula de ciudadanía";
  }
  return normalized;
}

function tipoDocumentoEn(tipo: string | null | undefined): string {
  const normalized = tipo?.trim();
  if (!normalized || normalized.toUpperCase() === "CC") {
    return "citizenship ID";
  }
  return normalized;
}

export function resolveClienteFromBoda(
  boda: ContratoDocumentData["boda"],
  firmante: ContratoFirmante,
): ContratoClienteData {
  if (firmante === "novio") {
    return {
      nombre:
        boda.nombre_novio?.trim() ||
        boda.nombre_pareja.split(/\s+y\s+/i).pop()?.trim() ||
        boda.nombre_pareja.trim(),
      tipoDocumento: tipoDocumentoEs(boda.tipo_documento_novio),
      tipoDocumentoEn: tipoDocumentoEn(boda.tipo_documento_novio),
      numeroDocumento: placeholder(boda.documento_novio),
      direccion: placeholder(boda.direccion),
      telefono: placeholder(boda.telefono_novio),
      email: placeholder(boda.email_novio),
      genero: "m",
    };
  }

  return {
    nombre: boda.nombre_novia?.trim() || boda.nombre_pareja.trim(),
    tipoDocumento: tipoDocumentoEs(boda.tipo_documento_novia),
    tipoDocumentoEn: tipoDocumentoEn(boda.tipo_documento_novia),
    numeroDocumento: placeholder(boda.documento_novia),
    direccion: placeholder(boda.direccion),
    telefono: placeholder(boda.telefono_novia),
    email: placeholder(boda.email_novia),
    genero: "f",
  };
}

function nombrePareja(data: ContratoDocumentData): string {
  const novia = data.boda.nombre_novia?.trim();
  const novio = data.boda.nombre_novio?.trim();
  if (novia && novio) return `${novia} y ${novio}`;
  return data.boda.nombre_pareja.trim();
}

function resolveFechaFirmaIso(fechaFirma?: string | null): string {
  if (fechaFirma?.trim()) {
    return fechaFirma.includes("T") ? fechaFirma.split("T")[0] : fechaFirma;
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildVariables(data: ContratoDocumentData) {
  const honorarios = {
    numeros: formatCurrency(data.honorarios),
    letras: numeroALetrasPesos(data.honorarios),
    letrasEn: numeroALetrasPesosEn(data.honorarios),
  };
  const anticipo = {
    numeros: formatCurrency(data.anticipo),
    letras: numeroALetrasPesos(data.anticipo),
    letrasEn: numeroALetrasPesosEn(data.anticipo),
  };
  const saldo = {
    numeros: formatCurrency(data.saldo),
    letras: numeroALetrasPesos(data.saldo),
    letrasEn: numeroALetrasPesosEn(data.saldo),
  };

  const ciudad = data.boda.ciudad?.trim() || "Medellín";
  const fechaFirmaIso = resolveFechaFirmaIso(data.fechaFirma);

  return {
    cliente: data.cliente,
    nombrePareja: nombrePareja(data),
    ciudad,
    fechaBoda: formatWeddingDate(data.boda.fecha_boda),
    fechaFirmaEs: formatFechaFirmaEs(fechaFirmaIso, ciudad),
    fechaFirmaEn: formatFechaFirmaEn(fechaFirmaIso, ciudad),
    honorarios,
    anticipo,
    saldo,
  };
}

function segment(text: string, bold = false, caps = false): TextSegment {
  return { text, bold, caps };
}

export function buildContratoBlocksEs(data: ContratoDocumentData): ContratoBlock[] {
  const v = buildVariables(data);
  const clienteCaps = v.cliente.nombre.toUpperCase();
  const identificado =
    v.cliente.genero === "f" ? "identificada" : "identificado";
  const rolCliente = v.cliente.genero === "f" ? "LA CLIENTE" : "EL CLIENTE";

  return [
    { kind: "logo" },
    { kind: "title", text: "CONTRATO DE PRESTACIÓN DE SERVICIOS" },
    {
      kind: "rich",
      indent: true,
      segments: [
        segment("Entre las suscritas a saber, "),
        segment(ORGANIZADORA.nombre, true, true),
        segment(
          `, mayor de edad, colombiana, vecina de Envigado - Antioquia, ${identificado} con la cédula de ciudadanía No ${ORGANIZADORA.documento}, obrando en nombre propio, quien en adelante y para los efectos de este contrato se denominará `,
        ),
        segment("LA ORGANIZADORA", true, true),
        segment(", de una parte y de la otra, "),
        segment(clienteCaps, true, true),
        segment(
          ` mayor de edad, ${identificado} con ${v.cliente.tipoDocumento} cuyo número se encuentra al pie de la firma, actuando en nombre propio y quien para los efectos de este contrato se denominará `,
        ),
        segment(rolCliente, true, true),
        segment(
          `, hemos acordado celebrar en forma autónoma, libre e independiente el presente contrato civil de prestación de servicios para la organización de la BODA DE ${v.nombrePareja.toUpperCase()}, el cual se rige por la legislación civil y comercial vigente, y en especial por las siguientes cláusulas:`,
        ),
      ],
    },
    { kind: "spacer" },
    {
      kind: "clause",
      heading: "PRIMERA: OBJETO DEL CONTRATO. ",
      body: `${rolCliente} contrata los servicios de LA ORGANIZADORA para que se encargue de la organización, planificación, logística y demás en total de la boda de ${v.nombrePareja} en la ciudad de ${v.ciudad}, República de Colombia, con fecha estimada a realizarse el ${v.fechaBoda}; incluirá también, la ceremonia, la fiesta de bienvenida y despedida, si así se estimase.`,
    },
    {
      kind: "paragraph",
      indent: true,
      text: "LA ORGANIZADORA como objeto del presente contrato se compromete a realizar a satisfacción de LA CLIENTE, los siguientes servicios:",
    },
    {
      kind: "bullet",
      text: "La búsqueda y coordinación de los proveedores, al igual que la locación para la boda, estos se pondrán a disposición para la aceptación de LA CLIENTE, mediante mínimo tres opciones, según los parámetros que LA CLIENTE indique.",
    },
    {
      kind: "bullet",
      text: "La asesoría respecto a cada uno de los tiempos, actividades, proveedores, servicios, contratos, logística, protocolos y demás requeridos relacionados con la boda.",
    },
    {
      kind: "bullet",
      text: "Los días previos a la boda estará disponible para ultimar cualquier detalle que sea requerido por LA CLIENTE previo acuerdo de fecha entre las partes. Igualmente, el día de la boda asistirá con anticipación a la ceremonia y recepción hasta la hora pactada de culminación.",
    },
    {
      kind: "bullet",
      text: "Ayudará a planear otros eventos como fiesta de bienvenida o de despedida en caso de que los hubiese, pero no los coordinará el día del evento, de ser necesario este servicio, tiene un costo extra de $700.000 y asistiría a supervisar y coordinar el montaje y desarrollo de dichos eventos una persona delegada del equipo.",
    },
    {
      kind: "bullet",
      text: "Coordinará la logística del transporte y hospedaje para el día de la boda, para los novios y los invitados.",
    },
    {
      kind: "bullet",
      text: "Presentará un cronograma con los tiempos de cada servicio, proveedor y logística de la organización de la boda, previamente acordado con LA CLIENTE.",
    },
    {
      kind: "bullet",
      text: "Asesorará a los clientes con el proveedor idóneo para la creación de la página web y guiará ese proceso.",
    },
    {
      kind: "labeled",
      label: "PARAGRAFO 1: ",
      text: "LA CLIENTE será quien firme y se responsabilice por el pago de los diferentes contratos de proveedores de productos y servicios, hospedajes y locaciones, que se realicen para la boda, siempre bajo la asesoría y las sugerencias de LA ORGANIZADORA.",
    },
    {
      kind: "clause",
      heading: "SEGUNDA: DURACIÓN. ",
      body: "La prestación de los servicios de organización, asesoría y coordinación, tienen una vigencia desde el momento de la firma del contrato hasta el día siguiente de la fecha de la boda, o hasta que se hayan cancelado las obligaciones con terceros y estén todos los servicios paz y salvos.",
    },
    {
      kind: "labeled",
      label: "PARAGRAFO 1: ",
      text: "En caso de haber más de tres desplazamientos fuera de la ciudad de Medellín y su Área Metropolitana, estos serán cubiertos por LA CLIENTE. Los tres desplazamientos estándar son: 1. Búsqueda de la locación. 2. Scouting con proveedores. 3. Día de la boda.",
    },
    {
      kind: "labeled",
      label: "PARAGRAFO 2: ",
      text: "LA ORGANIZADORA tendrá la disponibilidad de tres (3) horas semanales para asesoría y acompañamiento de LA CLIENTE; sin embargo, éste tiempo será flexible a requerimiento de las necesidades de LA CLIENTE y DE LA ORGANIZADORA para la coordinación de la boda.",
    },
    {
      kind: "labeled",
      label: "PARAGRAFO 3: ",
      text: `LA ORGANIZADORA en su calidad de experta, de amplia experiencia y capacidad de trabajo se compromete expresamente a atender todo el trabajo que se describe en el presente contrato, y a delegar lo que le corresponda con sus colaboradores. Reconoce que es ella y su equipo compuesto por ${ORGANIZADORA.equipo} los únicos responsables de los eventos contratados.`,
    },
    {
      kind: "clause",
      heading: "TERCERA: VALOR DEL CONTRATO. ",
      body: `LA CLIENTE pagará como contraprestación a LA ORGANIZADORA por las actividades pactadas en el objeto de este contrato, la suma de ${v.honorarios.letras} (${v.honorarios.numeros}), pagaderos de la siguiente forma: a) a la firma del presente contrato un pago por la suma de ${v.anticipo.letras} (${v.anticipo.numeros}). b) ocho días antes de la boda un pago por la suma de ${v.saldo.letras} (${v.saldo.numeros}).`,
    },
    {
      kind: "labeled",
      label: "PARAGRAFO 1: ",
      text: "El precio del presente contrato representa el costo neto a pagar, por lo tanto, no aplica IVA.",
    },
    {
      kind: "labeled",
      label: "PARAGRAFO 2: ",
      text: "En caso de haber algún tipo de retenciones por parte de LA CLIENTE, este valor será agregado al cobro final del presente contrato.",
    },
    {
      kind: "labeled",
      label: "PARAGRAFO 3: ",
      text: `El pago del precio establecido en esta cláusula será en efectivo, tarjeta de crédito con un link (se aplica un cargo extra del 3.9%) enviado con anticipación, o por medio de consignación a la siguiente cuenta de ahorros: ${ORGANIZADORA.banco}, a nombre de ${ORGANIZADORA.nombre} C.C ${ORGANIZADORA.documento}. Para que los pagos por consignación se hagan efectivos, LA CLIENTE debe enviar copia del recibo de consignación al correo electrónico ${ORGANIZADORA.email}.`,
    },
    {
      kind: "clause",
      heading: "CUARTA: ARRAS CONFIRMATORIAS PENALES. ",
      body: "Los contratantes acordamos que el anticipo pactado en el literal a) de la cláusula anterior se entrega en calidad de ARRAS CONFIRMATORIAS PENALES, con el objetivo de confirmar el contrato y garantizar su ejecución. Si el contrato no se realiza por causa imputable a LA CLIENTE, las arras quedarán en poder de LA ORGANIZADORA a título de sanción penal. Si el contrato no se realiza por causa imputable a LA ORGANIZADORA, esta restituirá a LA CLIENTE el valor del anticipo dentro del mes siguiente a la solicitud.",
    },
    {
      kind: "clause",
      heading: "QUINTA: CAMBIO DE FECHA DEL EVENTO. ",
      body: "Si fuese necesario un cambio de fecha, LA CLIENTE junto con LA ORGANIZADORA buscarán coordinadamente una fecha conveniente y disponible para la boda, haciendo todo lo posible por mantener la fecha de celebración en el año acordado, previo acuerdo entre las partes según disponibilidad de LA ORGANIZADORA.",
    },
    {
      kind: "clause",
      heading: "SEXTA: ALIMENTACIÓN Y HOSPEDAJE DURANTE EL EVENTO. ",
      body: "La alimentación básica del grupo de trabajo (fotografía, video, producción, DJ, wedding planners, banda o cualquier proveedor que ese día esté en pro del desarrollo de la boda), las bebidas no alcohólicas y el hospedaje en caso de ser necesario cuando el evento es fuera de Medellín, serán asumidos por LA CLIENTE sin lugar a ser descontadas del valor del contrato.",
    },
    {
      kind: "clause",
      heading: "SÉPTIMA: CESIÓN DEL CONTRATO. ",
      body: "LA CLIENTE no podrá ceder el presente contrato sin autorización expresa y por escrito de LA ORGANIZADORA. Igualmente, LA ORGANIZADORA no podrá ceder en todo ni en parte el presente contrato de servicios a terceros.",
    },
    {
      kind: "paragraph",
      indent: true,
      text: "Las partes declaran que aceptan el presente contrato en todas sus cláusulas, términos y condiciones, firmando dos originales del mismo tenor.",
    },
    { kind: "spacer" },
    { kind: "signature_date", text: v.fechaFirmaEs },
    { kind: "spacer" },
    {
      kind: "signature_block",
      name: ORGANIZADORA.nombre,
      role: "LA ORGANIZADORA",
      details: [
        `C.C ${ORGANIZADORA.documento}`,
        `DIRECCIÓN: ${ORGANIZADORA.direccion}`,
        `CELULAR: ${ORGANIZADORA.celular}`,
        `CORREO: ${ORGANIZADORA.email}`,
      ],
    },
    { kind: "spacer" },
    {
      kind: "signature_block",
      name: v.cliente.nombre.toUpperCase(),
      role: rolCliente,
      details: [
        `DOCUMENTO: ${v.cliente.numeroDocumento}`,
        `DIRECCIÓN: ${v.cliente.direccion}`,
        `CELULAR: ${v.cliente.telefono}`,
        `CORREO: ${v.cliente.email}`,
      ],
    },
  ];
}

export function buildContratoBlocksEn(data: ContratoDocumentData): ContratoBlock[] {
  const v = buildVariables(data);
  const clienteCaps = v.cliente.nombre.toUpperCase();
  const pronoun = v.cliente.genero === "f" ? "her" : "his";

  return [
    { kind: "logo" },
    { kind: "title", text: "CONTRACT OF SERVICES" },
    {
      kind: "rich",
      indent: true,
      segments: [
        segment("Between the undersigned, namely "),
        segment(ORGANIZADORA.nombre, true, true),
        segment(
          `, of legal age, Colombian, resident of Envigado, Antioquia, identified with citizenship ID No. ${ORGANIZADORA.documento}, acting on her own behalf and hereinafter referred to as "`,
        ),
        segment("THE ORGANIZER", true, true),
        segment('," of the one part, and '),
        segment(clienteCaps, true, true),
        segment(
          `, of legal age, identified with ${v.cliente.tipoDocumentoEn} whose number is listed below ${pronoun} signature, acting on ${pronoun === "her" ? "her" : "his"} own behalf and hereinafter referred to as "`,
        ),
        segment("THE CLIENT", true, true),
        segment(
          `," the parties have freely, autonomously, and independently agreed to enter into this civil service agreement for the organization of the wedding of ${v.nombrePareja.toUpperCase()}, which shall be governed by current civil and commercial legislation and, specifically, by the following clauses:`,
        ),
      ],
    },
    { kind: "spacer" },
    {
      kind: "clause",
      heading: "FIRST: OBJECTIVE OF THE CONTRACT. ",
      body: `THE CLIENT engages the services of THE ORGANIZER to take charge of the organization, planning, logistics, and other tasks required for the wedding of ${v.nombrePareja} to be held in ${v.ciudad}, Colombia, on ${v.fechaBoda}. This includes the ceremony, the welcome party, and the farewell party, should they take place.`,
    },
    {
      kind: "paragraph",
      indent: true,
      text: "As part of this contract, THE ORGANIZER commits to the satisfaction of THE CLIENT in carrying out the following services:",
    },
    {
      kind: "bullet",
      text: "Searching for and coordinating vendors and the wedding venue, providing at least three options for each, based on THE CLIENT's parameters.",
    },
    {
      kind: "bullet",
      text: "Advising on schedules, activities, vendors, services, contracts, logistics, protocols, and all other wedding-related needs.",
    },
    {
      kind: "bullet",
      text: "Being available in the days prior to the wedding to finalize any details required by THE CLIENT. On the wedding day, attending in advance to oversee the ceremony and reception until the agreed-upon conclusion time.",
    },
    {
      kind: "bullet",
      text: "Assisting with planning other events such as welcome or farewell parties. However, direct coordination on the event day will incur an additional cost of $700.000 COP, and a delegated team member will supervise these events.",
    },
    {
      kind: "bullet",
      text: "Managing transportation and accommodation logistics for the wedding day for both the couple and the guests.",
    },
    {
      kind: "bullet",
      text: "Providing a schedule detailing the timelines for each service, vendor, and logistical aspect of the wedding, subject to prior agreement with THE CLIENT.",
    },
    {
      kind: "bullet",
      text: "Advising on the ideal provider for creating a wedding website and guiding the process.",
    },
    {
      kind: "labeled",
      label: "Paragraph 1: ",
      text: "THE CLIENT shall sign and assume responsibility for payments related to all contracts with vendors, accommodations, and venues for the wedding, always under the advice and suggestions of THE ORGANIZER.",
    },
    {
      kind: "clause",
      heading: "SECOND: DURATION. ",
      body: "The provision of organization, advisory, and coordination services shall remain in effect from the signing of this contract until the day after the wedding date, or until all third-party obligations have been settled and all services are fully discharged.",
    },
    {
      kind: "labeled",
      label: "Paragraph 1: ",
      text: "In the event of more than three trips outside the city of Medellín and its Metropolitan Area, these shall be covered by THE CLIENT. The three standard trips are: 1. Venue search. 2. Scouting with vendors. 3. Wedding day.",
    },
    {
      kind: "labeled",
      label: "Paragraph 2: ",
      text: "THE ORGANIZER shall have availability of three (3) hours per week for advisory and support of THE CLIENT; however, this time shall be flexible according to the needs of THE CLIENT and THE ORGANIZER for wedding coordination.",
    },
    {
      kind: "labeled",
      label: "Paragraph 3: ",
      text: `THE ORGANIZER, in her capacity as expert, with extensive experience and work capacity, expressly commits to handling all work described in this contract, and to delegate accordingly to her collaborators. She acknowledges that she and her team composed of ${ORGANIZADORA.equipo} are solely responsible for the contracted events.`,
    },
    {
      kind: "clause",
      heading: "THIRD: CONTRACT VALUE. ",
      body: `THE CLIENT shall pay THE ORGANIZER as consideration for the activities agreed upon in the object of this contract, the sum of ${v.honorarios.letrasEn} (${v.honorarios.numeros}), payable as follows: a) upon signing this contract, a payment of ${v.anticipo.letrasEn} (${v.anticipo.numeros}). b) eight days before the wedding, a payment of ${v.saldo.letrasEn} (${v.saldo.numeros}).`,
    },
    {
      kind: "labeled",
      label: "Paragraph 1: ",
      text: "The price of this contract represents the net amount to be paid; therefore, VAT does not apply.",
    },
    {
      kind: "labeled",
      label: "Paragraph 2: ",
      text: "In the event of any withholdings by THE CLIENT, this amount shall be added to the final charge of this contract.",
    },
    {
      kind: "labeled",
      label: "Paragraph 3: ",
      text: `Payment of the price established in this clause shall be in cash, credit card via a link (an additional charge of 3.9% applies) sent in advance, or by deposit to the following savings account: ${ORGANIZADORA.banco}, in the name of ${ORGANIZADORA.nombre} C.C ${ORGANIZADORA.documento}. For deposit payments to be effective, THE CLIENT must send a copy of the deposit receipt to the email ${ORGANIZADORA.email}.`,
    },
    {
      kind: "clause",
      heading: "FOURTH: CONFIRMATORY PENAL EARNEST MONEY. ",
      body: "The parties agree that the advance payment set forth in subsection a) of the previous clause is delivered as CONFIRMATORY PENAL EARNEST MONEY, with the purpose of confirming the contract and guaranteeing its execution. If the contract is not performed due to causes attributable to THE CLIENT, the earnest money shall remain in possession of THE ORGANIZER as a penal sanction. If the contract is not performed due to causes attributable to THE ORGANIZER, she shall return to THE CLIENT the amount of the advance within the month following the request.",
    },
    {
      kind: "clause",
      heading: "FIFTH: CHANGE OF EVENT DATE. ",
      body: "If a date change is necessary, THE CLIENT together with THE ORGANIZER shall jointly seek a convenient and available date for the wedding, making every effort to maintain the celebration date in the agreed year, subject to prior agreement between the parties according to THE ORGANIZER's availability.",
    },
    {
      kind: "clause",
      heading: "SIXTH: FOOD AND ACCOMMODATION DURING THE EVENT. ",
      body: "Basic meals for the work team (photography, video, production, DJ, wedding planners, band, or any vendor working that day for the development of the wedding), non-alcoholic beverages, and accommodation when necessary if the event is outside Medellín, shall be assumed by THE CLIENT without being deducted from the contract value.",
    },
    {
      kind: "clause",
      heading: "SEVENTH: ASSIGNMENT OF CONTRACT. ",
      body: "THE CLIENT may not assign this contract without the express written authorization of THE ORGANIZER. Likewise, THE ORGANIZER may not assign this service contract in whole or in part to third parties.",
    },
    {
      kind: "paragraph",
      indent: true,
      text: "The parties declare that they accept this contract in all its clauses, terms and conditions, signing two originals of the same tenor.",
    },
    { kind: "spacer" },
    { kind: "signature_date", text: v.fechaFirmaEn },
    { kind: "spacer" },
    {
      kind: "signature_block",
      name: ORGANIZADORA.nombre,
      role: "THE ORGANIZER",
      details: [
        `C.C ${ORGANIZADORA.documento}`,
        `ADDRESS: ${ORGANIZADORA.direccion}`,
        `PHONE: ${ORGANIZADORA.celular}`,
        `EMAIL: ${ORGANIZADORA.email}`,
      ],
    },
    { kind: "spacer" },
    {
      kind: "signature_block",
      name: v.cliente.nombre.toUpperCase(),
      role: "THE CLIENT",
      details: [
        `ID: ${v.cliente.numeroDocumento}`,
        `ADDRESS: ${v.cliente.direccion}`,
        `PHONE: ${v.cliente.telefono}`,
        `EMAIL: ${v.cliente.email}`,
      ],
    },
  ];
}

export function buildContratoFilename(boda: Pick<BodaRow, "nombre_pareja">): string {
  const slug = boda.nombre_pareja
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_ÁÉÍÓÚáéíóúÑñ-]/g, "");
  return `Contrato_Celestia_${slug || "boda"}.docx`;
}

export function buildContratoPdfFilename(
  boda: Pick<BodaRow, "nombre_pareja">,
): string {
  return buildContratoFilename(boda).replace(/\.docx$/i, ".pdf");
}
