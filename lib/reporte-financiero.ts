import type { ProveedorRow } from "@/app/data/providers";
import type { BodaRow } from "@/app/data/weddings";
import type { LeadRow } from "@/app/data/leads";
import {
  calcularResumenComisiones,
  getValorComisionProveedor,
} from "@/lib/comisiones";

export type ReporteFinancieroBoda = Pick<
  BodaRow,
  | "id"
  | "nombre_pareja"
  | "fecha_boda"
  | "honorarios"
  | "anticipo_honorarios"
  | "lead_id"
  | "created_at"
>;

export type ReporteFinancieroProveedor = ProveedorRow & {
  bodas: Pick<BodaRow, "id" | "nombre_pareja" | "fecha_boda"> | null;
};

export type HonorariosMensuales = {
  mes: string;
  mesLabel: string;
  proyectados: number;
  cobrados: number;
};

export type ComisionPendienteItem = {
  proveedorId: string;
  proveedorNombre: string;
  bodaId: string;
  bodaNombre: string;
  fechaBoda: string;
  valorComision: number;
  porcentaje: number;
};

export type ReporteFinancieroData = {
  year: number;
  availableYears: number[];
  resumen: {
    bodasActivas: number;
    bodasCompletadas: number;
    totalLeads: number;
    tasaConversion: number;
    leadsConvertidos: number;
  };
  ingresos: {
    proyectados: number;
    cobrados: number;
    pendientes: number;
    mensual: HonorariosMensuales[];
  };
  comisiones: {
    proyectadas: number;
    cobradas: number;
    pendientes: number;
    pendientesLista: ComisionPendienteItem[];
  };
  ticket: {
    promedioBoda: number;
    promedioLeadConvertido: number;
    bodasConHonorarios: number;
    leadsConvertidosConHonorarios: number;
  };
};

const MESES_ES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

function getYearFromDate(isoDate: string): number {
  return Number(isoDate.slice(0, 4));
}

function isInYear(isoDate: string, year: number): boolean {
  return getYearFromDate(isoDate) === year;
}

export function getHonorariosProyectados(
  boda: Pick<BodaRow, "honorarios">,
): number {
  return Number(boda.honorarios ?? 0);
}

export function getHonorariosCobrados(
  boda: Pick<BodaRow, "honorarios" | "anticipo_honorarios" | "fecha_boda">,
  todayIso = new Date().toISOString().slice(0, 10),
): number {
  const honorarios = Number(boda.honorarios ?? 0);
  const anticipo = Number(boda.anticipo_honorarios ?? 0);

  if (honorarios <= 0) return 0;
  if (boda.fecha_boda < todayIso) {
    return honorarios;
  }

  return Math.min(anticipo, honorarios);
}

export function buildAvailableReportYears(
  bodas: Pick<BodaRow, "fecha_boda" | "created_at">[],
  leads: Pick<LeadRow, "created_at">[],
): number[] {
  const currentYear = new Date().getFullYear();
  const years = new Set<number>([currentYear]);

  for (const boda of bodas) {
    years.add(getYearFromDate(boda.fecha_boda));
    years.add(getYearFromDate(boda.created_at));
  }

  for (const lead of leads) {
    years.add(getYearFromDate(lead.created_at));
  }

  return Array.from(years).sort((a, b) => b - a);
}

export function buildReporteFinancieroData(
  year: number,
  bodas: ReporteFinancieroBoda[],
  leads: LeadRow[],
  proveedores: ReporteFinancieroProveedor[],
): ReporteFinancieroData {
  const todayIso = new Date().toISOString().slice(0, 10);
  const availableYears = buildAvailableReportYears(bodas, leads);

  const bodasDelAno = bodas.filter((boda) => isInYear(boda.fecha_boda, year));
  const leadsDelAno = leads.filter((lead) => isInYear(lead.created_at, year));

  const convertedLeadIds = new Set(
    bodas
      .map((boda) => boda.lead_id)
      .filter((leadId): leadId is string => Boolean(leadId)),
  );

  const leadsConvertidosDelAno = leadsDelAno.filter((lead) =>
    convertedLeadIds.has(lead.id),
  );

  const bodasActivas = bodasDelAno.filter(
    (boda) => boda.fecha_boda >= todayIso,
  ).length;

  const bodasCompletadas = bodasDelAno.filter(
    (boda) => boda.fecha_boda < todayIso,
  ).length;

  const tasaConversion =
    leadsDelAno.length > 0
      ? Math.round((leadsConvertidosDelAno.length / leadsDelAno.length) * 100)
      : 0;

  const ingresosProyectados = bodasDelAno.reduce(
    (sum, boda) => sum + getHonorariosProyectados(boda),
    0,
  );

  const ingresosCobrados = bodasDelAno.reduce(
    (sum, boda) => sum + getHonorariosCobrados(boda, todayIso),
    0,
  );

  const mensual: HonorariosMensuales[] = Array.from({ length: 12 }, (_, index) => {
    const mes = index + 1;
    const mesKey = `${year}-${String(mes).padStart(2, "0")}`;
    const bodasMes = bodasDelAno.filter((boda) =>
      boda.fecha_boda.startsWith(mesKey),
    );

    return {
      mes: mesKey,
      mesLabel: MESES_ES[index],
      proyectados: bodasMes.reduce(
        (sum, boda) => sum + getHonorariosProyectados(boda),
        0,
      ),
      cobrados: bodasMes.reduce(
        (sum, boda) => sum + getHonorariosCobrados(boda, todayIso),
        0,
      ),
    };
  });

  const proveedoresDelAno = proveedores.filter((proveedor) => {
    const fechaBoda = proveedor.bodas?.fecha_boda;
    return (
      proveedor.estado === "contratado" &&
      proveedor.da_comision &&
      fechaBoda &&
      isInYear(fechaBoda, year)
    );
  });

  const comisionesResumen = calcularResumenComisiones(proveedoresDelAno);

  const pendientesLista: ComisionPendienteItem[] = proveedoresDelAno
    .filter((proveedor) => !proveedor.comision_recibida)
    .map((proveedor) => ({
      proveedorId: proveedor.id,
      proveedorNombre: proveedor.nombre,
      bodaId: proveedor.boda_id,
      bodaNombre: proveedor.bodas?.nombre_pareja ?? "—",
      fechaBoda: proveedor.bodas?.fecha_boda ?? "",
      valorComision: getValorComisionProveedor(proveedor),
      porcentaje: proveedor.porcentaje_comision ?? 10,
    }))
    .sort((a, b) => {
      const dateCompare = a.fechaBoda.localeCompare(b.fechaBoda);
      if (dateCompare !== 0) return dateCompare;
      return a.bodaNombre.localeCompare(b.bodaNombre, "es");
    });

  const bodasConHonorarios = bodasDelAno.filter(
    (boda) => getHonorariosProyectados(boda) > 0,
  );

  const convertedBodasDelAno = bodasDelAno.filter(
    (boda) => boda.lead_id && leadsConvertidosDelAno.some((l) => l.id === boda.lead_id),
  );

  const convertedBodasConHonorarios = convertedBodasDelAno.filter(
    (boda) => getHonorariosProyectados(boda) > 0,
  );

  const totalHonorariosBodas = bodasConHonorarios.reduce(
    (sum, boda) => sum + getHonorariosProyectados(boda),
    0,
  );

  const totalHonorariosConvertidos = convertedBodasConHonorarios.reduce(
    (sum, boda) => sum + getHonorariosProyectados(boda),
    0,
  );

  return {
    year,
    availableYears,
    resumen: {
      bodasActivas,
      bodasCompletadas,
      totalLeads: leadsDelAno.length,
      tasaConversion,
      leadsConvertidos: leadsConvertidosDelAno.length,
    },
    ingresos: {
      proyectados: ingresosProyectados,
      cobrados: ingresosCobrados,
      pendientes: Math.max(0, ingresosProyectados - ingresosCobrados),
      mensual,
    },
    comisiones: {
      proyectadas: comisionesResumen.totalEsperado,
      cobradas: comisionesResumen.totalRecibido,
      pendientes: comisionesResumen.totalPendiente,
      pendientesLista,
    },
    ticket: {
      promedioBoda:
        bodasConHonorarios.length > 0
          ? Math.round(totalHonorariosBodas / bodasConHonorarios.length)
          : 0,
      promedioLeadConvertido:
        convertedBodasConHonorarios.length > 0
          ? Math.round(
              totalHonorariosConvertidos / convertedBodasConHonorarios.length,
            )
          : 0,
      bodasConHonorarios: bodasConHonorarios.length,
      leadsConvertidosConHonorarios: convertedBodasConHonorarios.length,
    },
  };
}
