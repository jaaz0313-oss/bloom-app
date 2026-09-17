"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid, List, Loader2, Pencil } from "lucide-react";
import {
  hasProveedorValorDefinido,
  isProveedorSinCosto,
  parseProveedorValorInput,
  PROVIDER_STATUS_LABELS,
  PROVIDER_STATUS_STYLES,
  type ProviderStatus,
  type ProveedorRow,
} from "@/app/data/providers";
import {
  AUDITORIA_ACCIONES,
  buildProveedorEstadoAuditoriaDetalle,
  logAuditoria,
} from "@/lib/auditoria";
import { hasPermission, type UserRole } from "@/lib/auth/roles";
import { marcarHitoCronogramaPorProveedorContratado } from "@/lib/cronograma";
import {
  formatInputCurrency,
  formatInputCurrencyFromNumber,
} from "@/lib/format";
import { PROVIDER_CATEGORIES } from "@/lib/provider-categories";
import type { CotizacionBodaContext } from "@/lib/proveedor-cotizacion";
import { supabase } from "@/lib/supabase";
import { syncBodaProveedoresContratados } from "@/lib/sync-boda";
import { syncTastingNotasReunionToProveedor } from "@/lib/tasting-notas-reunion";

const STATUS_OPTIONS = Object.keys(
  PROVIDER_STATUS_LABELS,
) as ProviderStatus[];

type EditableField =
  | "categoria"
  | "nombre"
  | "descripcion_servicio"
  | "notas"
  | "estado"
  | "sin_costo"
  | "valor_total";

function valorInputFromProvider(provider: ProveedorRow): string {
  if (isProveedorSinCosto(provider)) return "";
  return hasProveedorValorDefinido(provider.valor_total)
    ? formatInputCurrencyFromNumber(provider.valor_total)
    : "";
}

type ProvidersTableViewProps = {
  providers: ProveedorRow[];
  bodaId: string;
  boda: CotizacionBodaContext;
  plannerName: string;
  currentUserId: string;
  role: UserRole;
  onProviderUpdated?: (updated: ProveedorRow) => void;
  onRequestFullEdit: (providerId: string) => void;
};

export function ProvidersTableView({
  providers,
  bodaId,
  boda,
  plannerName,
  currentUserId,
  role,
  onProviderUpdated,
  onRequestFullEdit,
}: ProvidersTableViewProps) {
  const canManage = hasPermission(role, "providers.manage");

  if (providers.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-bloom-border bg-bloom-surface px-5 py-8 text-center text-sm text-bloom-muted">
        Aún no hay proveedores para mostrar en la tabla.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-bloom-border bg-bloom-surface shadow-sm">
      <table className="min-w-[960px] w-full table-fixed border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-bloom-border bg-bloom-canvas/80 text-xs font-medium uppercase tracking-wide text-bloom-muted">
            <th className="w-[12%] px-2 py-2.5">Categoría</th>
            <th className="w-[13%] px-2 py-2.5">Nombre</th>
            <th className="w-[21%] px-2 py-2.5">Descripción</th>
            <th className="w-[18%] px-2 py-2.5">Notas</th>
            <th className="w-[11%] px-2 py-2.5">Estado</th>
            <th className="w-[8%] px-2 py-2.5 text-center">Sin costo</th>
            <th className="w-[12%] px-2 py-2.5">Valor</th>
            <th className="w-[5%] px-2 py-2.5 text-center"> </th>
          </tr>
        </thead>
        <tbody>
          {providers.map((provider) => (
            <ProvidersTableRow
              key={provider.id}
              provider={provider}
              bodaId={bodaId}
              boda={boda}
              plannerName={plannerName}
              currentUserId={currentUserId}
              canManage={canManage}
              onProviderUpdated={onProviderUpdated}
              onRequestFullEdit={onRequestFullEdit}
            />
          ))}
        </tbody>
      </table>
      {!canManage ? (
        <p className="border-t border-bloom-border px-4 py-2 text-xs text-bloom-muted">
          Vista de solo lectura: tu rol no puede editar proveedores.
        </p>
      ) : null}
    </div>
  );
}

type ProvidersTableRowProps = {
  provider: ProveedorRow;
  bodaId: string;
  boda: CotizacionBodaContext;
  plannerName: string;
  currentUserId: string;
  canManage: boolean;
  onProviderUpdated?: (updated: ProveedorRow) => void;
  onRequestFullEdit: (providerId: string) => void;
};

function ProvidersTableRow({
  provider,
  bodaId,
  boda,
  plannerName,
  currentUserId,
  canManage,
  onProviderUpdated,
  onRequestFullEdit,
}: ProvidersTableRowProps) {
  const [categoria, setCategoria] = useState(provider.categoria);
  const [nombre, setNombre] = useState(provider.nombre);
  const [descripcion, setDescripcion] = useState(
    provider.descripcion_servicio ?? "",
  );
  const [notas, setNotas] = useState(provider.notas ?? "");
  const [estado, setEstado] = useState<ProviderStatus>(provider.estado);
  const [sinCosto, setSinCosto] = useState(isProveedorSinCosto(provider));
  const [valorInput, setValorInput] = useState(valorInputFromProvider(provider));
  const [savingField, setSavingField] = useState<EditableField | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCategoria(provider.categoria);
    setNombre(provider.nombre);
    setDescripcion(provider.descripcion_servicio ?? "");
    setNotas(provider.notas ?? "");
    setEstado(provider.estado);
    setSinCosto(isProveedorSinCosto(provider));
    setValorInput(valorInputFromProvider(provider));
  }, [provider]);

  const categoryOptions = useMemo(() => {
    const known = PROVIDER_CATEGORIES as readonly string[];
    if (categoria && !known.includes(categoria)) {
      return [categoria, ...known];
    }
    return [...known];
  }, [categoria]);

  async function persistPatch(
    field: EditableField,
    patch: Partial<ProveedorRow>,
    extras?: Record<string, unknown>,
  ) {
    if (!canManage) return;
    setSavingField(field);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("proveedores")
        .update({ ...patch, ...extras })
        .eq("id", provider.id);

      if (updateError) {
        setError(updateError.message);
        // revert local UI to last known provider values
        setCategoria(provider.categoria);
        setNombre(provider.nombre);
        setDescripcion(provider.descripcion_servicio ?? "");
        setNotas(provider.notas ?? "");
        setEstado(provider.estado);
        setSinCosto(isProveedorSinCosto(provider));
        setValorInput(valorInputFromProvider(provider));
        return;
      }

      const updated: ProveedorRow = {
        ...provider,
        ...patch,
        ...(extras as Partial<ProveedorRow> | undefined),
      };
      onProviderUpdated?.(updated);

      if (
        field === "estado" &&
        patch.estado &&
        patch.estado !== provider.estado
      ) {
        if (patch.estado === "contratado") {
          await syncBodaProveedoresContratados(bodaId);
          await marcarHitoCronogramaPorProveedorContratado(
            supabase,
            bodaId,
            updated.categoria,
          );
          await syncTastingNotasReunionToProveedor(supabase, {
            bodaId,
            proveedorId: provider.id,
            proveedorNombre: updated.nombre,
            currentUserId,
            currentUserNombre: plannerName,
          });
        }

        await logAuditoria({
          accion: AUDITORIA_ACCIONES.ESTADO_PROVEEDOR,
          entidad: "proveedor",
          entidadId: provider.id,
          bodaNombre: boda.nombrePareja,
          detalle: buildProveedorEstadoAuditoriaDetalle(
            updated.nombre,
            patch.estado,
          ),
        });
      }
    } finally {
      setSavingField(null);
    }
  }

  async function handleCategoriaBlur() {
    const next = categoria.trim();
    if (!next || next === provider.categoria) {
      setCategoria(provider.categoria);
      return;
    }
    await persistPatch("categoria", { categoria: next });
  }

  async function handleNombreBlur() {
    const next = nombre.trim();
    if (!next || next === provider.nombre) {
      setNombre(provider.nombre);
      return;
    }
    await persistPatch("nombre", { nombre: next });
  }

  async function handleDescripcionBlur() {
    const next = descripcion.trim();
    const current = provider.descripcion_servicio?.trim() ?? "";
    if (next === current) return;
    await persistPatch("descripcion_servicio", {
      descripcion_servicio: next || null,
    });
  }

  async function handleNotasBlur() {
    const next = notas.trim();
    const current = provider.notas?.trim() ?? "";
    if (next === current) return;
    await persistPatch("notas", { notas: next || null });
  }

  async function handleEstadoChange(next: ProviderStatus) {
    if (next === provider.estado) return;
    setEstado(next);
    const extras: Record<string, unknown> = {};
    if (next === "cotizacion_solicitada" && !provider.cotizacion_solicitada_at) {
      extras.cotizacion_solicitada_at = new Date().toISOString();
    }
    await persistPatch("estado", { estado: next }, extras);
  }

  async function handleSinCostoChange(checked: boolean) {
    if (!canManage || checked === isProveedorSinCosto(provider)) return;
    setSinCosto(checked);
    if (checked) {
      setValorInput("");
      await persistPatch(
        "sin_costo",
        { sin_costo: true, valor_total: 0 },
        { monto_cotizado: null },
      );
      return;
    }
    await persistPatch("sin_costo", { sin_costo: false });
  }

  async function handleValorBlur() {
    if (sinCosto || isProveedorSinCosto(provider)) {
      setValorInput("");
      return;
    }

    const raw = valorInput.trim();
    if (!raw) {
      const currentDefined = hasProveedorValorDefinido(provider.valor_total);
      if (!currentDefined) {
        setValorInput("");
        return;
      }
      // Vaciar valor → 0
      const extras =
        provider.estado === "en_negociacion"
          ? { monto_cotizado: null }
          : undefined;
      await persistPatch("valor_total", { valor_total: 0 }, extras);
      setValorInput("");
      return;
    }

    const valor = parseProveedorValorInput(raw);
    if (!Number.isFinite(valor) || valor < 0) {
      setError("Ingresa un valor válido (>= 0).");
      setValorInput(valorInputFromProvider(provider));
      return;
    }
    if (valor === 0 && provider.anticipo > 0) {
      setError("Si el valor total está pendiente, el anticipo debe ser 0.");
      setValorInput(valorInputFromProvider(provider));
      return;
    }
    if (valor > 0 && provider.anticipo > valor) {
      setError("El anticipo no puede ser mayor que el valor total.");
      setValorInput(valorInputFromProvider(provider));
      return;
    }

    const valorGuardar = Math.round(valor);
    if (valorGuardar === Math.round(Number(provider.valor_total ?? 0))) {
      setValorInput(valorInputFromProvider(provider));
      return;
    }

    const extras =
      provider.estado === "en_negociacion"
        ? { monto_cotizado: valorGuardar }
        : undefined;
    await persistPatch(
      "valor_total",
      { valor_total: valorGuardar },
      extras,
    );
    setValorInput(
      hasProveedorValorDefinido(valorGuardar)
        ? formatInputCurrencyFromNumber(valorGuardar)
        : "",
    );
  }

  const busy = savingField !== null;
  const inputClass =
    "w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-bloom-ink outline-none transition-colors hover:border-bloom-border focus:border-bloom-accent focus:bg-white focus:ring-2 focus:ring-bloom-accent/20 disabled:cursor-not-allowed disabled:opacity-60";
  const selectClass =
    "w-full rounded-lg border border-bloom-border/70 bg-white px-2 py-1.5 text-sm text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/20 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <>
      <tr className="border-b border-bloom-border/60 align-top last:border-b-0">
        <td className="px-2 py-2">
          <div className="relative">
            <select
              className={selectClass}
              value={categoria}
              disabled={!canManage || busy}
              onChange={(e) => setCategoria(e.target.value)}
              onBlur={() => void handleCategoriaBlur()}
              aria-label="Categoría"
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {savingField === "categoria" ? <SavingDot /> : null}
          </div>
        </td>
        <td className="px-2 py-2">
          <div className="relative">
            <input
              className={inputClass}
              value={nombre}
              disabled={!canManage || busy}
              onChange={(e) => setNombre(e.target.value)}
              onBlur={() => void handleNombreBlur()}
              aria-label="Nombre del proveedor"
            />
            {savingField === "nombre" ? <SavingDot /> : null}
          </div>
        </td>
        <td className="px-2 py-2">
          <div className="relative">
            <AutoGrowTextarea
              className={inputClass}
              value={descripcion}
              disabled={!canManage || busy}
              onChange={setDescripcion}
              onBlur={() => void handleDescripcionBlur()}
              ariaLabel="Descripción del servicio"
              placeholder="Descripción del servicio"
            />
            {savingField === "descripcion_servicio" ? <SavingDot /> : null}
          </div>
        </td>
        <td className="px-2 py-2">
          <div className="relative">
            <AutoGrowTextarea
              className={inputClass}
              value={notas}
              disabled={!canManage || busy}
              onChange={setNotas}
              onBlur={() => void handleNotasBlur()}
              ariaLabel="Notas internas"
              placeholder="Notas internas"
            />
            {savingField === "notas" ? <SavingDot /> : null}
          </div>
        </td>
        <td className="px-1.5 py-2">
          <div className="relative">
            <select
              className={`${selectClass} max-w-full truncate text-xs ${PROVIDER_STATUS_STYLES[estado]}`}
              value={estado}
              disabled={!canManage || busy}
              onChange={(e) =>
                void handleEstadoChange(e.target.value as ProviderStatus)
              }
              aria-label="Estado"
              title={PROVIDER_STATUS_LABELS[estado]}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {PROVIDER_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            {savingField === "estado" ? <SavingDot /> : null}
          </div>
        </td>
        <td className="px-2 py-2 text-center">
          <div className="relative inline-flex items-center justify-center">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-bloom-border text-bloom-accent focus:ring-bloom-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
              checked={sinCosto}
              disabled={!canManage || busy}
              onChange={(e) => void handleSinCostoChange(e.target.checked)}
              aria-label="Sin costo"
              title="Sin costo (lo paga el cliente)"
            />
            {savingField === "sin_costo" ? <SavingDot /> : null}
          </div>
        </td>
        <td className="px-2 py-2">
          <div className="relative">
            {sinCosto ? (
              <span className="block px-2 py-1.5 text-sm text-bloom-muted">—</span>
            ) : (
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className={`${inputClass} text-right tabular-nums`}
                value={valorInput}
                disabled={!canManage || busy}
                placeholder="—"
                onChange={(e) =>
                  setValorInput(formatInputCurrency(e.target.value))
                }
                onBlur={() => void handleValorBlur()}
                aria-label="Valor"
              />
            )}
            {savingField === "valor_total" ? <SavingDot /> : null}
          </div>
        </td>
        <td className="px-2 py-2 text-center">
          <button
            type="button"
            onClick={() => onRequestFullEdit(provider.id)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-bloom-muted transition-colors hover:bg-bloom-canvas hover:text-bloom-ink"
            title="Abrir edición completa"
            aria-label={`Editar ${provider.nombre} completo`}
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
        </td>
      </tr>
      {error ? (
        <tr>
          <td
            colSpan={8}
            className="bg-red-50 px-3 py-1.5 text-xs text-red-700"
          >
            {error}
          </td>
        </tr>
      ) : null}
    </>
  );
}

function SavingDot() {
  return (
    <span className="pointer-events-none absolute right-1 top-1 text-bloom-muted">
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
    </span>
  );
}

function AutoGrowTextarea({
  value,
  onChange,
  onBlur,
  disabled,
  className,
  ariaLabel,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  disabled?: boolean;
  className: string;
  ariaLabel: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.max(36, el.scrollHeight)}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      className={`${className} resize-none overflow-hidden`}
      value={value}
      disabled={disabled}
      rows={1}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
    />
  );
}

export type ProvidersViewMode = "cards" | "table";

const VIEW_STORAGE_KEY = "bloom-providers-view-mode";

export function ProvidersViewToggle({
  mode,
  onChange,
}: {
  mode: ProvidersViewMode;
  onChange: (mode: ProvidersViewMode) => void;
}) {
  return (
    <div
      className="inline-flex rounded-full border border-bloom-border bg-bloom-canvas p-0.5"
      role="group"
      aria-label="Vista de proveedores"
    >
      <button
        type="button"
        onClick={() => onChange("cards")}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
          mode === "cards"
            ? "bg-bloom-surface text-bloom-ink shadow-sm"
            : "text-bloom-muted hover:text-bloom-ink"
        }`}
        aria-pressed={mode === "cards"}
      >
        <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
        Tarjetas
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
          mode === "table"
            ? "bg-bloom-surface text-bloom-ink shadow-sm"
            : "text-bloom-muted hover:text-bloom-ink"
        }`}
        aria-pressed={mode === "table"}
      >
        <List className="h-3.5 w-3.5" aria-hidden />
        Tabla
      </button>
    </div>
  );
}

export function readStoredProvidersViewMode(): ProvidersViewMode {
  if (typeof window === "undefined") return "cards";
  try {
    const value = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return value === "table" ? "table" : "cards";
  } catch {
    return "cards";
  }
}

export function storeProvidersViewMode(mode: ProvidersViewMode) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, mode);
  } catch {
    // ignore quota / private mode
  }
}
