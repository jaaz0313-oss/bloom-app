"use client";

import { useEffect, useState } from "react";
import {
  TIPOS_METODO_PAGO,
  emptyMetodoPagoInput,
  deleteProveedorMetodoPago,
  insertProveedorMetodoPago,
  listProveedorMetodosPago,
  metodoPagoInputFromRow,
  setProveedorMetodoPagoPrincipal,
  summarizeMetodoPago,
  updateProveedorMetodoPago,
  type ProveedorEspejoMetodoPago,
  type ProveedorMetodoPagoInput,
  type ProveedorMetodoPagoRow,
} from "@/app/data/proveedor-metodos-pago";
import { supabase } from "@/lib/supabase";

type Props = {
  proveedorId?: string | null;
  draftMethods?: ProveedorMetodoPagoInput[];
  onDraftMethodsChange?: (methods: ProveedorMetodoPagoInput[]) => void;
  onEspejoSynced?: (espejo: ProveedorEspejoMetodoPago) => void;
  disabled?: boolean;
  inputClassName?: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-bloom-ink">{label}</span>
      {children}
    </label>
  );
}

function MetodoFields({
  value,
  onChange,
  disabled,
  inputClass,
  showPrincipalToggle,
}: {
  value: ProveedorMetodoPagoInput;
  onChange: (next: ProveedorMetodoPagoInput) => void;
  disabled?: boolean;
  inputClass: string;
  showPrincipalToggle: boolean;
}) {
  const esTransferencia = value.tipo === "Transferencia bancaria";
  const esTarjeta = value.tipo.startsWith("Tarjeta");

  return (
    <div className="space-y-3">
      <Field label="Tipo">
        <select
          className={inputClass}
          value={value.tipo}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, tipo: e.target.value })}
        >
          {TIPOS_METODO_PAGO.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
      </Field>

      {esTransferencia ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Banco">
              <input
                className={inputClass}
                value={value.banco}
                disabled={disabled}
                placeholder="Ej: Bancolombia"
                onChange={(e) => onChange({ ...value, banco: e.target.value })}
              />
            </Field>
            <Field label="Tipo de cuenta">
              <select
                className={inputClass}
                value={value.tipo_cuenta}
                disabled={disabled}
                onChange={(e) => onChange({ ...value, tipo_cuenta: e.target.value })}
              >
                <option value="">Seleccionar</option>
                <option value="Ahorros">Ahorros</option>
                <option value="Corriente">Corriente</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Número de cuenta">
              <input
                className={inputClass}
                value={value.numero_cuenta}
                disabled={disabled}
                placeholder="Ej: 12345678901"
                onChange={(e) => onChange({ ...value, numero_cuenta: e.target.value })}
              />
            </Field>
            <Field label="Titular">
              <input
                className={inputClass}
                value={value.titular}
                disabled={disabled}
                placeholder="Ej: Juan Pérez"
                onChange={(e) => onChange({ ...value, titular: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Documento / NIT">
            <input
              className={inputClass}
              value={value.documento_titular}
              disabled={disabled}
              placeholder="Ej: 900123456-7"
              onChange={(e) => onChange({ ...value, documento_titular: e.target.value })}
            />
          </Field>
        </>
      ) : null}

      {esTarjeta ? (
        <Field label="Recargo (%)">
          <input
            type="text"
            inputMode="decimal"
            className={inputClass}
            value={value.recargo_porcentaje}
            disabled={disabled}
            placeholder="Ej: 6"
            onChange={(e) => onChange({ ...value, recargo_porcentaje: e.target.value })}
          />
        </Field>
      ) : null}

      <Field label="Notas del método">
        <input
          className={inputClass}
          value={value.notas}
          disabled={disabled}
          placeholder="Ej: vía Bold o Stripe"
          onChange={(e) => onChange({ ...value, notas: e.target.value })}
        />
      </Field>

      {showPrincipalToggle ? (
        <label className="flex items-center gap-2 text-sm text-bloom-ink">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-bloom-border text-bloom-accent focus:ring-bloom-accent/30"
            checked={value.es_principal}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, es_principal: e.target.checked })}
          />
          Marcar como método principal
        </label>
      ) : null}
    </div>
  );
}

function MetodoListItem({
  title,
  summary,
  esPrincipal,
  disabled,
  busy,
  onSetPrincipal,
  onEdit,
  onDelete,
}: {
  title: string;
  summary: string;
  esPrincipal: boolean;
  disabled?: boolean;
  busy?: boolean;
  onSetPrincipal?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border border-bloom-border/80 bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-bloom-ink">{title}</p>
            {esPrincipal ? (
              <span className="rounded-full bg-bloom-accent/10 px-2 py-0.5 text-[11px] font-medium text-bloom-accent">
                Principal
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-bloom-muted">{summary}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {!esPrincipal && onSetPrincipal ? (
            <button
              type="button"
              disabled={disabled || busy}
              onClick={onSetPrincipal}
              className="rounded-lg px-2 py-1 text-xs font-medium text-bloom-ink hover:bg-bloom-canvas"
            >
              Hacer principal
            </button>
          ) : null}
          <button
            type="button"
            disabled={disabled || busy}
            onClick={onEdit}
            className="rounded-lg px-2 py-1 text-xs font-medium text-bloom-ink hover:bg-bloom-canvas"
          >
            Editar
          </button>
          <button
            type="button"
            disabled={disabled || busy}
            onClick={onDelete}
            className="rounded-lg px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProveedorMetodosPagoEditor({
  proveedorId,
  draftMethods,
  onDraftMethodsChange,
  onEspejoSynced,
  disabled,
  inputClassName,
}: Props) {
  const inputClass =
    inputClassName ??
    "w-full rounded-xl border border-bloom-border bg-white px-3 py-2 text-sm text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/20 disabled:cursor-not-allowed disabled:opacity-60";

  const persisted = Boolean(proveedorId);
  const [rows, setRows] = useState<ProveedorMetodoPagoRow[]>([]);
  const [loading, setLoading] = useState(persisted);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<ProveedorMetodoPagoInput>(emptyMetodoPagoInput(true));

  useEffect(() => {
    if (!proveedorId) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void listProveedorMetodosPago(supabase, proveedorId).then((result) => {
      if (cancelled) return;
      if (result.error) setError(result.error);
      setRows(result.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [proveedorId]);

  function startAdd() {
    const list = persisted ? rows : (draftMethods ?? []);
    setAdding(true);
    setEditingId(null);
    setForm(emptyMetodoPagoInput(list.length === 0));
    setError(null);
  }

  function cancelForm() {
    setAdding(false);
    setEditingId(null);
    setForm(emptyMetodoPagoInput(false));
    setError(null);
  }

  async function refreshRows() {
    if (!proveedorId) return;
    const refreshed = await listProveedorMetodosPago(supabase, proveedorId);
    if (refreshed.error) setError(refreshed.error);
    setRows(refreshed.data);
  }

  async function savePersisted() {
    if (!proveedorId) return;
    setBusy(true);
    setError(null);
    try {
      if (adding) {
        const result = await insertProveedorMetodoPago(supabase, proveedorId, form);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.espejo) onEspejoSynced?.(result.espejo);
      } else if (editingId) {
        const result = await updateProveedorMetodoPago(
          supabase,
          proveedorId,
          editingId,
          form,
        );
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.espejo) onEspejoSynced?.(result.espejo);
      }
      await refreshRows();
      cancelForm();
    } finally {
      setBusy(false);
    }
  }

  function saveDraft() {
    const current = [...(draftMethods ?? [])];
    if (adding) {
      const next = [...current];
      if (form.es_principal || next.length === 0) {
        for (let i = 0; i < next.length; i++) {
          next[i] = { ...next[i], es_principal: false };
        }
        next.push({ ...form, es_principal: true });
      } else {
        next.push({ ...form, es_principal: false });
      }
      onDraftMethodsChange?.(next);
    } else if (editingId?.startsWith("draft-")) {
      const index = Number(editingId.replace("draft-", ""));
      if (!Number.isFinite(index) || index < 0 || index >= current.length) return;
      const next = current.map((item, i) => {
        if (i !== index) {
          return form.es_principal ? { ...item, es_principal: false } : item;
        }
        return { ...form };
      });
      if (!next.some((item) => item.es_principal) && next.length > 0) {
        next[0] = { ...next[0], es_principal: true };
      }
      onDraftMethodsChange?.(next);
    }
    cancelForm();
  }

  async function deletePersisted(metodoId: string) {
    if (!proveedorId) return;
    if (!window.confirm("¿Eliminar este método de pago?")) return;
    setBusy(true);
    setError(null);
    try {
      const result = await deleteProveedorMetodoPago(supabase, proveedorId, metodoId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.espejo) onEspejoSynced?.(result.espejo);
      await refreshRows();
      if (editingId === metodoId) cancelForm();
    } finally {
      setBusy(false);
    }
  }

  function deleteDraft(index: number) {
    const next = [...(draftMethods ?? [])];
    next.splice(index, 1);
    if (next.length > 0 && !next.some((item) => item.es_principal)) {
      next[0] = { ...next[0], es_principal: true };
    }
    onDraftMethodsChange?.(next);
    if (editingId === `draft-${index}`) cancelForm();
  }

  async function setPrincipal(metodoId: string) {
    if (!proveedorId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await setProveedorMetodoPagoPrincipal(
        supabase,
        proveedorId,
        metodoId,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.espejo) onEspejoSynced?.(result.espejo);
      await refreshRows();
    } finally {
      setBusy(false);
    }
  }

  const listEmpty = persisted
    ? !loading && rows.length === 0 && !adding
    : (draftMethods ?? []).length === 0 && !adding;

  return (
    <div className="space-y-3 rounded-xl border border-bloom-border bg-bloom-canvas/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-bloom-ink">Métodos de pago</p>
          <p className="mt-0.5 text-xs text-bloom-muted">
            Puedes registrar varias cuentas o formas de cobro. El principal se
            refleja en portal, WhatsApp y alertas.
          </p>
        </div>
        {!adding && !editingId ? (
          <button
            type="button"
            onClick={startAdd}
            disabled={disabled || busy}
            className="shrink-0 rounded-full border border-bloom-border bg-white px-3 py-1.5 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas disabled:opacity-60"
          >
            Agregar método
          </button>
        ) : null}
      </div>

      {loading ? <p className="text-xs text-bloom-muted">Cargando métodos…</p> : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      ) : null}
      {listEmpty ? (
        <p className="text-xs text-bloom-muted">Aún no hay métodos de pago registrados.</p>
      ) : null}

      {persisted
        ? rows.map((row) => (
            <MetodoListItem
              key={row.id}
              title={row.tipo}
              summary={summarizeMetodoPago(row)}
              esPrincipal={row.es_principal}
              disabled={disabled}
              busy={busy}
              onSetPrincipal={() => void setPrincipal(row.id)}
              onEdit={() => {
                setAdding(false);
                setEditingId(row.id);
                setForm(metodoPagoInputFromRow(row));
                setError(null);
              }}
              onDelete={() => void deletePersisted(row.id)}
            />
          ))
        : (draftMethods ?? []).map((row, index) => (
            <MetodoListItem
              key={`draft-${index}`}
              title={row.tipo}
              summary={summarizeMetodoPago(row)}
              esPrincipal={row.es_principal}
              disabled={disabled}
              busy={busy}
              onSetPrincipal={() =>
                onDraftMethodsChange?.(
                  (draftMethods ?? []).map((item, i) => ({
                    ...item,
                    es_principal: i === index,
                  })),
                )
              }
              onEdit={() => {
                setAdding(false);
                setEditingId(`draft-${index}`);
                setForm({ ...row });
                setError(null);
              }}
              onDelete={() => deleteDraft(index)}
            />
          ))}

      {adding || editingId ? (
        <div className="space-y-3 rounded-lg border border-bloom-accent/30 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-bloom-muted">
            {adding ? "Nuevo método de pago" : "Editar método de pago"}
          </p>
          <MetodoFields
            value={form}
            onChange={setForm}
            disabled={disabled || busy}
            inputClass={inputClass}
            showPrincipalToggle={
              persisted ? rows.length > 0 : (draftMethods ?? []).length > 0
            }
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={cancelForm}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-bloom-muted hover:bg-bloom-canvas"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => void (persisted ? savePersisted() : saveDraft())}
              className="rounded-full bg-bloom-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-bloom-accent-hover disabled:opacity-60"
            >
              {busy ? "Guardando…" : "Guardar método"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
