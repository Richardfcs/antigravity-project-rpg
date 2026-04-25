const daimyoContentBridge = require("./daimyo-content-bridge.js");

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value, field) {
  if (typeof value !== "string") {
    throw new Error(`Campo invalido no snapshot: ${field}.`);
  }

  return value;
}

function asBoolean(value, field) {
  if (typeof value !== "boolean") {
    throw new Error(`Campo invalido no snapshot: ${field}.`);
  }

  return value;
}

function asNullableString(value, field) {
  if (value === null || value === undefined) {
    return null;
  }

  return asString(value, field);
}

function asNumber(value, field) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Campo invalido no snapshot: ${field}.`);
  }

  return value;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeManifest(rawManifest) {
  if (!isObject(rawManifest)) {
    throw new Error("Manifesto do snapshot invalido.");
  }

  const producer = rawManifest.producer === "base" ? "base" : "vtt";
  const supportedExports = asArray(rawManifest.supportedExports).filter(
    (entry) => typeof entry === "string"
  );

  return {
    version: asNumber(rawManifest.version, "manifest.version"),
    producer,
    supportedExports
  };
}

function normalizeSnapshot(rawSnapshot) {
  if (!isObject(rawSnapshot)) {
    throw new Error("Fotografia da sessao invalida.");
  }

  if (
    rawSnapshot.combatFlow !== undefined &&
    rawSnapshot.combatFlow !== null &&
    !isObject(rawSnapshot.combatFlow)
  ) {
    throw new Error("Campo invalido no snapshot: snapshot.combatFlow.");
  }

  return {
    sessionId: asString(rawSnapshot.sessionId, "snapshot.sessionId"),
    code: asString(rawSnapshot.code, "snapshot.code"),
    campaignName: asString(rawSnapshot.campaignName, "snapshot.campaignName"),
    role: rawSnapshot.role === "gm" ? "gm" : "player",
    activeScene: asString(rawSnapshot.activeScene, "snapshot.activeScene"),
    activeSceneId: asNullableString(rawSnapshot.activeSceneId, "snapshot.activeSceneId"),
    activeMapId: asNullableString(rawSnapshot.activeMapId, "snapshot.activeMapId"),
    activeAtlasMapId: asNullableString(
      rawSnapshot.activeAtlasMapId,
      "snapshot.activeAtlasMapId"
    ),
    stageMode: ["theater", "tactical", "atlas"].includes(rawSnapshot.stageMode)
      ? rawSnapshot.stageMode
      : "theater",
    presentationMode: ["standard", "immersive"].includes(rawSnapshot.presentationMode)
      ? rawSnapshot.presentationMode
      : "standard",
    combatEnabled: asBoolean(rawSnapshot.combatEnabled, "snapshot.combatEnabled"),
    combatRound: asNumber(rawSnapshot.combatRound, "snapshot.combatRound"),
    combatTurnIndex: asNumber(rawSnapshot.combatTurnIndex, "snapshot.combatTurnIndex"),
    combatActiveTokenId: asNullableString(
      rawSnapshot.combatActiveTokenId,
      "snapshot.combatActiveTokenId"
    ),
    combatFlow:
      rawSnapshot.combatFlow === undefined || rawSnapshot.combatFlow === null
        ? null
        : rawSnapshot.combatFlow,
    latencyLabel:
      typeof rawSnapshot.latencyLabel === "string" ? rawSnapshot.latencyLabel : "--",
    sceneMood:
      typeof rawSnapshot.sceneMood === "string"
        ? rawSnapshot.sceneMood
        : "aguardando preparacao",
    syncState: ["idle", "booting", "connected", "degraded"].includes(rawSnapshot.syncState)
      ? rawSnapshot.syncState
      : "booting"
  };
}

function normalizeSessionSnapshotPayload(rawPayload) {
  if (!isObject(rawPayload)) {
    throw new Error("Snapshot invalido. O arquivo nao contem um objeto JSON.");
  }

  const manifest = normalizeManifest(rawPayload.manifest);

  if (
    manifest.version !== daimyoContentBridge.version ||
    !manifest.supportedExports.includes("session-snapshot")
  ) {
    throw new Error("Manifesto do snapshot nao e compativel com esta mesa.");
  }

  return {
    manifest,
    exportedAt: asString(rawPayload.exportedAt, "exportedAt"),
    sessionCode: asString(rawPayload.sessionCode, "sessionCode"),
    snapshot: normalizeSnapshot(rawPayload.snapshot),
    assets: asArray(rawPayload.assets),
    characters: asArray(rawPayload.characters),
    scenes: asArray(rawPayload.scenes),
    sceneCast: asArray(rawPayload.sceneCast),
    maps: asArray(rawPayload.maps),
    mapTokens: asArray(rawPayload.mapTokens),
    atlasMaps: asArray(rawPayload.atlasMaps),
    atlasPins: asArray(rawPayload.atlasPins),
    atlasPinCharacters: asArray(rawPayload.atlasPinCharacters),
    tracks: asArray(rawPayload.tracks),
    playback: isObject(rawPayload.playback) ? rawPayload.playback : null,
    messages: asArray(rawPayload.messages),
    effects: asArray(rawPayload.effects),
    notes: asArray(rawPayload.notes),
    memoryEvents: asArray(rawPayload.memoryEvents)
  };
}

function isSessionSnapshotPayload(rawPayload) {
  try {
    normalizeSessionSnapshotPayload(rawPayload);
    return true;
  } catch {
    return false;
  }
}

function createSessionSnapshotFilename(sessionCode) {
  const normalizedCode =
    typeof sessionCode === "string" && sessionCode.trim().length > 0
      ? sessionCode.trim().toLowerCase()
      : "sessao";

  return `daimyo-snapshot-${normalizedCode}.json`;
}

module.exports = {
  createSessionSnapshotFilename,
  isSessionSnapshotPayload,
  normalizeSessionSnapshotPayload
};
