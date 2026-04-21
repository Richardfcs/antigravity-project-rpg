import type { SessionAtlasMapRecord } from "@/types/atlas";
import type { SessionAudioTrackRecord } from "@/types/audio";
import type { SessionCharacterRecord } from "@/types/character";
import type { SessionMapRecord } from "@/types/map";
import type { SessionSceneRecord } from "@/types/scene";
import type {
  LibraryCollectionKey,
  LibraryEntryFlags,
  SessionLibrarySummary
} from "@/types/library";

type CollectionEntries = Partial<Record<LibraryCollectionKey, Record<string, LibraryEntryFlags>>>;

interface BuildSessionLibrarySummaryOptions {
  collections: CollectionEntries | undefined;
  scenes: SessionSceneRecord[];
  maps: SessionMapRecord[];
  atlasMaps: SessionAtlasMapRecord[];
  tracks: SessionAudioTrackRecord[];
  characters: SessionCharacterRecord[];
}

function collectMarkedEntries<T extends { id: string }>(
  collection: LibraryCollectionKey,
  items: T[],
  getLabel: (item: T) => string,
  entries: Record<string, LibraryEntryFlags> | undefined
) {
  return items
    .map((item) => {
      const flags = entries?.[item.id];
      if (!flags?.prepared && !flags?.favorite && !flags?.usedToday) {
        return null;
      }

      return {
        id: item.id,
        label: getLabel(item),
        collection,
        prepared: flags.prepared ?? false,
        favorite: flags.favorite ?? false,
        usedToday: flags.usedToday ?? false,
        lastTouchedAt: flags.lastTouchedAt ?? null
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);
}

export function buildSessionLibrarySummary({
  collections,
  scenes,
  maps,
  atlasMaps,
  tracks,
  characters
}: BuildSessionLibrarySummaryOptions): SessionLibrarySummary {
  const markedEntries = [
    ...collectMarkedEntries("scenes", scenes, (scene) => scene.name, collections?.scenes),
    ...collectMarkedEntries("maps", maps, (map) => map.name, collections?.maps),
    ...collectMarkedEntries("atlas", atlasMaps, (atlasMap) => atlasMap.name, collections?.atlas),
    ...collectMarkedEntries("audio", tracks, (track) => track.title, collections?.audio),
    ...collectMarkedEntries(
      "characters",
      characters,
      (character) => character.name,
      collections?.characters
    )
  ].sort((left, right) => {
    const leftTouchedAt = left.lastTouchedAt ? new Date(left.lastTouchedAt).getTime() : 0;
    const rightTouchedAt = right.lastTouchedAt
      ? new Date(right.lastTouchedAt).getTime()
      : 0;

    return rightTouchedAt - leftTouchedAt;
  });

  return {
    preparedCount: markedEntries.filter((entry) => entry.prepared).length,
    favoriteCount: markedEntries.filter((entry) => entry.favorite).length,
    usedTodayCount: markedEntries.filter((entry) => entry.usedToday).length,
    readyEntries: markedEntries.filter((entry) => entry.prepared).slice(0, 6),
    favoriteEntries: markedEntries.filter((entry) => entry.favorite).slice(0, 6)
  };
}
