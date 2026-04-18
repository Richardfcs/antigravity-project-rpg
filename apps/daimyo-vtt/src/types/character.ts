export type CharacterType = "player" | "npc";

export interface SessionCharacterRecord {
  id: string;
  sessionId: string;
  name: string;
  type: CharacterType;
  ownerParticipantId: string | null;
  assetId: string | null;
  hp: number;
  hpMax: number;
  fp: number;
  fpMax: number;
  initiative: number;
  createdAt: string;
  updatedAt: string;
}
