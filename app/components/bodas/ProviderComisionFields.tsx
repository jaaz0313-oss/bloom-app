type ProviderComisionFieldsProps = {
  daComision: boolean;
  porcentajeComision: string;
  onDaComisionChange: (value: boolean) => void;
  onPorcentajeChange: (value: string) => void;
  disabled?: boolean;
  inputClass: string;
};

export function ProviderComisionFields({
  daComision,
  porcentajeComision,
  onDaComisionChange,
  onPorcentajeChange,
  disabled = false,
  inputClass,
}: ProviderComisionFieldsProps) {
  return (
    <div className="space-y-3 rounded-xl border border-bloom-border bg-bloom-canvas/60 p-3">
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-bloom-ink">
        <input
          type="checkbox"
          checked={daComision}
          onChange={(e) => {
            const checked = e.target.checked;
            onDaComisionChange(checked);
            if (checked && !porcentajeComision.trim()) {
              onPorcentajeChange("10");
            }
          }}
          disabled={disabled}
          className="h-4 w-4 rounded border-bloom-border text-bloom-accent focus:ring-bloom-accent/30"
        />
        Da comisión
      </label>

      {daComision && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-bloom-ink">
            % de comisión
          </label>
          <input
            type="number"
            min={0.01}
            max={100}
            step={0.01}
            className={inputClass}
            value={porcentajeComision}
            onChange={(e) => onPorcentajeChange(e.target.value)}
            disabled={disabled}
            placeholder="10"
          />
        </div>
      )}
    </div>
  );
}
