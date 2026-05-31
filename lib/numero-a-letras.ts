const UNIDADES = [
  "",
  "UN",
  "DOS",
  "TRES",
  "CUATRO",
  "CINCO",
  "SEIS",
  "SIETE",
  "OCHO",
  "NUEVE",
  "DIEZ",
  "ONCE",
  "DOCE",
  "TRECE",
  "CATORCE",
  "QUINCE",
  "DIECISÉIS",
  "DIECISIETE",
  "DIECIOCHO",
  "DIECINUEVE",
  "VEINTE",
  "VEINTIUN",
  "VEINTIDÓS",
  "VEINTITRÉS",
  "VEINTICUATRO",
  "VEINTICINCO",
  "VEINTISÉIS",
  "VEINTISIETE",
  "VEINTIOCHO",
  "VEINTINUEVE",
];

const DECENAS = [
  "",
  "",
  "VEINTE",
  "TREINTA",
  "CUARENTA",
  "CINCUENTA",
  "SESENTA",
  "SETENTA",
  "OCHENTA",
  "NOVENTA",
];

const CENTENAS = [
  "",
  "CIENTO",
  "DOSCIENTOS",
  "TRESCIENTOS",
  "CUATROCIENTOS",
  "QUINIENTOS",
  "SEISCIENTOS",
  "SETECIENTOS",
  "OCHOCIENTOS",
  "NOVECIENTOS",
];

function letrasCentenas(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100);
  const rest = n % 100;
  const centena = CENTENAS[c] ?? "";
  if (!rest) return centena;
  return `${centena} ${letrasDecenas(rest)}`.trim();
}

function letrasDecenas(n: number): string {
  if (n === 0) return "";
  if (n < 30) return UNIDADES[n] ?? "";
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    if (d === 2 && u > 0) return UNIDADES[20 + u] ?? "";
    return u === 0 ? (DECENAS[d] ?? "") : `${DECENAS[d] ?? ""} Y ${UNIDADES[u] ?? ""}`;
  }
  return letrasCentenas(n);
}

function letrasMiles(n: number): string {
  if (n === 0) return "";
  if (n === 1) return "MIL";
  if (n < 1000) return letrasCentenas(n);
  const miles = Math.floor(n / 1000);
  const rest = n % 1000;
  const milesTxt = miles === 1 ? "MIL" : `${letrasCentenas(miles)} MIL`;
  if (!rest) return milesTxt;
  return `${milesTxt} ${letrasCentenas(rest)}`.trim();
}

function letrasMillones(n: number): string {
  if (n === 0) return "CERO";
  if (n === 1) return "UN MILLÓN";
  if (n < 1_000_000) return letrasMiles(n);
  const millones = Math.floor(n / 1_000_000);
  const rest = n % 1_000_000;
  const millonesTxt =
    millones === 1 ? "UN MILLÓN" : `${letrasMiles(millones)} MILLONES`;
  if (!rest) return millonesTxt;
  return `${millonesTxt} ${letrasMiles(rest)}`.trim();
}

/** Convierte un monto entero en pesos colombianos a letras (M/CTE). */
export function numeroALetrasPesos(amount: number): string {
  const n = Math.round(Math.max(0, amount));
  if (n === 0) return "CERO PESOS M/CTE";
  const letras = letrasMillones(n);
  return n === 1 ? "UN PESO M/CTE" : `${letras} PESOS M/CTE`;
}

/** Versión en inglés simplificada para montos en contrato. */
export function numeroALetrasPesosEn(amount: number): string {
  const n = Math.round(Math.max(0, amount));
  if (n === 0) return "ZERO COLOMBIAN PESOS (COP)";
  return `${n.toLocaleString("en-US")} COLOMBIAN PESOS (COP)`;
}
