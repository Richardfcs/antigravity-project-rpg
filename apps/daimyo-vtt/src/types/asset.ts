export type AssetKind =
  | "background"
  | "token"
  | "npc"
  | "portrait"
  | "map"
  | "grid"
  | "ambient";

export interface SessionAssetRecord {
  id: string;
  sessionId: string;
  ownerParticipantId: string | null;
  kind: AssetKind;
  label: string;
  publicId: string;
  secureUrl: string;
  width: number | null;
  height: number | null;
  tags: string[];
  createdAt: string;
}

export type CloudinaryAssetRecord = SessionAssetRecord;
