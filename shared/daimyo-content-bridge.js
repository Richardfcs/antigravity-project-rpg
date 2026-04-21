/**
 * Contrato compartilhado entre a oficina offline do projeto base e o Daimyo VTT.
 * A intencao e alinhar formatos de importacao/exportacao sem fundir os runtimes.
 */

/** @typedef {"player" | "npc"} ContentCharacterRole */

/**
 * @typedef {Object} CharacterTemplate
 * @property {string} id
 * @property {string} name
 * @property {ContentCharacterRole} role
 * @property {string | null} portraitAssetId
 * @property {Record<string, unknown>} stats
 * @property {string[]} tags
 */

/**
 * @typedef {Object} NpcTemplate
 * @property {string} id
 * @property {string} name
 * @property {string | null} portraitAssetId
 * @property {string[]} tags
 * @property {Record<string, unknown>} notes
 */

/**
 * @typedef {Object} CodexEntry
 * @property {string} id
 * @property {string} title
 * @property {string} category
 * @property {string} markdown
 * @property {string[]} tags
 */

/**
 * @typedef {Object} EquipmentEntry
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {Record<string, unknown>} stats
 * @property {string[]} tags
 */

/**
 * @typedef {Object} LocationEntry
 * @property {string} id
 * @property {string} name
 * @property {string | null} imageAssetId
 * @property {string | null} submapAssetId
 * @property {string[]} characterIds
 * @property {string[]} tags
 */

/**
 * @typedef {Object} DaimyoContentManifest
 * @property {number} version
 * @property {"base" | "vtt"} producer
 * @property {string[]} supportedExports
 */

const daimyoContentBridge = {
  version: 1,
  supportedExports: [
    "character-template",
    "npc-template",
    "codex-entry",
    "equipment-entry",
    "location-entry",
    "session-snapshot"
  ],
  defaultManifest(producer) {
    return {
      version: this.version,
      producer,
      supportedExports: [...this.supportedExports]
    };
  }
};

module.exports = daimyoContentBridge;
