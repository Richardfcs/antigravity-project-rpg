export type ContentCharacterRole = "player" | "npc";

export interface CharacterTemplate {
  id: string;
  name: string;
  role: ContentCharacterRole;
  portraitAssetId: string | null;
  stats: Record<string, unknown>;
  tags: string[];
}

export interface NpcTemplate {
  id: string;
  name: string;
  portraitAssetId: string | null;
  tags: string[];
  notes: Record<string, unknown>;
}

export interface CodexEntry {
  id: string;
  title: string;
  category: string;
  markdown: string;
  tags: string[];
}

export interface EquipmentEntry {
  id: string;
  name: string;
  category: string;
  stats: Record<string, unknown>;
  tags: string[];
}

export interface LocationEntry {
  id: string;
  name: string;
  imageAssetId: string | null;
  submapAssetId: string | null;
  characterIds: string[];
  tags: string[];
}

export interface DaimyoContentManifest {
  version: number;
  producer: "base" | "vtt";
  supportedExports: string[];
}

interface DaimyoContentBridgeContract {
  version: number;
  supportedExports: string[];
  defaultManifest: (producer: "base" | "vtt") => DaimyoContentManifest;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const rawContract = require("../../../../../shared/daimyo-content-bridge.js") as DaimyoContentBridgeContract;

export const daimyoContentBridge = rawContract;
