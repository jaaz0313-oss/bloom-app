import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // Debug temporal
  return NextResponse.json({
    clientId: clientId ? `definido (${clientId.substring(0, 20)}...)` : "undefined",
    clientSecret: clientSecret ? "definido" : "undefined",
    allEnvKeys: Object.keys(process.env).filter((k) => k.includes("GOOGLE")),
  });
}
