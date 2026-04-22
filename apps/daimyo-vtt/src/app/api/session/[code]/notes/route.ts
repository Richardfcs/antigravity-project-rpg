import { NextResponse } from "next/server";

import { listSessionNotesForViewer } from "@/lib/notes/repository";
import { requireSessionViewer } from "@/lib/session/access";

interface NotesRouteContext {
  params: Promise<{ code: string }>;
}

export async function GET(_request: Request, context: NotesRouteContext) {
  try {
    const { code } = await context.params;
    const { session, viewer } = await requireSessionViewer(code);

    const notes = await listSessionNotesForViewer({
      sessionId: session.id,
      authorParticipantId: viewer.participantId,
      role: viewer.role
    });

    return NextResponse.json({ ok: true, notes });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Falha ao carregar as notas."
      },
      { status: 401 }
    );
  }
}
