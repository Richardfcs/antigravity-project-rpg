import { NextResponse } from "next/server";

import { getInfraReadiness } from "@/lib/env";

export async function GET() {
  const infra = getInfraReadiness();

  return NextResponse.json({
    ok: true,
    phase: "phase-01-foundation",
    timestamp: new Date().toISOString(),
    infrastructure: infra
  });
}
