"use client";

import { create } from "zustand";

import type { SessionAssetRecord } from "@/types/asset";

interface AssetState {
  assets: SessionAssetRecord[];
  setAssets: (assets: SessionAssetRecord[]) => void;
  upsertAsset: (asset: SessionAssetRecord) => void;
  removeAsset: (assetId: string) => void;
}

export const useAssetStore = create<AssetState>((set) => ({
  assets: [],
  setAssets: (assets) => set({ assets }),
  upsertAsset: (asset) =>
    set((state) => {
      const assets = state.assets.filter((item) => item.id !== asset.id);
      assets.unshift(asset);
      return { assets };
    }),
  removeAsset: (assetId) =>
    set((state) => ({
      assets: state.assets.filter((asset) => asset.id !== assetId)
    }))
}));
