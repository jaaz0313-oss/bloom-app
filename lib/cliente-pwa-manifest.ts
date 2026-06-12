export const CLIENTE_PWA_NAME = "Mi Boda - Celestia Events";
export const CLIENTE_PWA_SHORT_NAME = "Mi Boda";
export const CLIENTE_PWA_BACKGROUND_COLOR = "#faf9f7";
export const CLIENTE_PWA_THEME_COLOR = "#7B3F3F";

export type ClientePwaManifest = {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: "standalone";
  background_color: string;
  theme_color: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
};

export function buildClientePwaManifest(startUrl: string): ClientePwaManifest {
  return {
    name: CLIENTE_PWA_NAME,
    short_name: CLIENTE_PWA_SHORT_NAME,
    description:
      "Portal de tu boda con Celestia: cronograma, pagos y proveedores.",
    start_url: startUrl,
    scope: startUrl,
    display: "standalone",
    background_color: CLIENTE_PWA_BACKGROUND_COLOR,
    theme_color: CLIENTE_PWA_THEME_COLOR,
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
