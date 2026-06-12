"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReporteFinancieroData } from "@/lib/reporte-financiero";
import { formatCurrency, formatShortDateStable } from "@/lib/format";

type ReporteFinancieroClientProps = {
  data: ReporteFinancieroData;
};

export function ReporteFinancieroClient({ data }: ReporteFinancieroClientProps) {
  const router = useRouter();

  function handleYearChange(year: number) {
    router.push(`/admin/reporte-financiero?year=${year}`);
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label
            htmlFor="reporte-year"
            className="text-sm font-medium text-bloom-ink"
          >
            Año
          </label>
          <select
            id="reporte-year"
            value={data.year}
            onChange={(event) => handleYearChange(Number(event.target.value))}
            className="mt-1.5 w-full rounded-xl border border-bloom-border bg-bloom-surface px-4 py-2.5 text-sm text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/20 sm:w-40"
          >
            {data.availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section>
        <SectionTitle>Resumen general</SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Bodas activas"
            value={String(data.resumen.bodasActivas)}
            hint="Fecha de boda pendiente en el año"
          />
          <MetricCard
            label="Bodas completadas"
            value={String(data.resumen.bodasCompletadas)}
            hint="Celebradas en el año"
          />
          <MetricCard
            label="Leads en el año"
            value={String(data.resumen.totalLeads)}
            hint={`${data.resumen.leadsConvertidos} convertidos`}
          />
          <MetricCard
            label="Tasa de conversión"
            value={`${data.resumen.tasaConversion}%`}
            hint="Leads convertidos / total leads"
          />
        </div>
      </section>

      <section>
        <SectionTitle>Ingresos</SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Honorarios proyectados"
            value={formatCurrency(data.ingresos.proyectados)}
            accent
          />
          <MetricCard
            label="Honorarios cobrados"
            value={formatCurrency(data.ingresos.cobrados)}
            success
          />
          <MetricCard
            label="Honorarios pendientes"
            value={formatCurrency(data.ingresos.pendientes)}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-bloom-border bg-bloom-surface p-5 shadow-sm sm:p-6">
          <h3 className="font-display text-xl text-bloom-ink">
            Honorarios por mes
          </h3>
          <p className="mt-1 text-sm text-bloom-muted">
            Proyectados vs cobrados según fecha de boda
          </p>
          <div className="mt-6 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.ingresos.mensual} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8dfd6" />
                <XAxis
                  dataKey="mesLabel"
                  tick={{ fill: "#6b5f55", fontSize: 12 }}
                  axisLine={{ stroke: "#e8dfd6" }}
                />
                <YAxis
                  tick={{ fill: "#6b5f55", fontSize: 12 }}
                  axisLine={{ stroke: "#e8dfd6" }}
                  tickFormatter={(value) =>
                    formatCurrency(Number(value)).replace(/\s/g, "")
                  }
                />
                <Tooltip
                  formatter={(value) =>
                    formatCurrency(Number(value ?? 0))
                  }
                  contentStyle={{
                    borderRadius: "12px",
                    borderColor: "#e8dfd6",
                    backgroundColor: "#fffdf9",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="proyectados"
                  name="Proyectados"
                  fill="#7d6b5a"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="cobrados"
                  name="Cobrados"
                  fill="#5a7d62"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>Comisiones</SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Comisiones proyectadas"
            value={formatCurrency(data.comisiones.proyectadas)}
            accent
          />
          <MetricCard
            label="Comisiones cobradas"
            value={formatCurrency(data.comisiones.cobradas)}
            success
          />
          <MetricCard
            label="Comisiones pendientes"
            value={formatCurrency(data.comisiones.pendientes)}
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-bloom-border bg-bloom-surface shadow-sm">
          <div className="border-b border-bloom-border px-5 py-4 sm:px-6">
            <h3 className="font-display text-xl text-bloom-ink">
              Comisiones pendientes
            </h3>
            <p className="mt-1 text-sm text-bloom-muted">
              Proveedores contratados con comisión aún no recibida
            </p>
          </div>
          {data.comisiones.pendientesLista.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-bloom-muted sm:px-6">
              No hay comisiones pendientes para este año.
            </p>
          ) : (
            <ul className="divide-y divide-bloom-border/80">
              {data.comisiones.pendientesLista.map((item) => (
                <li
                  key={item.proveedorId}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div>
                    <p className="font-medium text-bloom-ink">
                      {item.proveedorNombre}
                    </p>
                    <p className="mt-0.5 text-sm text-bloom-muted">
                      <Link
                        href={`/bodas/${item.bodaId}`}
                        className="text-bloom-accent hover:underline"
                      >
                        {item.bodaNombre}
                      </Link>
                      {item.fechaBoda && (
                        <span> · {formatShortDateStable(item.fechaBoda)}</span>
                      )}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-display text-lg text-bloom-ink">
                      {formatCurrency(item.valorComision)}
                    </p>
                    <p className="text-xs text-bloom-muted">
                      {item.porcentaje}% comisión
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <SectionTitle>Ticket promedio</SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <MetricCard
            label="Ticket promedio por boda"
            value={formatCurrency(data.ticket.promedioBoda)}
            hint={`${data.ticket.bodasConHonorarios} bodas con honorarios`}
          />
          <MetricCard
            label="Ticket promedio leads convertidos"
            value={formatCurrency(data.ticket.promedioLeadConvertido)}
            hint={`${data.ticket.leadsConvertidosConHonorarios} bodas de leads convertidos`}
          />
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-2xl text-bloom-ink">{children}</h2>
  );
}

function MetricCard({
  label,
  value,
  hint,
  accent = false,
  success = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  success?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-bloom-border bg-bloom-surface p-5 shadow-sm">
      <p className="text-sm font-medium text-bloom-muted">{label}</p>
      <p
        className={`mt-2 font-display text-3xl ${
          success
            ? "text-bloom-success"
            : accent
              ? "text-bloom-accent"
              : "text-bloom-ink"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-bloom-muted">{hint}</p>}
    </div>
  );
}
