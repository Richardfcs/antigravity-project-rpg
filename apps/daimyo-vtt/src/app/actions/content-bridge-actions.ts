"use server";

import { createSessionCharacter } from "@/lib/characters/repository";
import { getInfraReadiness } from "@/lib/env";
import {
  findBaseArchetypeById,
  loadBaseCatalog
} from "@/lib/content-bridge/base-loader";
import { requireSessionViewer } from "@/lib/session/access";
import { findParticipantById } from "@/lib/session/repository";
import { findSessionAssetById } from "@/lib/assets/repository";
import type {
  CharacterTemplate,
  CodexEntry,
  DaimyoContentManifest,
  EquipmentEntry
} from "@/lib/content-bridge/contract";
import type { CharacterType, SessionCharacterRecord } from "@/types/character";

interface BaseCatalogActionResult {
  ok: boolean;
  manifest?: DaimyoContentManifest;
  archetypes?: CharacterTemplate[];
  codexEntries?: CodexEntry[];
  codexCategories?: Array<{
    id: string;
    name: string;
    icon?: string;
    tags?: string[];
    order?: number;
  }>;
  equipmentEntries?: EquipmentEntry[];
  message?: string;
}

interface ImportBaseArchetypeInput {
  sessionCode: string;
  archetypeId: string;
  type: CharacterType;
  ownerParticipantId?: string | null;
  assetId?: string | null;
}

interface ImportBaseArchetypeResult {
  ok: boolean;
  character?: SessionCharacterRecord;
  message?: string;
}

export async function loadBaseCatalogAction(): Promise<BaseCatalogActionResult> {
  try {
    const catalog = await loadBaseCatalog();

    return {
      ok: true,
      manifest: catalog.manifest,
      archetypes: catalog.archetypes,
      codexEntries: catalog.codexEntries,
      codexCategories: catalog.codexCategories,
      equipmentEntries: catalog.equipmentEntries
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Falha ao carregar o conteudo da oficina base."
    };
  }
}

export async function importBaseArchetypeAction(
  input: ImportBaseArchetypeInput
): Promise<ImportBaseArchetypeResult> {
  if (!getInfraReadiness().serviceRole) {
    return {
      ok: false,
      message: "O Supabase Service Role ainda nao esta configurado."
    };
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const archetype = await findBaseArchetypeById(input.archetypeId);

    if (!archetype) {
      throw new Error("Arquétipo da oficina não encontrado.");
    }

    const ownerParticipantId =
      input.type === "player" ? (input.ownerParticipantId ?? null) : null;

    if (ownerParticipantId) {
      const participant = await findParticipantById(ownerParticipantId);

      if (!participant || participant.sessionId !== session.id) {
        throw new Error("O jogador selecionado nao pertence a esta sessao.");
      }
    }

    if (input.assetId) {
      const asset = await findSessionAssetById(input.assetId);

      if (!asset || asset.sessionId !== session.id) {
        throw new Error("O recurso selecionado nao pertence a esta sessao.");
      }
    }

    const attributes = (archetype.stats.attributes ?? {}) as Record<string, unknown>;
    const hpMax = Number(attributes.hp ?? 10);
    const fpMax = Number(attributes.fp ?? 10);

    const character = await createSessionCharacter({
      sessionId: session.id,
      name: archetype.name,
      type: input.type,
      ownerParticipantId,
      assetId: input.assetId ?? null,
      hpMax: Number.isFinite(hpMax) ? hpMax : 10,
      fpMax: Number.isFinite(fpMax) ? fpMax : 10,
      initiative: 0
    });

    return { ok: true, character };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Falha ao importar o arquétipo da oficina."
    };
  }
}
