export function extractPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Últimos 3 dígitos del teléfono de la novia, o null si no hay suficientes. */
export function getClientePinFromTelefonoNovia(
  telefonoNovia: string | null | undefined,
): string | null {
  const digits = extractPhoneDigits(telefonoNovia?.trim() ?? "");
  if (digits.length < 3) return null;
  return digits.slice(-3);
}

export function isClientePinRequired(
  telefonoNovia: string | null | undefined,
): boolean {
  return getClientePinFromTelefonoNovia(telefonoNovia) !== null;
}

export function verifyClientePin(
  input: string,
  telefonoNovia: string | null | undefined,
): boolean {
  const expected = getClientePinFromTelefonoNovia(telefonoNovia);
  if (!expected) return true;
  return extractPhoneDigits(input) === expected;
}
