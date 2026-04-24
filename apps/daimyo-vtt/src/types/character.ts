import type { SessionCharacterSheetProfile } from "@/types/combat";

export type CharacterType = "player" | "npc";
export type CharacterTier = "full" | "medium" | "summary";

export interface SessionCharacterRecord {
  id: string;
  sessionId: string;
  name: string;
  type: CharacterType;
  tier: CharacterTier;
  ownerParticipantId: string | null;
  assetId: string | null;
  hp: number;
  hpMax: number;
  fp: number;
  fpMax: number;
  initiative: number;
  sheetProfile: SessionCharacterSheetProfile | null;
  createdAt: string;
  updatedAt: string;
}
