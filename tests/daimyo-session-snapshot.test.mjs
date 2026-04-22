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

test("createSessionSnapshotFilename normaliza o codigo da sessao", () => {
  assert.equal(
    createSessionSnapshotFilename("  ZXCV  "),
    "daimyo-snapshot-zxcv.json"
  );
  assert.equal(createSessionSnapshotFilename(""), "daimyo-snapshot-sessao.json");
});
