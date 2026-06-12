import { NextResponse } from "next/server";
import { buildClientePortalPath } from "@/lib/cliente-portal";
import { buildClientePwaManifest } from "@/lib/cliente-pwa-manifest";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const manifest = buildClientePwaManifest(buildClientePortalPath(id));

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
