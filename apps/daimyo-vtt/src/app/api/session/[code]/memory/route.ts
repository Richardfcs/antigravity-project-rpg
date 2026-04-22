import { NextResponse } from "next/server";

import { listSessionMemoryEventsForViewer } from "@/lib/session/memory-repository";
import { requireSessionViewer } from "@/lib/session/access";

interface MemoryRouteContext {
  params: Promise<{ code: string }>;
}

export async function GET(_request: Request, context: MemoryRouteContext) {
  try {
    const { code } = await context.params;
    const { session, viewer } = await requireSessionViewer(code);

    const events = await listSessionMemoryEventsForViewer({
      sessionId: session.id,
      role: viewer.role,
      viewerParticipantId: viewer.participantId
    });

    return NextResponse.json({ ok: true, events });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Falha ao carregar a memoria da sessao."
      },
      { status: 401 }
    );
  }
}
