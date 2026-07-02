import { formatCurrency } from "@/lib/format";
import { cotizacionSuperaPresupuesto } from "@/lib/cotizacion-lead";

type CotizacionPresupuestoAlertaProps = {
  totalCotizado: number;
  presupuestoEstimado: number | null;
  className?: string;
};

export function CotizacionPresupuestoAlerta({
  totalCotizado,
  presupuestoEstimado,
  className = "mt-4",
}: CotizacionPresupuestoAlertaProps) {
  if (!cotizacionSuperaPresupuesto(totalCotizado, presupuestoEstimado)) {
    return null;
  }

  return (
    <p
      className={`${className} rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900`}
      role="alert"
    >
      ⚠️ El valor cotizado supera el presupuesto inicial del cliente (
      {formatCurrency(presupuestoEstimado!)})
    </p>
  );
}
