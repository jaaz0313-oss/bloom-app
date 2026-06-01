import { CelestiaLogo } from "@/app/components/cliente/CelestiaLogo";

const CELESTIA_EMAIL = "celestiaandevents@gmail.com";
const CELESTIA_PHONE = "+57 319 553 8654";
const CELESTIA_PHONE_HREF = "tel:+573195538654";

export function ClientePageFooter() {
  return (
    <footer className="mt-auto border-t border-bloom-border/60 bg-gradient-to-b from-[#efe8df] to-[#e8e0d6]">
      <div className="mx-auto max-w-3xl px-5 py-12 text-center sm:px-8 sm:py-14">
        <div className="flex justify-center">
          <CelestiaLogo variant="footer" />
        </div>

        <p className="mt-4 font-display text-lg tracking-wide text-bloom-ink sm:text-xl">
          Celestia Wedding Planner &amp; Events
        </p>

        <div className="mt-5 space-y-1.5 text-sm text-bloom-muted sm:text-base">
          <p>
            <a
              href={`mailto:${CELESTIA_EMAIL}`}
              className="transition-colors hover:text-bloom-accent"
            >
              {CELESTIA_EMAIL}
            </a>
          </p>
          <p>
            <a
              href={CELESTIA_PHONE_HREF}
              className="transition-colors hover:text-bloom-accent"
            >
              {CELESTIA_PHONE}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
