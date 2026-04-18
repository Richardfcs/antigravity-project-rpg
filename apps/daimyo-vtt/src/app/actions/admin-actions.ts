"use server";

import { getInfraReadiness } from "@/lib/env";
import {
  resetSessionContent,
  resetSessionDataset,
  type ResettableSessionDataset
} from "@/lib/session/admin";
import { requireSessionViewer } from "@/lib/session/access";

interface AdminActionResult {
  ok: boolean;
  dataset?: ResettableSessionDataset | "all";
  message?: string;
}

function buildInfraError(): AdminActionResult {
  return {
    ok: false,
    message: "O Supabase Service Role ainda nao esta configurado."
  };
}

const datasetLabels: Record<ResettableSessionDataset, string> = {
  maps: "mapas",
  scenes: "cenas",
  atlas: "atlas",
  characters: "personagens",
  assets: "assets",
  audio: "audio",
  chat: "chat",
  effects: "efeitos"
};

export async function resetSessionDatasetAction(input: {
  sessionCode: string;
  dataset: ResettableSessionDataset;
  confirmationText: string;
}): Promise<AdminActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const expected = datasetLabels[input.dataset];

    if (input.confirmationText.trim().toLowerCase() !== expected) {
      throw new Error(`Digite "${expected}" para confirmar a limpeza.`);
    }

    await resetSessionDataset(session.id, input.dataset);

    return {
      ok: true,
      dataset: input.dataset,
      message: `Limpeza de ${expected} concluida.`
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao limpar o conjunto."
    };
  }
}

export async function resetSessionContentAction(input: {
  sessionCode: string;
  confirmationCode: string;
  confirmScope: boolean;
  confirmParticipants: boolean;
  confirmIrreversible: boolean;
}): Promise<AdminActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");

    if (
      !input.confirmScope ||
      !input.confirmParticipants ||
      !input.confirmIrreversible
    ) {
      throw new Error("Marque todas as confirmacoes antes de resetar a mesa.");
    }

    if (input.confirmationCode.trim().toUpperCase() !== session.code.toUpperCase()) {
      throw new Error("Digite o codigo da sessao para confirmar o reset total.");
    }

    await resetSessionContent(session.id);

    return {
      ok: true,
      dataset: "all",
      message: "Todo o conteudo operacional da mesa foi resetado."
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao resetar a mesa."
    };
  }
}
