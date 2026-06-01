import { CelestiaLogo } from "@/app/components/cliente/CelestiaLogo";

type ClientePageHeaderProps = {
  nombrePareja: string;
  fechaFormateada: string;
  ciudad?: string | null;
};

export function ClientePageHeader({
  nombrePareja,
  fechaFormateada,
  ciudad,
}: ClientePageHeaderProps) {
  return (
    <header className="relative overflow-hidden border-b border-bloom-border/60 bg-gradient-to-b from-[#faf6f0] via-[#f5efe8] to-[#efe8df]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(125,107,90,0.08)_0%,_transparent_55%)]"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-2 px-5 py-6 text-center sm:px-8">
        <CelestiaLogo variant="header" />

        <div className="flex w-8 items-center gap-1" aria-hidden>
          <span className="h-px flex-1 bg-bloom-accent/20" />
          <span className="text-[10px] leading-none text-bloom-accent/30">✦</span>
          <span className="h-px flex-1 bg-bloom-accent/20" />
        </div>

        <h1 className="font-display text-5xl font-medium leading-tight tracking-wide text-bloom-ink sm:text-6xl">
          {nombrePareja}
        </h1>

        <p className="text-base text-bloom-muted sm:text-lg">
          {fechaFormateada}
          {ciudad ? (
            <>
              <span className="mx-2 text-bloom-border">·</span>
              {ciudad}
            </>
          ) : null}
        </p>
      </div>
    </header>
  );
}
