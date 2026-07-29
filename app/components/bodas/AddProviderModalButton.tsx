"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { hasPermission, type UserRole } from "@/lib/auth/roles";
import { AUDITORIA_ACCIONES, logAuditoria } from "@/lib/auditoria";
import { PROVIDER_CATEGORIES } from "@/lib/provider-categories";
import {
  buildDirectorioInsertFromBodaProveedor,
  type BodaProveedorDirectorioSource,
} from "@/lib/directorio-proveedor-from-boda";
import { CONCEPTO_ANTICIPO, MEDIOS_PAGO } from "@/app/data/pagos";
import { marcarHitoCronogramaPorProveedorContratado } from "@/lib/cronograma";
import { syncBodaProveedoresContratados } from "@/lib/sync-boda";
import { syncTastingNotasReunionToProveedor } from "@/lib/tasting-notas-reunion";
import { ProviderComisionFields } from "./ProviderComisionFields";
import { AbrirCarpetaDriveButton } from "./AbrirCarpetaDriveButton";
import { formatInputCurrency, parseInputCurrency } from "@/lib/format";

type FormState = {
  nombre: string;
  sinCosto: boolean;
  valorTotal: string;
  anticipo: string;
  fechaAnticipo: string;
  comprobanteAnticipo: string;
  medioPagoAnticipo: string;
  depositoReembolsable: string;
  fechaSaldo: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  titular: string;
  documentoNit: string;
  telefono: string;
  email: string;
  direccion: string;
  descripcionServicio: string;
  notas: string;
  daComision: boolean;
  porcentajeComision: string;
};

const emptyForm: FormState = {
  nombre: "",
  sinCosto: false,
  valorTotal: "",
  anticipo: "",
  fechaAnticipo: getFechaHoyLocal(),
  comprobanteAnticipo: "",
  medioPagoAnticipo: "",
  depositoReembolsable: "",
  fechaSaldo: "",
  banco: "",
  tipoCuenta: "",
  numeroCuenta: "",
  titular: "",
  documentoNit: "",
  telefono: "",
  email: "",
  direccion: "",
  descripcionServicio: "",
  notas: "",
  daComision: false,
  porcentajeComision: "10",
};

type AddProviderModalButtonProps = {
  bodaId: string;
  bodaNombre: string;
  role: UserRole;
  currentUserId?: string;
  currentUserNombre?: string;
  driveFolderUrl?: string | null;
};

type DirectorioProveedorLookup = {
  id: string;
  nombre: string;
  categoria: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  banco: string | null;
  tipo_cuenta: string | null;
  numero_cuenta: string | null;
  titular: string | null;
  documento_nit: string | null;
  notas: string | null;
};

type EntryMode = "directorio" | "manual";

type EstadoInicial = "por_cotizar" | "cotizacion_recibida" | "contratado";

function getFechaHoyLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

type PendingDirectorioSave = {
  nombre: string;
  categoria: string;
  telefono: string | null;
  email: string | null;
} & BodaProveedorDirectorioSource;

async function existsInDirectorioByNombre(nombre: string): Promise<boolean> {
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("directorio_proveedores")
    .select("id, nombre")
    .ilike("nombre", nombre);

  if (error) {
    console.error(error);
    return false;
  }

  const normalized = nombre.trim().toLowerCase();
  return (data ?? []).some(
    (row) => row.nombre.trim().toLowerCase() === normalized,
  );
}

export function AddProviderModalButton({
  bodaId,
  bodaNombre,
  role,
  currentUserId,
  currentUserNombre,
  driveFolderUrl = null,
}: AddProviderModalButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([""]);
  const [estadoInicial, setEstadoInicial] = useState<EstadoInicial | null>(null);
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryResults, setDirectoryResults] = useState<DirectorioProveedorLookup[]>(
    [],
  );
  const [directorySearchedQuery, setDirectorySearchedQuery] = useState<string | null>(
    null,
  );
  const [directoryPickerDismissed, setDirectoryPickerDismissed] = useState(false);
  const [selectedDirectorioId, setSelectedDirectorioId] = useState<string | null>(
    null,
  );
  const [pendingDirectorioSave, setPendingDirectorioSave] =
    useState<PendingDirectorioSave | null>(null);
  const [savingToDirectorio, setSavingToDirectorio] = useState(false);
  const [directorioSaveError, setDirectorioSaveError] = useState<string | null>(
    null,
  );
  const [directorioSavedNotice, setDirectorioSavedNotice] = useState(false);

  function resetDirectorySearch() {
    setDirectoryQuery("");
    setDirectoryResults([]);
    setDirectorySearchedQuery(null);
    setDirectoryPickerDismissed(false);
  }

  function getFilledCategorias(categorias = selectedCategorias): string[] {
    return categorias.map((item) => item.trim()).filter(Boolean);
  }

  function resetFormKeepingCategories(categorias: string[]) {
    setForm({ ...emptyForm, fechaAnticipo: getFechaHoyLocal() });
    setSelectedCategorias(categorias.length > 0 ? categorias : [""]);
    resetDirectorySearch();
    setSelectedDirectorioId(null);
    setError(null);
  }

  function toggleSinCosto(checked: boolean) {
    setForm((current) => ({
      ...current,
      sinCosto: checked,
      ...(checked
        ? { valorTotal: "0", anticipo: "0", daComision: false }
        : {}),
    }));
  }

  function setCategoryAt(index: number, categoria: string) {
    if (index === 0 && !categoria.trim()) {
      setSelectedCategorias([""]);
      setEstadoInicial(null);
      setEntryMode(null);
      resetDirectorySearch();
      setSelectedDirectorioId(null);
      setError(null);
      return;
    }

    setSelectedCategorias((current) => {
      const next = [...current];
      next[index] = categoria;
      return next;
    });

    if (index === 0) {
      setEstadoInicial(null);
      setEntryMode(null);
      resetDirectorySearch();
      setSelectedDirectorioId(null);
    }
    setError(null);
  }

  function addCategorySlot() {
    setSelectedCategorias((current) => [...current, ""]);
  }

  function removeCategoryAt(index: number) {
    if (index === 0) return;
    setSelectedCategorias((current) => current.filter((_, i) => i !== index));
  }

  function selectEstadoInicial(estado: EstadoInicial) {
    setEstadoInicial(estado);
    setEntryMode(null);
    resetFormKeepingCategories(selectedCategorias);
  }

  function selectEntryMode(mode: EntryMode) {
    setEntryMode(mode);
    resetFormKeepingCategories(selectedCategorias);
  }

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open || !supabase || entryMode !== "directorio") return;
    const categorias = getFilledCategorias();
    const query = directoryQuery.trim();
    if (categorias.length === 0 || query.length < 2 || directoryPickerDismissed) {
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      const { data, error: lookupError } = await supabase
        .from("directorio_proveedores")
        .select(
          "id,nombre,categoria,telefono,email,direccion,banco,tipo_cuenta,numero_cuenta,titular,documento_nit,notas",
        )
        .eq("activo", true)
        .in("categoria", categorias)
        .ilike("nombre", `%${query}%`)
        .order("nombre", { ascending: true })
        .limit(8);

      if (!cancelled) {
        if (lookupError) {
          setDirectoryResults([]);
        } else {
          setDirectoryResults((data ?? []) as DirectorioProveedorLookup[]);
        }
        setDirectorySearchedQuery(query);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [directoryPickerDismissed, directoryQuery, entryMode, open, selectedCategorias]);

  useEffect(() => {
    if (!directorioSavedNotice) return;
    const timeout = window.setTimeout(() => setDirectorioSavedNotice(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [directorioSavedNotice]);

  function resetAddProviderForm() {
    setForm({ ...emptyForm, fechaAnticipo: getFechaHoyLocal() });
    setSelectedCategorias([""]);
    setEstadoInicial(null);
    setEntryMode(null);
    setSelectedDirectorioId(null);
    resetDirectorySearch();
    setError(null);
  }

  function finishProviderSave() {
    setOpen(false);
    resetAddProviderForm();
    router.refresh();
  }

  async function promptSaveToDirectorioIfNeeded(provider: PendingDirectorioSave) {
    if (selectedDirectorioId) {
      finishProviderSave();
      return;
    }

    const exists = await existsInDirectorioByNombre(provider.nombre);
    if (exists) {
      finishProviderSave();
      return;
    }

    setOpen(false);
    setDirectorioSaveError(null);
    setPendingDirectorioSave(provider);
  }

  async function handleSaveToDirectorio() {
    if (!pendingDirectorioSave || !supabase) return;

    setSavingToDirectorio(true);
    setDirectorioSaveError(null);
    try {
      const {
        nombre,
        categoria,
        telefono,
        email,
        ...directorioBankingSource
      } = pendingDirectorioSave;

      const payload = buildDirectorioInsertFromBodaProveedor(
        { nombre, categoria, telefono, email },
        directorioBankingSource,
      );

      const { error: insertError } = await supabase
        .from("directorio_proveedores")
        .insert(payload);

      if (insertError) {
        setDirectorioSaveError(insertError.message);
        return;
      }

      setPendingDirectorioSave(null);
      setDirectorioSavedNotice(true);
      resetAddProviderForm();
      router.refresh();
    } finally {
      setSavingToDirectorio(false);
    }
  }

  function handleSkipDirectorioSave() {
    setPendingDirectorioSave(null);
    setDirectorioSaveError(null);
    resetAddProviderForm();
    router.refresh();
  }

  function applyDirectoryProvider(provider: DirectorioProveedorLookup) {
    setSelectedDirectorioId(provider.id);
    setSelectedCategorias((current) => {
      if (!provider.categoria) return current;
      const filled = getFilledCategorias(current);
      if (filled.includes(provider.categoria)) return current;
      if (!filled.length) return [provider.categoria];
      return [...filled, provider.categoria];
    });
    setForm((current) => ({
      ...current,
      nombre: provider.nombre ?? current.nombre,
      banco: provider.banco ?? "",
      tipoCuenta: provider.tipo_cuenta ?? "",
      numeroCuenta: provider.numero_cuenta ?? "",
      titular: provider.titular ?? "",
      documentoNit: provider.documento_nit ?? "",
      telefono: provider.telefono ?? "",
      email: provider.email ?? "",
      direccion: provider.direccion ?? "",
      notas: provider.notas ?? current.notas,
    }));
    setDirectoryQuery(provider.nombre);
    setDirectoryResults([]);
    setDirectorySearchedQuery(provider.nombre);
    setDirectoryPickerDismissed(true);
  }

  const trimmedDirectoryQuery = directoryQuery.trim();
  const showDirectoryPicker =
    trimmedDirectoryQuery.length >= 2 && !directoryPickerDismissed;
  const directorySearchPending =
    showDirectoryPicker && directorySearchedQuery !== trimmedDirectoryQuery;
  const showDirectoryEmptyState =
    showDirectoryPicker &&
    !directorySearchPending &&
    directoryResults.length === 0;

  async function onSubmit(e: React.FormEvent) {
    if (!hasPermission(role, "providers.manage")) {
      setError("No tienes permisos para agregar proveedores.");
      return;
    }
    e.preventDefault();
    setError(null);

    if (!supabase) {
      setError(
        "Supabase no está configurado. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    const nombre = form.nombre.trim();
    const categorias = getFilledCategorias();
    const valorTotal = parseInputCurrency(form.valorTotal);
    const anticipo = parseInputCurrency(form.anticipo);
    const depositoReembolsable = parseInputCurrency(form.depositoReembolsable);
    const medioPagoAnticipo = form.medioPagoAnticipo.trim() || null;
    const banco = form.banco.trim();
    const numeroCuenta = form.numeroCuenta.trim();
    const titular = form.titular.trim();
    const tipoCuenta = form.tipoCuenta.trim();
    const documentoNit = form.documentoNit.trim();
    const telefono = form.telefono.trim();
    const email = form.email.trim();
    const direccion = form.direccion.trim();
    const descripcionServicio = form.descripcionServicio.trim();
    const notas = form.notas.trim();

    const esContratado = estadoInicial === "contratado";
    const esCotizacionRecibida = estadoInicial === "cotizacion_recibida";
    const esSinCosto = form.sinCosto;

    if (!nombre) return setError("Ingresa el nombre del proveedor.");
    if (categorias.length === 0) {
      return setError("Selecciona al menos una categoría.");
    }
    if (new Set(categorias).size !== categorias.length) {
      return setError("No repitas la misma categoría.");
    }
    if (!esSinCosto && esContratado) {
      if (!Number.isFinite(valorTotal) || valorTotal < 0) {
        return setError("Ingresa un valor total válido (>= 0).");
      }
      if (valorTotal <= 0) {
        return setError("Ingresa el valor contratado.");
      }
      if (!Number.isFinite(anticipo) || anticipo < 0) {
        return setError("Ingresa un anticipo válido (>= 0).");
      }
      if (anticipo > valorTotal) {
        return setError("El anticipo no puede ser mayor que el valor total.");
      }
    }

    if (!esSinCosto && esCotizacionRecibida) {
      if (!Number.isFinite(valorTotal) || valorTotal <= 0) {
        return setError("Ingresa el valor cotizado.");
      }
    }

    if (
      esContratado &&
      (!Number.isFinite(depositoReembolsable) || depositoReembolsable < 0)
    ) {
      return setError("Ingresa un depósito reembolsable válido (>= 0).");
    }

    const daComision = esSinCosto ? false : form.daComision;
    let porcentajeComision = 10;
    if (daComision) {
      const pct = Number(form.porcentajeComision);
      if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
        return setError("Ingresa un porcentaje de comisión válido (0–100).");
      }
      porcentajeComision = pct;
    }

    setSubmitting(true);
    try {
      // Varias categorías → mismo valor compartido; pagos solo en el primer registro.
      const grupoId =
        categorias.length > 1 ? crypto.randomUUID() : null;

      for (const [index, categoria] of categorias.entries()) {
        const esPrimarioGrupo = index === 0;
        const { data: nuevoProveedor, error: insertError } = await supabase
          .from("proveedores")
          .insert({
            boda_id: bodaId,
            nombre,
            categoria,
            valor_total:
              esSinCosto || (!esContratado && !esCotizacionRecibida)
                ? 0
                : Math.round(valorTotal),
            // En el flujo "Ya contratado" el anticipo se registra como un pago real,
            // por lo que la columna anticipo se deja en 0 para no contarlo doble.
            // Con varias categorías, anticipo/depósito solo en el primario del grupo.
            anticipo: 0,
            monto_cotizado:
              esCotizacionRecibida && !esSinCosto
                ? Math.round(valorTotal)
                : null,
            fecha_saldo:
              esSinCosto || !esContratado ? null : form.fechaSaldo || null,
            banco: esContratado ? banco || null : null,
            tipo_cuenta: esContratado ? tipoCuenta || null : null,
            numero_cuenta: esContratado ? numeroCuenta || null : null,
            titular_cuenta: esContratado ? titular || null : null,
            documento_nit: esContratado ? documentoNit || null : null,
            telefono: telefono || null,
            email: email || null,
            direccion: direccion || null,
            descripcion_servicio: descripcionServicio || null,
            notas: notas || null,
            da_comision: daComision,
            porcentaje_comision: daComision ? porcentajeComision : 10,
            estado: esSinCosto || esContratado
              ? "contratado"
              : esCotizacionRecibida
                ? "en_negociacion"
                : "pendiente",
            sin_costo: esSinCosto,
            deposito_reembolsable:
              esContratado && esPrimarioGrupo
                ? Math.round(depositoReembolsable > 0 ? depositoReembolsable : 0)
                : 0,
            grupo_id: grupoId,
          })
          .select("id")
          .single();

        if (insertError) {
          setError(insertError.message);
          return;
        }

        await logAuditoria({
          accion: AUDITORIA_ACCIONES.PROVEEDOR_AGREGADO,
          entidad: "proveedor",
          entidadId: nuevoProveedor.id,
          bodaNombre,
          detalle: `${nombre} · ${categoria}${
            esSinCosto
              ? " · Sin costo"
              : esContratado
                ? " · Contratado"
                : esCotizacionRecibida
                  ? " · Cotización recibida"
                  : ""
          }`,
        });

        if (esContratado && anticipo > 0 && esPrimarioGrupo && !esSinCosto) {
          const fechaAnticipo =
            form.fechaAnticipo.trim() || getFechaHoyLocal();
          const { error: pagoError } = await supabase.from("pagos").insert({
            proveedor_id: nuevoProveedor.id,
            monto: anticipo,
            fecha_pago: fechaAnticipo,
            concepto: CONCEPTO_ANTICIPO,
            comprobante_url: form.comprobanteAnticipo.trim() || null,
            medio_pago: medioPagoAnticipo,
          });

          if (pagoError) {
            setError(
              `Proveedor creado, pero no se pudo registrar el anticipo: ${pagoError.message}`,
            );
          } else {
            await logAuditoria({
              accion: AUDITORIA_ACCIONES.PAGO_REGISTRADO,
              entidad: "pago",
              entidadId: nuevoProveedor.id,
              bodaNombre,
              detalle: `${nombre}: anticipo`,
            });
          }
        }

        if (esSinCosto || esContratado) {
          await marcarHitoCronogramaPorProveedorContratado(
            supabase,
            bodaId,
            categoria,
          );
          await syncTastingNotasReunionToProveedor(supabase, {
            bodaId,
            proveedorId: nuevoProveedor.id,
            proveedorNombre: nombre,
            currentUserId,
            currentUserNombre,
          });
        }
      }

      if (esSinCosto || esContratado) {
        await syncBodaProveedoresContratados(bodaId);
      }

      await promptSaveToDirectorioIfNeeded({
        nombre,
        categoria: categorias[0],
        telefono: telefono || null,
        email: email || null,
        banco: banco || null,
        tipo_cuenta: tipoCuenta || null,
        numero_cuenta: numeroCuenta || null,
        titular_cuenta: titular || null,
        documento_nit: documentoNit || null,
        anticipo: anticipo > 0 ? anticipo : null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const primaryCategoria = selectedCategorias[0]?.trim() ?? "";
  const filledCategorias = getFilledCategorias();

  return (
    <>
      {directorioSavedNotice && (
        <p
          className="mb-3 rounded-xl border border-bloom-success/30 bg-bloom-success/10 px-4 py-2 text-sm font-medium text-bloom-success"
          role="status"
        >
          ✓ Proveedor guardado en el directorio
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-bloom-accent px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bloom-accent"
      >
        <PlusIcon />
        Agregar proveedor
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Agregar proveedor"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl text-bloom-ink">
                  Nuevo proveedor
                </h2>
                <p className="mt-1 text-sm text-bloom-muted">
                  Registra los datos del proveedor y su proyección de pago.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-bloom-muted transition-colors hover:bg-bloom-border hover:text-bloom-ink"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                <XIcon />
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={onSubmit}>
              <Field label="Categoría">
                <div className="space-y-2">
                  {selectedCategorias.map((categoria, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        className={`${inputClass} min-w-0 flex-1`}
                        value={categoria}
                        onChange={(e) => setCategoryAt(index, e.target.value)}
                        required={index === 0}
                      >
                        <option value="">Seleccionar</option>
                        {PROVIDER_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => removeCategoryAt(index)}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-bloom-border text-bloom-muted transition-colors hover:bg-bloom-border hover:text-bloom-ink"
                          aria-label="Quitar categoría"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {primaryCategoria && (
                    <button
                      type="button"
                      onClick={addCategorySlot}
                      className="text-sm font-medium text-bloom-accent transition-colors hover:text-bloom-accent-hover"
                    >
                      + Agregar otra categoría
                    </button>
                  )}
                </div>
                {filledCategorias.length > 1 && (
                  <p className="mt-2 text-xs text-bloom-muted">
                    Se creará un proveedor por cada categoría seleccionada con los
                    mismos datos.
                  </p>
                )}
              </Field>

              {primaryCategoria && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-bloom-ink">
                    ¿En qué estado está este proveedor?
                  </p>
                  <div
                    className="flex w-full flex-col gap-1 rounded-2xl border border-bloom-border bg-bloom-canvas p-1 sm:flex-row sm:rounded-full"
                    role="group"
                    aria-label="Estado del proveedor"
                  >
                    <button
                      type="button"
                      onClick={() => selectEstadoInicial("por_cotizar")}
                      className={`flex-1 rounded-full px-3 py-2.5 text-sm font-medium transition-colors ${
                        estadoInicial === "por_cotizar"
                          ? "bg-bloom-accent text-white shadow-sm"
                          : "text-bloom-ink hover:bg-bloom-border"
                      }`}
                    >
                      Por cotizar
                    </button>
                    <button
                      type="button"
                      onClick={() => selectEstadoInicial("cotizacion_recibida")}
                      className={`flex-1 rounded-full px-3 py-2.5 text-sm font-medium transition-colors ${
                        estadoInicial === "cotizacion_recibida"
                          ? "bg-bloom-accent text-white shadow-sm"
                          : "text-bloom-ink hover:bg-bloom-border"
                      }`}
                    >
                      Cotización recibida
                    </button>
                    <button
                      type="button"
                      onClick={() => selectEstadoInicial("contratado")}
                      className={`flex-1 rounded-full px-3 py-2.5 text-sm font-medium transition-colors ${
                        estadoInicial === "contratado"
                          ? "bg-bloom-accent text-white shadow-sm"
                          : "text-bloom-ink hover:bg-bloom-border"
                      }`}
                    >
                      Ya contratado
                    </button>
                  </div>
                </div>
              )}

              {primaryCategoria && estadoInicial && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-bloom-ink">
                    ¿Cómo quieres agregar el proveedor?
                  </p>
                  <div
                    className="inline-flex w-full rounded-full border border-bloom-border bg-bloom-canvas p-1"
                    role="group"
                    aria-label="Modo de agregar proveedor"
                  >
                    <button
                      type="button"
                      onClick={() => selectEntryMode("directorio")}
                      className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                        entryMode === "directorio"
                          ? "bg-bloom-accent text-white shadow-sm"
                          : "text-bloom-ink hover:bg-bloom-border"
                      }`}
                    >
                      Buscar en directorio
                    </button>
                    <button
                      type="button"
                      onClick={() => selectEntryMode("manual")}
                      className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                        entryMode === "manual"
                          ? "bg-bloom-accent text-white shadow-sm"
                          : "text-bloom-ink hover:bg-bloom-border"
                      }`}
                    >
                      Agregar manualmente
                    </button>
                  </div>
                </div>
              )}

              {entryMode === "directorio" && (
                <Field label="Buscar en directorio">
                  <div className="space-y-2">
                    <p className="text-xs text-bloom-muted">
                      Proveedores en{" "}
                      <span className="font-medium text-bloom-ink">
                        {filledCategorias.join(", ")}
                      </span>
                    </p>
                    <input
                      className={inputClass}
                      value={directoryQuery}
                      onChange={(e) => {
                        setDirectoryQuery(e.target.value);
                        setDirectoryPickerDismissed(false);
                        setDirectorySearchedQuery(null);
                      }}
                      placeholder="Escribe para buscar por nombre"
                    />
                    {showDirectoryPicker && (
                      <div className="rounded-xl border border-bloom-border bg-bloom-surface">
                        {directorySearchPending ? (
                          <p className="px-3 py-2 text-sm text-bloom-muted">
                            Buscando…
                          </p>
                        ) : showDirectoryEmptyState ? (
                          <p className="px-3 py-2 text-sm text-bloom-muted">
                            No hay proveedores del directorio para esta búsqueda.
                          </p>
                        ) : directoryResults.length > 0 ? (
                          <ul className="max-h-52 overflow-y-auto py-1">
                            {directoryResults.map((provider) => (
                              <li key={provider.id}>
                                <button
                                  type="button"
                                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-bloom-ink transition-colors hover:bg-bloom-canvas"
                                  onClick={() => applyDirectoryProvider(provider)}
                                >
                                  <span>{provider.nombre}</span>
                                  <span className="text-xs text-bloom-muted">
                                    {provider.categoria}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    )}
                  </div>
                </Field>
              )}

              {entryMode && estadoInicial === "contratado" && (
                <>
                  <Field label="Nombre">
                    <input
                      className={inputClass}
                      value={form.nombre}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, nombre: e.target.value }))
                      }
                      placeholder="Ej: Fotografía Luna"
                      required
                    />
                  </Field>

                  <SinCostoCheckbox
                    checked={form.sinCosto}
                    onChange={toggleSinCosto}
                    disabled={submitting}
                  />

                  {!form.sinCosto ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Valor contratado">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        className={inputClass}
                        value={form.valorTotal}
                        onChange={(e) =>
                          setForm((s) => ({
                            ...s,
                            valorTotal: formatInputCurrency(e.target.value),
                          }))
                        }
                        placeholder="Ej: 3.500.000"
                        required
                      />
                    </Field>

                    <Field label="Anticipo pagado">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        className={inputClass}
                        value={form.anticipo}
                        onChange={(e) =>
                          setForm((s) => ({
                            ...s,
                            anticipo: formatInputCurrency(e.target.value),
                          }))
                        }
                        placeholder="Ej: 1.000.000"
                      />
                    </Field>
                  </div>
                  ) : null}

                  {!form.sinCosto ? (
                  <>
                  <Field label="Fecha del anticipo">
                    <input
                      type="date"
                      className={inputClass}
                      value={form.fechaAnticipo}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          fechaAnticipo: e.target.value,
                        }))
                      }
                    />
                  </Field>

                  <Field label="Comprobante del anticipo">
                    <div className="flex items-start gap-2">
                      <input
                        className={inputClass}
                        value={form.comprobanteAnticipo}
                        onChange={(e) =>
                          setForm((s) => ({
                            ...s,
                            comprobanteAnticipo: e.target.value,
                          }))
                        }
                        placeholder="Pega el enlace del comprobante"
                      />
                      <AbrirCarpetaDriveButton
                        driveFolderUrl={driveFolderUrl}
                      />
                    </div>
                  </Field>

                  <Field label="Medio de pago del anticipo">
                    <select
                      className={inputClass}
                      value={form.medioPagoAnticipo}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          medioPagoAnticipo: e.target.value,
                        }))
                      }
                      disabled={submitting}
                    >
                      <option value="">Sin especificar</option>
                      {MEDIOS_PAGO.map((medio) => (
                        <option key={medio} value={medio}>
                          {medio}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <p className="text-xs text-bloom-muted">
                    Si registras un anticipo, se agregará como primer pago del
                    historial con concepto &quot;Anticipo&quot;.
                  </p>
                  </>
                  ) : null}

                  {!form.sinCosto ? (
                  <Field label="Fecha de saldo">
                    <input
                      type="date"
                      className={inputClass}
                      value={form.fechaSaldo}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, fechaSaldo: e.target.value }))
                      }
                    />
                  </Field>
                  ) : null}

                  <Field label="Depósito reembolsable">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      className={inputClass}
                      value={form.depositoReembolsable}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          depositoReembolsable: formatInputCurrency(
                            e.target.value,
                          ),
                        }))
                      }
                      placeholder="Opcional"
                      disabled={submitting}
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Banco">
                      <input
                        className={inputClass}
                        value={form.banco}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, banco: e.target.value }))
                        }
                        placeholder="Ej: Bancolombia"
                      />
                    </Field>

                    <Field label="Tipo de cuenta">
                      <select
                        className={inputClass}
                        value={form.tipoCuenta}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, tipoCuenta: e.target.value }))
                        }
                      >
                        <option value="">Seleccionar</option>
                        <option value="Ahorros">Ahorros</option>
                        <option value="Corriente">Corriente</option>
                      </select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Número de cuenta">
                      <input
                        className={inputClass}
                        value={form.numeroCuenta}
                        onChange={(e) =>
                          setForm((s) => ({
                            ...s,
                            numeroCuenta: e.target.value,
                          }))
                        }
                        placeholder="Ej: 12345678901"
                      />
                    </Field>

                    <Field label="Titular">
                      <input
                        className={inputClass}
                        value={form.titular}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, titular: e.target.value }))
                        }
                        placeholder="Ej: Juan Pérez"
                      />
                    </Field>
                  </div>

                  <Field label="Documento / NIT">
                    <input
                      className={inputClass}
                      value={form.documentoNit}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          documentoNit: e.target.value,
                        }))
                      }
                      placeholder="Ej: 900123456-7"
                    />
                  </Field>

                  <Field label="Descripción del servicio / plan elegido">
                    <textarea
                      className={textareaClass}
                      value={form.descripcionServicio}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          descripcionServicio: e.target.value,
                        }))
                      }
                      placeholder="Ej: Paquete premium 8 horas, álbum digital y 2 fotógrafos"
                      rows={3}
                    />
                  </Field>

                  <ProviderComisionFields
                    daComision={form.daComision}
                    porcentajeComision={form.porcentajeComision}
                    onDaComisionChange={(daComision) =>
                      setForm((s) => ({ ...s, daComision }))
                    }
                    onPorcentajeChange={(porcentajeComision) =>
                      setForm((s) => ({ ...s, porcentajeComision }))
                    }
                    disabled={submitting || form.sinCosto}
                    inputClass={inputClass}
                  />
                </>
              )}

              {entryMode &&
                (estadoInicial === "por_cotizar" ||
                  estadoInicial === "cotizacion_recibida") && (
                <>
              <Field label="Nombre">
                <input
                  className={inputClass}
                  value={form.nombre}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, nombre: e.target.value }))
                  }
                  placeholder="Ej: Fotografía Luna"
                  required
                />
              </Field>

              <SinCostoCheckbox
                checked={form.sinCosto}
                onChange={toggleSinCosto}
                disabled={submitting}
              />

              {estadoInicial === "cotizacion_recibida" && !form.sinCosto ? (
                <Field label="Valor cotizado">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    className={inputClass}
                    value={form.valorTotal}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        valorTotal: formatInputCurrency(e.target.value),
                      }))
                    }
                    placeholder="Ej: 3.500.000"
                    required
                  />
                </Field>
              ) : null}

              <Field label="Descripción del servicio">
                <textarea
                  className={textareaClass}
                  value={form.descripcionServicio}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      descripcionServicio: e.target.value,
                    }))
                  }
                  placeholder="Ej: Paquete premium 8 horas, álbum digital y 2 fotógrafos"
                  rows={3}
                />
              </Field>

              <ProviderComisionFields
                daComision={form.daComision}
                porcentajeComision={form.porcentajeComision}
                onDaComisionChange={(daComision) =>
                  setForm((s) => ({ ...s, daComision }))
                }
                onPorcentajeChange={(porcentajeComision) =>
                  setForm((s) => ({ ...s, porcentajeComision }))
                }
                disabled={submitting || form.sinCosto}
                inputClass={inputClass}
              />

              <Field label="Notas">
                <textarea
                  className={textareaClass}
                  value={form.notas}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, notas: e.target.value }))
                  }
                  placeholder="Ej: Cotización ajustada por hora extra de cobertura"
                  rows={3}
                />
              </Field>

              <div className="space-y-3 rounded-xl border border-bloom-border bg-bloom-canvas/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
                  Contacto del proveedor
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Teléfono">
                    <input
                      className={inputClass}
                      value={form.telefono}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, telefono: e.target.value }))
                      }
                      placeholder="Ej: 3001234567"
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      className={inputClass}
                      value={form.email}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, email: e.target.value }))
                      }
                      placeholder="correo@proveedor.com"
                    />
                  </Field>
                </div>
                <Field label="Dirección / Residencia">
                  <input
                    className={inputClass}
                    value={form.direccion}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, direccion: e.target.value }))
                    }
                    placeholder="Ej: Calle 10 #20-30, Medellín"
                  />
                </Field>
              </div>
                </>
              )}

              {error && (
                <p className="text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}

              {entryMode && (
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
                    onClick={() => setOpen(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
                  >
                    {submitting
                      ? "Guardando..."
                      : form.sinCosto
                        ? "Guardar sin costo"
                        : estadoInicial === "contratado"
                          ? "Guardar como contratado"
                          : estadoInicial === "cotizacion_recibida"
                            ? "Guardar cotización"
                            : "Guardar"}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {pendingDirectorioSave && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Guardar en directorio"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingToDirectorio) {
              handleSkipDirectorioSave();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
            <h2 className="font-display text-xl text-bloom-ink">
              Guardar en directorio
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-bloom-muted">
              ¿Deseas guardar{" "}
              <span className="font-medium text-bloom-ink">
                {pendingDirectorioSave.nombre}
              </span>{" "}
              en el directorio global de Celestia?
            </p>
            {directorioSaveError && (
              <p className="mt-3 text-sm text-red-700" role="alert">
                {directorioSaveError}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleSkipDirectorioSave}
                disabled={savingToDirectorio}
                className="rounded-full border border-bloom-border px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas disabled:opacity-60"
              >
                No, solo para esta boda
              </button>
              <button
                type="button"
                onClick={handleSaveToDirectorio}
                disabled={savingToDirectorio}
                className="rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
              >
                {savingToDirectorio ? "Guardando…" : "Sí, guardar en directorio"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

const textareaClass =
  "w-full resize-y rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

function SinCostoCheckbox({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-bloom-border/80 bg-bloom-canvas/60 px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 rounded border-bloom-border text-bloom-accent focus:ring-bloom-accent/30"
      />
      <span className="text-sm text-bloom-ink">
        Sin costo (lo hace el cliente, familiar o es un regalo)
      </span>
    </label>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-bloom-ink">{label}</label>
      {children}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}
