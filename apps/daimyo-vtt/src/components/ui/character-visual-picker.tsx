"use client";

import { useMemo } from "react";

import {
  VisualPickerModal,
  type VisualPickerItem,
  type VisualPickerTab
} from "@/components/ui/visual-picker-modal";
import type { SessionAssetRecord } from "@/types/asset";
import type { SessionCharacterRecord } from "@/types/character";

interface CharacterVisualPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (characterId: string) => void;
  characters: SessionCharacterRecord[];
  assets: SessionAssetRecord[];
  excludeIds?: Set<string>;
}

const CHARACTER_TABS: VisualPickerTab[] = [
  { id: "player", label: "jogadores" },
  { id: "npc", label: "NPCs" }
];

export function CharacterVisualPicker({
  open,
  onClose,
  onSelect,
  characters,
  assets,
  excludeIds
}: CharacterVisualPickerProps) {
  const assetMap = useMemo(() => {
    const map = new Map<string, SessionAssetRecord>();
    for (const asset of assets) {
      map.set(asset.id, asset);
    }
    return map;
  }, [assets]);

  const items: VisualPickerItem[] = useMemo(() => {
    let filtered = characters;
    if (excludeIds?.size) {
      filtered = filtered.filter((character) => !excludeIds.has(character.id));
    }

    return filtered.map((character) => {
      const asset = character.assetId ? assetMap.get(character.assetId) : null;

      return {
        id: character.id,
        label: character.name,
        subtitle: character.type === "player" ? "jogador" : "NPC",
        imageUrl: asset?.secureUrl ?? null,
        tabId: character.type
      };
    });
  }, [assetMap, characters, excludeIds]);

  const handleSelect = (item: VisualPickerItem) => {
    onSelect(item.id);
    onClose();
  };

  return (
    <VisualPickerModal
      open={open}
      onClose={onClose}
      onSelect={handleSelect}
      items={items}
      tabs={CHARACTER_TABS}
      title="Selecionar Personagem"
      placeholder="buscar por nome..."
      emptyMessage="Nenhum personagem encontrado."
      cardAspect="portrait"
    />
  );
}
