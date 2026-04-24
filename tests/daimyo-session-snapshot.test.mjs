import test from "node:test";
import assert from "node:assert/strict";

import daimyoContentBridge from "../shared/daimyo-content-bridge.js";
import {
  createSessionSnapshotFilename,
  isSessionSnapshotPayload,
  normalizeSessionSnapshotPayload
} from "../shared/daimyo-session-snapshot.js";

function buildPayload(overrides = {}) {
  return {
    manifest: daimyoContentBridge.defaultManifest("vtt"),
    exportedAt: "2026-04-21T12:00:00.000Z",
    sessionCode: "ABCD",
    snapshot: {
      sessionId: "session-1",
      code: "ABCD",
      campaignName: "Mesa de teste",
      role: "gm",
      activeScene: "Ato inicial",
      activeSceneId: null,
      activeMapId: null,
      activeAtlasMapId: null,
      stageMode: "theater",
      presentationMode: "standard",
      combatEnabled: false,
      combatRound: 1,
      combatTurnIndex: 0,
      combatActiveTokenId: null,
      combatFlow: null,
      latencyLabel: "--",
      sceneMood: "aguardando preparacao",
      syncState: "connected"
    },
    assets: [],
    characters: [],
    scenes: [],
    sceneCast: [],
    maps: [],
    mapTokens: [],
    atlasMaps: [],
    atlasPins: [],
    atlasPinCharacters: [],
    tracks: [],
    playback: null,
    messages: [],
    effects: [],
    notes: [],
    memoryEvents: [],
    ...overrides
  };
}

test("normalizeSessionSnapshotPayload aceita um snapshot valido", () => {
  const payload = buildPayload();
  const normalized = normalizeSessionSnapshotPayload(payload);

  assert.equal(normalized.sessionCode, "ABCD");
  assert.equal(normalized.snapshot.stageMode, "theater");
  assert.deepEqual(normalized.assets, []);
  assert.deepEqual(normalized.memoryEvents, []);
});

test("normalizeSessionSnapshotPayload preserva combatFlow quando presente", () => {
  const payload = buildPayload({
    snapshot: {
      ...buildPayload().snapshot,
      combatFlow: {
        version: 1,
        phase: "awaiting-defense",
        activeAction: {
          actorTokenId: "token-1",
          targetTokenId: "token-2",
          actionType: "attack",
          weaponId: "katana",
          weaponModeId: "katana-slash",
          techniqueId: "corte-preciso",
          hitLocation: "torso",
          modifiers: {
            manual: 0,
            hitLocation: "torso"
          },
          selectedDefense: null,
          contestLabel: null
        },
        pendingPrompt: {
          eventId: "event-1",
          participantId: "participant-1",
          payload: {
            promptKind: "defense",
            sessionId: "session-1",
            actorTokenId: "token-1",
            targetTokenId: "token-2",
            actionType: "attack",
            options: ["dodge", "parry", "none"],
            summary: "O alvo pode tentar defesa ativa.",
            requestedAt: "2026-04-21T12:00:10.000Z",
            expiresAt: "2026-04-21T12:02:10.000Z"
          }
        },
        regularContest: null,
        lastResolution: null,
        log: [],
        updatedAt: "2026-04-21T12:00:10.000Z"
      }
    }
  });
  const normalized = normalizeSessionSnapshotPayload(payload);

  assert.equal(normalized.snapshot.combatFlow.phase, "awaiting-defense");
  assert.equal(normalized.snapshot.combatFlow.pendingPrompt.payload.promptKind, "defense");
});

test("isSessionSnapshotPayload rejeita manifesto invalido", () => {
  const invalidPayload = buildPayload({
    manifest: {
      version: 999,
      producer: "vtt",
      supportedExports: ["session-snapshot"]
    }
  });

  assert.equal(isSessionSnapshotPayload(invalidPayload), false);
});

test("isSessionSnapshotPayload rejeita combatFlow invalido", () => {
  const invalidPayload = buildPayload({
    snapshot: {
      ...buildPayload().snapshot,
      combatFlow: "estado-invalido"
    }
  });

  assert.equal(isSessionSnapshotPayload(invalidPayload), false);
});

test("createSessionSnapshotFilename normaliza o codigo da sessao", () => {
  assert.equal(
    createSessionSnapshotFilename("  ZXCV  "),
    "daimyo-snapshot-zxcv.json"
  );
  assert.equal(createSessionSnapshotFilename(""), "daimyo-snapshot-sessao.json");
});
