"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type BodaClientePortalTogglesProps = {
  bodaId: string;
  mostrarUsdCliente: boolean;
  permitirExcelCliente: boolean;
};

export function BodaClientePortalToggles({
  bodaId,
  mostrarUsdCliente,
  permitirExcelCliente,
}: BodaClientePortalTogglesProps) {
  const router = useRouter();
  const [mostrarUsd, setMostrarUsd] = useState(mostrarUsdCliente);
  const [permitirExcel, setPermitirExcel] = useState(permitirExcelCliente);
  const [savingField, setSavingField] = useState<
    "mostrar_usd_cliente" | "permitir_excel_cliente" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMostrarUsd(mostrarUsdCliente);
  }, [mostrarUsdCliente]);

  useEffect(() => {
    setPermitirExcel(permitirExcelCliente);
  }, [permitirExcelCliente]);

  async function updateFlag(
    field: "mostrar_usd_cliente" | "permitir_excel_cliente",
    value: boolean,
  ) {
    if (!supabase || savingField) return;

    const previousUsd = mostrarUsd;
    const previousExcel = permitirExcel;

    if (field === "mostrar_usd_cliente") setMostrarUsd(value);
    else setPermitirExcel(value);

    setSavingField(field);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("bodas")
        .update({ [field]: value })
        .eq("id", bodaId);

      if (updateError) {
        if (field === "mostrar_usd_cliente") setMostrarUsd(previousUsd);
        else setPermitirExcel(previousExcel);
        setError(updateError.message);
        return;
      }

      router.refresh();
    } finally {
      setSavingField(null);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-bloom-border bg-bloom-surface px-4 py-3 sm:px-5">
      <p className="text-sm font-medium text-bloom-ink">Portal del cliente</p>
      <p className="mt-0.5 text-xs text-bloom-muted">
        Controla qué ve el cliente en su portal público
      </p>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <ToggleRow
          label="Mostrar USD al cliente"
          checked={mostrarUsd}
          disabled={savingField != null}
          onChange={(next) => updateFlag("mostrar_usd_cliente", next)}
        />
        <ToggleRow
          label="Permitir descarga Excel al cliente"
          checked={permitirExcel}
          disabled={savingField != null}
          onChange={(next) => updateFlag("permitir_excel_cliente", next)}
        />
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-full border border-bloom-border bg-bloom-canvas/50 px-3 py-2 text-sm text-bloom-ink">
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-bloom-accent" : "bg-bloom-border"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
      </span>
      {label}
    </label>
  );
}
