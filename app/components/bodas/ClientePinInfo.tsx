import {
  getClientePinFromTelefonoNovia,
} from "@/lib/cliente-pin";

type ClientePinInfoProps = {
  telefonoNovia: string | null | undefined;
};

export function ClientePinInfo({ telefonoNovia }: ClientePinInfoProps) {
  const pin = getClientePinFromTelefonoNovia(telefonoNovia);

  return (
    <div className="rounded-lg border border-bloom-border/80 bg-bloom-canvas/50 px-4 py-3 text-sm text-bloom-ink">
      {pin ? (
        <p>
          <span className="font-medium">PIN del cliente:</span>{" "}
          <span className="font-mono text-base tracking-widest">{pin}</span>
          <span className="text-bloom-muted">
            {" "}
            (últimos 3 dígitos del celular de la novia)
          </span>
        </p>
      ) : (
        <p className="text-bloom-muted">
          Sin PIN — agrega el teléfono de la novia
        </p>
      )}
    </div>
  );
}
