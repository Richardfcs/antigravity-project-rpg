import type { OnlinePresence } from "@/types/presence";
import type { SessionShellSnapshot } from "@/types/session";

export const demoPresence: OnlinePresence[] = [
  {
    id: "gm-1",
    name: "Daimyo",
    role: "gm",
    status: "online",
    connectedAt: new Date().toISOString()
  },
  {
    id: "pc-1",
    name: "Akemi",
    role: "player",
    status: "online",
    connectedAt: new Date().toISOString(),
    hp: 11,
    fp: 9
  },
  {
    id: "pc-2",
    name: "Riku",
    role: "player",
    status: "online",
    connectedAt: new Date().toISOString(),
    hp: 13,
    fp: 10
  },
  {
    id: "pc-3",
    name: "Hana",
    role: "player",
    status: "idle",
    connectedAt: new Date().toISOString(),
    hp: 9,
    fp: 12
  }
];

export function buildDemoSession(
  code: string,
  role: "gm" | "player"
): SessionShellSnapshot {
  return {
    sessionId: `demo-${code.toLowerCase()}`,
    code: code.toUpperCase(),
    campaignName: "A Era das Espadas Quebradas",
    role,
    activeScene: "Portao Sul de Kamamura",
    activeSceneId: null,
    activeMapId: null,
    activeAtlasMapId: null,
    stageMode: "theater",
    presentationMode: "standard",
    combatEnabled: false,
    combatRound: 1,
    combatTurnIndex: 0,
    combatActiveTokenId: null,
    latencyLabel: "24ms",
    sceneMood: "chuva fina + lanternas frias",
    syncState: "booting"
  };
}
