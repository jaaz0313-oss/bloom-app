export function buildClientePortalPath(bodaId: string): string {
  return `/cliente/${bodaId}`;
}

export function buildClientePortalUrl(origin: string, bodaId: string): string {
  return `${origin.replace(/\/$/, "")}${buildClientePortalPath(bodaId)}`;
}
