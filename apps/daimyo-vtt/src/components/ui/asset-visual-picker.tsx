"use client";

import { useMemo } from "react";

import {
  VisualPickerModal,
  type VisualPickerItem,
  type VisualPickerTab
} from "@/components/ui/visual-picker-modal";
import type { AssetKind, SessionAssetRecord } from "@/types/asset";

interface AssetVisualPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (assetId: string) => void;
  assets: SessionAssetRecord[];
  filterKinds?: AssetKind[];
  title?: string;
  placeholder?: string;
  cardAspect?: "square" | "portrait" | "landscape";
}

const ASSET_TABS: VisualPickerTab[] = [
  { id: "token", label: "tokens" },
  { id: "npc", label: "NPCs" },
  { id: "portrait", label: "retratos" },
  { id: "background", label: "cenários" },
  { id: "map", label: "mapas" }
];

export function AssetVisualPicker({
  open,
  onClose,
  onSelect,
  assets,
  filterKinds,
  title = "Selecionar Asset",
  placeholder = "buscar por nome ou tag...",
  cardAspect = "portrait"
}: AssetVisualPickerProps) {
  const items: VisualPickerItem[] = useMemo(() => {
    let filtered = assets;
    if (filterKinds?.length) {
      filtered = filtered.filter((asset) =>
        filterKinds.includes(asset.kind)
      );
    }

    return filtered.map((asset) => ({
      id: asset.id,
      label: asset.label,
      subtitle: asset.kind,
      imageUrl: asset.secureUrl,
      tabId: asset.kind
    }));
  }, [assets, filterKinds]);

  const relevantTabs = useMemo(() => {
    const kindSet = new Set(
      (filterKinds?.length ? assets.filter((a) => filterKinds.includes(a.kind)) : assets).map(
        (a) => a.kind
      )
    );
    return ASSET_TABS.filter((tab) => kindSet.has(tab.id as AssetKind));
  }, [assets, filterKinds]);

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
      tabs={relevantTabs.length > 1 ? relevantTabs : []}
      title={title}
      placeholder={placeholder}
      emptyMessage="Nenhum asset encontrado."
      cardAspect={cardAspect}
    />
  );
}
